import logging
import time
from pathlib import Path

from app.core.exceptions import RecoverablePipelineError
from app.models.asset import Asset
from app.pipeline.stages._util import register_file, require_file

logger = logging.getLogger(__name__)


def run(ctx) -> None:
    audio = require_file(ctx, "audio", "NO_AUDIO", "缺少配音")
    background = None  # v1.2：背景素材可选（平台场景/自建库/检索缓存）；
    # v1.3：scene_config 多段分镜与分段生成随阶段 3 接入
    if ctx.task.background_asset_id:
        asset = ctx.db.get(Asset, ctx.task.background_asset_id)
        background = Path(asset.path) if asset and asset.path else None
    job = ctx.bundle.digital_human.submit(audio, ctx.task.avatar_id, background)

    # 轮询等待任务完成（真实 API 需要时间生成）
    max_wait = 600  # 最多等待 10 分钟
    poll_interval = 5  # 每 5 秒轮询一次
    elapsed = 0

    while elapsed < max_wait:
        job = ctx.bundle.digital_human.poll(job, ctx.task_dir)
        if job.finished:
            break
        logger.info(f"数字人任务进行中，已等待 {elapsed} 秒...")
        time.sleep(poll_interval)
        elapsed += poll_interval

    if not job.finished or job.video_path is None:
        raise RecoverablePipelineError("AVATAR_JOB_FAILED", f"数字人任务超时（{max_wait} 秒）")
    register_file(ctx, job.video_path, "avatar_video", "GENERATING_AVATAR")
