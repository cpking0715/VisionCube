from app.core.exceptions import RecoverablePipelineError
from app.models.script import Script


def run(ctx) -> None:
    final = ctx.db.query(Script).filter_by(
        task_id=ctx.task.id, is_confirmed=True).order_by(Script.id.desc()).first()
    if final is None:
        raise RecoverablePipelineError("NO_CONFIRMED_SCRIPT", "缺少已确认脚本")
    result = ctx.bundle.moderation.moderate_text(final.content)
    if not result.passed:
        # 整改回路（TEXT_MODERATION_FAILED → REWRITING）阶段 2 接入
        raise RecoverablePipelineError(
            "TEXT_MODERATION_FAILED", "；".join(result.violations) or "文本审核未通过")
