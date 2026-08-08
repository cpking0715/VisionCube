from pathlib import Path

from app.models.asset import Asset
from app.pipeline.stages._util import latest_file, register_file


def run(ctx) -> None:
    audio = latest_file(ctx, "audio")
    background = None  # v1.2：背景素材可选（平台场景/自建库/检索缓存）；
    # v1.3：scene_config 多段分镜与分段生成随阶段 3 接入
    if ctx.task.background_asset_id:
        asset = ctx.db.get(Asset, ctx.task.background_asset_id)
        background = Path(asset.path) if asset and asset.path else None
    job = ctx.bundle.digital_human.submit(audio, ctx.task.avatar_id, background)
    # Mock 下一次 poll 即完成；真实实现由 worker 延时轮询
    job = ctx.bundle.digital_human.poll(job, ctx.task_dir)
    if not job.finished or job.video_path is None:
        raise RuntimeError("avatar job not finished")  # runner 捕获转可恢复错误
    register_file(ctx, job.video_path, "avatar_video", "GENERATING_AVATAR")
