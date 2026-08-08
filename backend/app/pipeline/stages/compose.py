import shutil

from app.pipeline.stages._util import register_file, require_file


def run(ctx) -> None:
    avatar_video = require_file(ctx, "avatar_video", "NO_AVATAR_VIDEO", "缺少数字人视频")
    final = ctx.task_dir / "final.mp4"
    shutil.copyfile(avatar_video, final)
    register_file(ctx, final, "final", "COMPOSING")
    # 阶段 3 接入 FFmpeg：多段口播拼接（scene_config）+ ASS 字幕烧录（subtitle_style）
    # + BGM 混音 + zoompan 运镜模拟 + 9:16 输出
