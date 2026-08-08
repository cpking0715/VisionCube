from typing import ClassVar

from app.worker import tasks
from app.worker.settings import redis_settings


class WorkerSettings:
    redis_settings = redis_settings()
    functions: ClassVar[list] = [tasks.run_pipeline]
    on_startup = None  # 真实启动入口在 runbook 说明：先 scan_stuck_tasks 再 arq worker
