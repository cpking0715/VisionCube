from app.core.exceptions import RecoverablePipelineError


def run(ctx) -> None:
    transcript_path = ctx.task_dir / "transcript.json"
    if not transcript_path.exists():
        raise RecoverablePipelineError("NO_TRANSCRIPT", "缺少转写结果")
    transcript = transcript_path.read_text(encoding="utf-8")
    prompt = f"请分析以下爆款短视频文案的爆款结构：\n{transcript}"
    raw = ctx.bundle.llm.complete(prompt, json_mode=True)
    (ctx.task_dir / "structure.json").write_text(raw, encoding="utf-8")
