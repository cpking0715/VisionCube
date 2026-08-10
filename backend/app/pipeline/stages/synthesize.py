import asyncio
import json

from app.core.exceptions import RecoverablePipelineError
from app.models.script import Script
from app.pipeline.stages._util import register_file


def run(ctx) -> None:
    final = ctx.db.query(Script).filter_by(
        task_id=ctx.task.id, is_confirmed=True).order_by(Script.id.desc()).first()
    if final is None:
        raise RecoverablePipelineError("NO_CONFIRMED_SCRIPT", "缺少已确认脚本")
    # TTS Provider 是 async 实现，同步阶段内用 asyncio.run 包装
    tts = asyncio.run(ctx.bundle.tts.synthesize(final.content, ctx.task.voice_id, ctx.task_dir))
    register_file(ctx, tts.audio_path, "audio", "SYNTHESIZING")
    (ctx.task_dir / "tts_sentences.json").write_text(json.dumps(
        [{"text": s.text, "start": s.start, "end": s.end} for s in tts.sentences],
        ensure_ascii=False), encoding="utf-8")
