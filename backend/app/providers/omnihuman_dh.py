"""火山引擎 OmniHuman1.5 数字人 Provider

基于即梦同源数字人模型，根据单张图片 + 音频生成视频。
文档：https://www.volcengine.com/docs/85621/1829013
"""
import datetime
import hashlib
import hmac
import json
import logging
import time
from pathlib import Path

import httpx

from app.core.config import settings
from app.providers.base import AvatarJob, DigitalHumanProvider

logger = logging.getLogger(__name__)

# API 配置
_HOST = "visual.volcengineapi.com"
_ENDPOINT = "https://visual.volcengineapi.com"
_REGION = "cn-north-1"
_SERVICE = "cv"
_REQ_KEY = "jimeng_realman_avatar_picture_omni_v15"

# 提交任务重试：火山账号有并发任务数限制（429/50430），且偶发 5xx 网关抖动
# 指数退避重试，最长约 12.5 分钟（30+60+120+240+300）
_SUBMIT_RETRY_DELAYS = [30, 60, 120, 240, 300]


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _get_signature_key(secret_key: str, date_stamp: str, region_name: str, service_name: str) -> bytes:
    k_date = _sign(secret_key.encode("utf-8"), date_stamp)
    k_region = _sign(k_date, region_name)
    k_service = _sign(k_region, service_name)
    k_signing = _sign(k_service, "request")
    return k_signing


def _format_query(params: dict) -> str:
    return "&".join(f"{k}={params[k]}" for k in sorted(params))


def _sign_v4_request(
    access_key: str,
    secret_key: str,
    action: str,
    body: dict,
) -> dict:
    """
    火山引擎 V4 签名请求

    Args:
        access_key: Access Key ID
        secret_key: Secret Access Key
        action: API Action (CVSubmitTask / CVGetResult)
        body: 请求体

    Returns:
        dict: 响应 JSON
    """
    method = "POST"
    content_type = "application/json"
    req_body = json.dumps(body)

    # 时间戳
    t = datetime.datetime.utcnow()
    current_date = t.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = t.strftime("%Y%m%d")

    # Query 参数
    query_params = {"Action": action, "Version": "2022-08-31"}
    canonical_querystring = _format_query(query_params)

    # 请求头
    payload_hash = hashlib.sha256(req_body.encode("utf-8")).hexdigest()
    signed_headers = "content-type;host;x-content-sha256;x-date"
    canonical_headers = (
        f"content-type:{content_type}\n"
        f"host:{_HOST}\n"
        f"x-content-sha256:{payload_hash}\n"
        f"x-date:{current_date}\n"
    )

    # Canonical Request
    canonical_request = (
        f"{method}\n"
        f"/\n"
        f"{canonical_querystring}\n"
        f"{canonical_headers}\n"
        f"{signed_headers}\n"
        f"{payload_hash}"
    )

    # String to Sign
    algorithm = "HMAC-SHA256"
    credential_scope = f"{date_stamp}/{_REGION}/{_SERVICE}/request"
    string_to_sign = (
        f"{algorithm}\n"
        f"{current_date}\n"
        f"{credential_scope}\n"
        f"{hashlib.sha256(canonical_request.encode()).hexdigest()}"
    )

    # 签名
    signing_key = _get_signature_key(secret_key, date_stamp, _REGION, _SERVICE)
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    authorization = (
        f"{algorithm} Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    headers = {
        "X-Date": current_date,
        "Authorization": authorization,
        "X-Content-Sha256": payload_hash,
        "Content-Type": content_type,
    }

    url = f"{_ENDPOINT}?{canonical_querystring}"

    with httpx.Client(timeout=60.0) as client:
        response = client.post(url, headers=headers, content=req_body)
        response.raise_for_status()
        return response.json()


