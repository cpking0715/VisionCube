from typing import ClassVar

from app.core import database
from app.core.config import settings
from app.worker import tasks
from app.worker.settings import redis_settings


async def _on_startup(ctx: dict) -> None:
    """arq worker 启动钩子：先初始化数据库，再把重启前卡在执行中态的任务标记 FAILED。

    让"先初始化再启动"成为代码而非 runbook 约定。
    """
    database.init_db(settings.database_url)
    db = database.SessionLocal()
    try:
        tasks.scan_stuck_tasks(db)
    finally:
        db.close()


class WorkerSettings:
    redis_settings = redis_settings()
    functions: ClassVar[list] = [tasks.run_pipeline]
    on_startup = _on_startup
