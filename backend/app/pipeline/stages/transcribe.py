import json

from app.pipeline.stages._util import latest_file


def run(ctx) -> None:
    source = latest_file(ctx, "source_video")
    sentences = ctx.bundle.asr.transcribe(source)
    out = ctx.task_dir / "transcript.json"
    out.write_text(json.dumps(
        [{"text": s.text, "start": s.start, "end": s.end} for s in sentences],
        ensure_ascii=False), encoding="utf-8")