class OmniHumanDigitalHuman(DigitalHumanProvider):
    """火山引擎 OmniHuman1.5 数字人"""

    def __init__(self):
        self.access_key = settings.dh_api_key
        self.secret_key = settings.dh_api_secret
        self.avatar_url = settings.dh_avatar_url or settings.dh_avatar_id
        self.prompt = settings.dh_prompt or ""

    def submit(
        self,
        audio_path: Path,
        avatar_id: str | None,
        background: Path | None = None,
    ) -> AvatarJob:
        """
        提交数字人视频生成任务

        Args:
            audio_path: 音频文件路径（本地）
            avatar_id: 人物图片 URL（可选，覆盖默认）
            background: 背景图片（暂未使用）

        Returns:
            AvatarJob: 任务信息
        """
        # 获取人物图片 URL
        image_url = avatar_id or self.avatar_url
        if not image_url:
            raise ValueError("未配置默认人物图片 URL (dh_avatar_url)")

        # 音频需要公网可访问的 URL
        # 如果有 public_base_url，构造本地文件的公网 URL
        audio_url = self._get_public_url(audio_path)

        # 提交任务
        body = {
            "req_key": _REQ_KEY,
            "image_url": image_url,
            "mask_url": [],  # 不指定主体，使用整图
            "audio_url": audio_url,
            "prompt": self.prompt,
        }

        logger.info(f"提交 OmniHuman 任务: image={image_url}, audio={audio_url}")

        last_exc: Exception | None = None
        for attempt, delay in enumerate([0] + _SUBMIT_RETRY_DELAYS):
            try:
                resp = _sign_v4_request(self.access_key, self.secret_key, "CVSubmitTask", body)
                # 业务错误（非 10000）说明请求本身有问题，不重试
                if resp.get("code") != 10000:
                    raise RuntimeError(f"提交任务失败: {resp}")
                task_id = resp["data"]["task_id"]
                logger.info(f"任务已提交: task_id={task_id}")
                return AvatarJob(job_id=task_id, finished=False)
            except (httpx.HTTPStatusError, httpx.TransportError) as exc:
                # 429（并发限制）/ 5xx（网关抖动）/ 网络错误 才重试
                status = getattr(exc, "response", None)
                status_code = status.status_code if status is not None else 0
                if status_code not in (429,) and status_code < 500:
                    raise
                last_exc = exc
                logger.warning(
                    "提交 OmniHuman 任务失败（HTTP %s），%d 秒后重试（第 %d 次）",
                    status_code, delay, attempt + 1,
                )
                if delay:
                    time.sleep(delay)
        assert last_exc is not None
        raise last_exc

    def poll(self, job: AvatarJob, dest_dir: Path) -> AvatarJob:
        """
        轮询任务状态

        Args:
            job: 任务信息
            dest_dir: 输出目录

        Returns:
            AvatarJob: 更新后的任务信息（finished=True 时包含 video_path）
        """
        body = {
            "req_key": _REQ_KEY,
            "task_id": job.job_id,
        }

        last_exc: Exception | None = None
        for attempt, delay in enumerate([0, 10, 20]):
            try:
                resp = _sign_v4_request(self.access_key, self.secret_key, "CVGetResult", body)
                break
            except (httpx.HTTPStatusError, httpx.TransportError) as exc:
                status = getattr(exc, "response", None)
                status_code = status.status_code if status is not None else 0
                if status_code not in (429,) and status_code < 500:
                    raise
                last_exc = exc
                logger.warning("查询任务状态失败（HTTP %s），%d 秒后重试", status_code, delay)
                if delay:
                    time.sleep(delay)
        else:
            assert last_exc is not None
            raise last_exc

        if resp.get("code") != 10000:
            raise RuntimeError(f"查询任务失败: {resp}")

        status = resp["data"].get("status")

        if status == "done":
            # 下载视频
            video_url = resp["data"]["video_url"]
            dest_dir.mkdir(parents=True, exist_ok=True)
            video_path = dest_dir / "avatar.mp4"

            logger.info(f"任务完成，下载视频: {video_url}")

            with httpx.Client(timeout=120.0) as client:
                with client.stream("GET", video_url) as response:
                    response.raise_for_status()
                    with open(video_path, "wb") as f:
                        for chunk in response.iter_bytes():
                            f.write(chunk)

            logger.info(f"视频已保存: {video_path}")
            return AvatarJob(job_id=job.job_id, finished=True, video_path=video_path)

        elif status in ("failed", "expired"):
            raise RuntimeError(f"任务失败: status={status}, resp={resp}")

        # 仍在进行中
        return AvatarJob(job_id=job.job_id, finished=False)

    def _get_public_url(self, local_path: Path) -> str:
        """
        获取本地文件的公网可访问 URL

        策略：
        1. 如果配置了 public_base_url，构造 URL（指向 /api/files/public/{user_id}/{task_id}/{filename}）
        2. 否则抛出异常

        Args:
            local_path: 本地文件路径

        Returns:
            str: 公网 URL
        """
        if not settings.public_base_url:
            raise ValueError(
                "未配置 PUBLIC_BASE_URL，无法生成公网可访问的音频 URL。\n"
                "请在 .env 中设置 PUBLIC_BASE_URL=http://your-public-ip:8000"
            )

        # 从路径中提取 user_id、task_id 和 filename
        # 路径格式: {data_root}/{user_id}/{task_id}/{filename}
        parts = local_path.parts
        if len(parts) >= 3:
            user_id = parts[-3]
            task_id = parts[-2]
            filename = parts[-1]
        else:
            raise ValueError(f"无法解析文件路径: {local_path}")

        base = settings.public_base_url.rstrip("/")
        return f"{base}/api/files/public/{user_id}/{task_id}/{filename}"
