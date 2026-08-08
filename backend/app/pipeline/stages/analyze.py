def run(ctx) -> None:
    transcript = (ctx.task_dir / "transcript.json").read_text(encoding="utf-8")
    prompt = f"请分析以下爆款短视频文案的爆款结构：\n{transcript}"
    raw = ctx.bundle.llm.complete(prompt, json_mode=True)
    (ctx.task_dir / "structure.json").write_text(raw, encoding="utf-8")
