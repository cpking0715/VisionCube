"""DashScope ASR Provider（阿里云百炼语音识别）

异步 API：提交任务 → 轮询结果
文档：https://help.aliyun.com/zh/model-studio/developer-reference/qwen-audio-asr-api
"""
import asyncio
import json
import logging
from pathlib import Path

import httpx

from app.core.config import settings
from app.providers.base import AsrProvider, Sentence

logger = logging.getLogger(__name__)


class DashScopeAsr(AsrProvider):
    """DashScope 异步语音识别"""

    def __init__(self):
        self.api_key = settings.asr_api_key
        self.base_url = settings.asr_base_url.rstrip("/")
        self.model = settings.asr_model
        self.client = httpx.AsyncClient(timeout=60.0)

    async def transcribe(self, audio_path: Path) -> list[Sentence]:
        """
        转录音频文件为带时间戳的文本

        流程：
        1. 上传音频文件获取临时 URL
        2. 提交异步转录任务
        3. 轮询任务状态直到完成
        4. 解析结果返回 Sentence 列表
        """
        if not audio_path.exists():
            raise FileNotFoundError(f"音频文件不存在: {audio_path}")

        # Step 1: 获取音频的公网可访问 URL（DashScope filetrans 要求公网 URL）
        file_url = self._get_public_url(audio_path)
        logger.info(f"音频公网 URL: {file_url}")

        # Step 2: 提交转录任务
        task_id = await self._submit_task(file_url)
        logger.info(f"转录任务已提交，task_id: {task_id}")

        # Step 3: 轮询任务状态
        result = await self._poll_task(task_id)
        logger.info(f"转录任务完成")

        # Step 4: 解析结果
        return await self._parse_result(result)

    def _get_public_url(self, local_path: Path) -> str:
        """
        构造本地音频文件的公网可访问 URL

        DashScope 的 Qwen-Audio-ASR filetrans 接口要求 file_urls 为公网
        可访问的 URL（不支持本地上传），因此复用 PUBLIC_BASE_URL +
        /files/public/{user_id}/{task_id}/{filename} 端点暴露本地文件。

        Args:
            local_path: 本地文件路径（data_root/{user_id}/{task_id}/{filename}）

        Returns:
            str: 公网 URL
        """
        if not settings.public_base_url:
            raise ValueError(
                "未配置 PUBLIC_BASE_URL，无法生成公网可访问的音频 URL。\n"
                "请在 .env 中设置 PUBLIC_BASE_URL=http://your-public-ip:8000"
            )

        parts = local_path.parts
        if len(parts) < 3:
            raise ValueError(f"无法解析文件路径: {local_path}")

        user_id = parts[-3]
        task_id = parts[-2]
        filename = parts[-1]
        base = settings.public_base_url.rstrip("/")
        return f"{base}/api/files/public/{user_id}/{task_id}/{filename}"

    async def _submit_task(self, file_url: str) -> str:
        """提交异步转录任务"""
        url = f"{self.base_url}/services/audio/asr/transcription"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable",
        }
        payload = {
            "model": self.model,
            "input": {
                "file_urls": [file_url]
            },
            "parameters": {
                "channel_id": [0]
            }
        }

        response = await self.client.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise RuntimeError(f"提交转录任务失败: {response.status_code} {response.text}")
        
        result = response.json()
        task_id = result.get("output", {}).get("task_id")
        if not task_id:
            raise RuntimeError(f"未返回 task_id: {result}")
        
        return task_id

    async def _poll_task(self, task_id: str, max_wait: int = 300) -> dict:
        """
        轮询任务状态直到完成
        
        max_wait: 最大等待时间（秒）
        """
        url = f"{self.base_url}/tasks/{task_id}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        
        elapsed = 0
        poll_interval = 2  # 每 2 秒轮询一次
        
        while elapsed < max_wait:
            response = await self.client.get(url, headers=headers)
            
            if response.status_code != 200:
                raise RuntimeError(f"查询任务状态失败: {response.status_code} {response.text}")
            
            result = response.json()
            status = result.get("output", {}).get("task_status")
            
            if status == "SUCCEEDED":
                return result
            elif status in ("FAILED", "CANCELED"):
                raise RuntimeError(f"转录任务失败: {result}")
            elif status in ("PENDING", "RUNNING"):
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval
            else:
                logger.warning(f"未知任务状态: {status}")
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval
        
        raise TimeoutError(f"转录任务超时（等待 {max_wait} 秒）")

    async def _parse_result(self, result: dict) -> list[Sentence]:
        """
        解析转录结果
        
        返回格式：
        {
          "output": {
            "results": [{
              "transcription_url": "https://..."
            }]
          }
        }
        
        transcription_url 指向的 JSON 文件包含详细的转录结果
        """
        results = result.get("output", {}).get("results", [])
        if not results:
            raise RuntimeError(f"转录结果为空: {result}")
        
        transcription_url = results[0].get("transcription_url")
        if not transcription_url:
            raise RuntimeError(f"未返回 transcription_url: {results[0]}")
        
        # 异步下载转录结果 JSON
        response = await self.client.get(transcription_url)
        if response.status_code != 200:
            raise RuntimeError(f"下载转录结果失败: {response.status_code}")
        
        transcription = response.json()
        
        # 解析 transcripts 数组（Qwen-Audio-ASR filetrans 格式）
        # 格式：{"transcripts": [{"sentences": [{"begin_time": 0, "end_time": 3200, "text": "..."}]}]}
        transcripts = transcription.get("transcripts", [])
        if not transcripts:
            logger.warning("转录结果中无 transcripts: %s", str(transcription)[:500])
            return []
        sentences_data = transcripts[0].get("sentences", [])
        
        sentences = []
        for s in sentences_data:
            begin_time = s.get("begin_time", 0) / 1000.0  # 毫秒转秒
            end_time = s.get("end_time", 0) / 1000.0
            text = s.get("text", "")
            
            if text.strip():
                sentences.append(Sentence(
                    text=text.strip(),
                    start=begin_time,
                    end=end_time,
                ))
        
        logger.info(f"转录完成，共 {len(sentences)} 句")
        return sentences

    async def close(self):
        """关闭 HTTP 客户端"""
        await self.client.aclose()
