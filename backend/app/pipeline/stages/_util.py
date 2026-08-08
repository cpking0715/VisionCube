import os
from pathlib import Path

from app.models.video_file import VideoFile


def register_file(ctx, path: Path, kind: str, stage: str) -> VideoFile:
    """原子登记：临时文件改名后入库（阶段 1 Mock 直接写终态名，仍走此入口）。"""
    vf = VideoFile(
        user_id=ctx.task.user_id, task_id=ctx.task.id, kind=kind, stage=stage,
        path=str(path), size_bytes=os.path.getsize(path) if path.exists() else None,
    )
    ctx.db.add(vf)
    ctx.db.flush()
    return vf


def latest_file(ctx, kind: str) -> Path | None:
    vf = (ctx.db.query(VideoFile)
          .filter_by(task_id=ctx.task.id, kind=kind)
          .order_by(VideoFile.id.desc()).first())
    return Path(vf.path) if vf else None
