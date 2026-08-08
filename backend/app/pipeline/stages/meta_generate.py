import json

from app.core.exceptions import RecoverablePipelineError
from app.models.publish_meta import PublishMeta
from app.models.script import Script


def run(ctx) -> None:
    final = (ctx.db.query(Script)
             .filter_by(task_id=ctx.task.id, is_confirmed=True)
             .order_by(Script.id.desc()).first())
    if final is None:
        raise RecoverablePipelineError("NO_CONFIRMED_SCRIPT", "缺少已确认脚本")
    prompt = (f"基于以下确认脚本，生成标题与话题：\n{final.content}\n"
              f"输出 JSON：{{\"options\": [{{\"title\": \"...\", "
              f"\"hashtags\": [\"#...\"]}}]}}，共 3 套")
    data = json.loads(ctx.bundle.llm.complete(prompt, json_mode=True))
    ctx.db.query(PublishMeta).filter_by(task_id=ctx.task.id).delete()  # 整改回路重生成时替换旧方案
    for i, item in enumerate(data.get("options", [])[:3]):
        ctx.db.add(PublishMeta(task_id=ctx.task.id, title=item["title"],
                               hashtags=item.get("hashtags", []), version=i + 1))
    ctx.db.flush()
