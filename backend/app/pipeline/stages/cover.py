import logging
import subprocess
from pathlib import Path

from app.pipeline.stages._util import register_file, require_file

logger = logging.getLogger(__name__)


def run(ctx) -> None:
    final = require_file(ctx, "final", "NO_FINAL_VIDEO", "缺少成片")

    # 使用 FFmpeg 提取 3 帧作为封面
    # 1. 开头帧（0 秒）
    # 2. 1/3 处帧
    # 3. 2/3 处帧
    try:
        _extract_frames(final, ctx.task_dir)
    except Exception as e:
        logger.warning(f"FFmpeg 提取封面失败，使用 Mock: {e}")
        # 回退到 Mock
        for i in range(3):
            cover = ctx.task_dir / f"cover_{i}.jpg"
            cover.write_bytes(b"MOCK-COVER")
            register_file(ctx, cover, "cover", "GENERATING_COVER")
        return

    for i in range(3):
        cover = ctx.task_dir / f"cover_{i}.jpg"
        if cover.exists():
            register_file(ctx, cover, "cover", "GENERATING_COVER")


def _extract_frames(video_path: Path, dest_dir: Path) -> None:
    """使用 FFmpeg 从视频中提取 3 帧"""
    from static_ffmpeg import add_paths

    if not add_paths():  # 下载（如需要）并将 ffmpeg/ffprobe 加入 PATH
        raise RuntimeError("static_ffmpeg 初始化失败（无法获取 FFmpeg）")

    ffmpeg_path = "ffmpeg"
    ffprobe_path = "ffprobe"

    # 获取视频时长
    probe_cmd = [
        ffprobe_path,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    result = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
    duration = float(result.stdout.strip())

    # 提取 3 帧：0%, 33%, 66%
    timestamps = [0, duration * 0.33, duration * 0.66]

    for i, ts in enumerate(timestamps):
        output = dest_dir / f"cover_{i}.jpg"
        cmd = [
            ffmpeg_path,
            "-y",
            "-ss", str(ts),
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",  # 高质量 JPEG
            str(output),
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        logger.info(f"提取封面帧 {i+1}/3: {output}")
