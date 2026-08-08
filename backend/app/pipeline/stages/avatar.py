from pathlib import Path

from app.core.exceptions import RecoverablePipelineError
from app.models.asset import Asset
from app.pipeline.stages._util import register_file, require_file


def run(ctx) -> None:
    audio = require_file(ctx, "audio", "NO_AUDIO", "缺少配音")
    background = None  # v1.2：背景素材可选（平台场景/自建库/检索缓存）；
    # v1.3：scene_config 多段分镜与分段生成随阶段 3 接入
    if ctx.task.background_asset_id:
        asset = ctx.db.get(Asset, ctx.task.background_asset_id)
        background = Path(asset.path) if asset and asset.path else None
    job = ctx.bundle.digital_human.submit(audio, ctx.task.avatar_id, background)
    # Mock 下一次 poll 即完成；真实实现由 worker 延时轮询
    job = ctx.bundle.digital_human.poll(job, ctx.task_dir)
    if not job.finished or job.video_path is None:
        raise RecoverablePipelineError("AVATAR_JOB_FAILED", "数字人任务未完成")
    register_file(ctx, job.video_path, "avatar_video", "GENERATING_AVATAR")
