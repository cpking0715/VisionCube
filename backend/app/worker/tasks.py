import logging

from sqlalchemy.orm import Session

from app.core import database
from app.core.config import settings
from app.models.task import Task, TaskStatus
from app.pipeline.runner import PipelineRunner
from app.pipeline.state_machine import PAUSE_STATES, TERMINAL_STATES
from app.providers.registry import build_provider_bundle

logger = logging.getLogger(__name__)

_NON_RECOVERABLE_ON_BOOT = (
    TaskStatus.PARSING, TaskStatus.TRANSCRIBING, TaskStatus.ANALYZING,
    TaskStatus.REWRITING, TaskStatus.META_GENERATING, TaskStatus.MODERATING_TEXT,
    TaskStatus.SYNTHESIZING,
    TaskStatus.GENERATING_AVATAR, TaskStatus.COMPOSING,
    TaskStatus.GENERATING_COVER, TaskStatus.MODERATING_VIDEO,
)


def _make_runner() -> PipelineRunner:
    return PipelineRunner(build_provider_bundle(), data_root=settings.data_root)


async def run_pipeline(ctx: dict, task_id: int) -> None:
    # 动态引用 database 模块：允许测试替换 SessionLocal，也保证读到 init_db 初始化后的值
    db: Session = ctx.get("db") or database.SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None or task.status in TERMINAL_STATES or task.status in PAUSE_STATES:
            logger.info("skip task %s status=%s", task_id, task.status if task else None)
            return
        runner = ctx.get("runner") or _make_runner()
        try:
            runner.run_until_pause(db, task)
        except Exception:
            logger.exception("pipeline failed for task %s", task_id)
            raise
        db.commit()  # runner 内部逐阶段 commit，此处兜底
    finally:
        if "db" not in ctx:
            db.close()


def scan_stuck_tasks(db: Session) -> int:
    """worker 启动时：把卡在执行中态的任务标记 FAILED 待重试。"""
    stuck = db.query(Task).filter(Task.status.in_(_NON_RECOVERABLE_ON_BOOT)).all()
    for t in stuck:
        stage = t.status.value  # 先取原状态再置 FAILED
        t.status = TaskStatus.FAILED
        t.failed_stage = t.failed_stage or stage
        t.error_code = "WORKER_RESTART"
        t.error_message = "服务重启，任务中断，请重试"
        logger.warning("marked task %s failed due to worker restart", t.id)
    db.commit()
    return len(stuck)
