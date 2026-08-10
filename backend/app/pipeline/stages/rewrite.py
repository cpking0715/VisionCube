import json

from app.models.script import Script


def _normalize_script(item) -> str:
    """模型可能返回纯字符串或带结构的对象，统一提取纯文本脚本。"""
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        text = item.get("text")
        if isinstance(text, str):
            return text
    return json.dumps(item, ensure_ascii=False)


def run(ctx) -> None:
    transcript = (ctx.task_dir / "transcript.json").read_text(encoding="utf-8")
    structure = (ctx.task_dir / "structure.json").read_text(encoding="utf-8")
    prompt = (
        f"保留爆款结构并迁移到目标行业。原文案：{transcript}\n结构分析：{structure}\n"
        f"目标行业：{ctx.task.target_industry or '通用'}\n产品卖点：{ctx.task.product_brief or '无'}\n"
        f"输出 1-3 版改写脚本，每个版本为一段纯文本（不附加时间轴或结构说明），"
        f'JSON："scripts": ["版本1", "版本2", ...]'
    )
    raw = ctx.bundle.llm.complete(prompt, json_mode=True)
    data = json.loads(raw)
    existing = ctx.db.query(Script).filter_by(task_id=ctx.task.id, kind="rewrite").count()
    for i, text in enumerate(data.get("scripts", [])[:3]):
        ctx.db.add(Script(task_id=ctx.task.id, kind="rewrite",
                          content=_normalize_script(text), version=existing + i + 1))
    ctx.db.flush()
