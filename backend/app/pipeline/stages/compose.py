import json
import logging
import shutil

from app.pipeline.stages._util import register_file, require_file
from app.pipeline.subtitles import burn_subtitles, probe_video_size, render_ass, split_sentences

logger = logging.getLogger(__name__)


def run(ctx) -> None:
    avatar_video = require_file(ctx, "avatar_video", "NO_AVATAR_VIDEO", "缺少数字人视频")
    final = ctx.task_dir / "final.mp4"
    try:
        _compose_with_subtitles(ctx, avatar_video, final)
    except Exception:
        logger.exception("字幕烧录失败，回退为直接复制")
        shutil.copyfile(avatar_video, final)
    register_file(ctx, final, "final", "COMPOSING")


def _compose_with_subtitles(ctx, avatar_video, final) -> None:
    """基于 TTS 时间轴生成 ASS 字幕并烧录到数字人视频。

    阶段 3 扩展点：多段口播拼接（scene_config）+ BGM 混音 + zoompan 运镜模拟 + 9:16 输出。
    """
    sentences = json.loads((ctx.task_dir / "tts_sentences.json").read_text(encoding="utf-8"))
    if not sentences:
        raise RuntimeError("无字幕数据（tts_sentences.json 为空）")
    width, height = probe_video_size(avatar_video)
    style = ctx.task.subtitle_style or {}
    ass_path = ctx.task_dir / "subtitle.ass"
    ass_path.write_text(
        render_ass(split_sentences(sentences), width, height, style),
        encoding="utf-8",
    )
    burn_subtitles(avatar_video, ass_path, final)
    logger.info("字幕烧录完成: %s", final)
