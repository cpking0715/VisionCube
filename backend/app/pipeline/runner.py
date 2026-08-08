import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.exceptions import PipelineError
from app.models.stage_log import StageLog
from app.models.task import Task, TaskStatus
from app.pipeline.stages import STAGE_RUNNERS, StageContext
from app.pipeline.state_machine import (
    PAUSE_STATES,
    TERMINAL_STATES,
    assert_transition,
    next_stage,
)
from app.providers.registry import ProviderBundle

logger = logging.getLogger(__name__)

MAX_STEPS_PER_RUN = 20  # 防御性上限，避免循环空转


class PipelineRunner:
    def __init__(self, bundle: ProviderBundle, data_root: str | Path):
        self.bundle = bundle
        self.data_root = Path(data_root)

    def task_dir(self, task: Task) -> Path:
        return self.data_root / str(task.user_id) / str(task.id)

    def run_until_pause(self, db: Session, task: Task) -> None:
        for _ in range(MAX_STEPS_PER_RUN):
            if task.status in TERMINAL_STATES or task.status in PAUSE_STATES:
                return
            stage = task.status if task.status in STAGE_RUNNERS else next_stage(task.status)
            if stage is None or stage not in STAGE_RUNNERS:
                # PENDING 等入口态：直接推进到下一阶段
                target = next_stage(task.status)
                if target is None:
                    return
                assert_transition(task.status, target)
                task.status = target
                db.flush()
                continue
            # 入口态（如 PENDING→PARSING）先置位，保证任务状态记录每个阶段
            if task.status != stage:
                assert_transition(task.status, stage)
                task.status = stage
                db.flush()
            self._execute_stage(db, task, stage)
            db.commit()

    def _execute_stage(self, db: Session, task: Task, stage: TaskStatus) -> None:
        ctx = StageContext(db=db, task=task, bundle=self.bundle,
                           task_dir=self.task_dir(task))
        db.add(StageLog(task_id=task.id, stage=stage.value, status="started"))
        db.flush()
        try:
            STAGE_RUNNERS[stage](ctx)
        except PipelineError as exc:
            self._mark_failed(db, task, stage, exc.code, exc.message)
            return
        except Exception as exc:
            logger.exception("stage %s crashed", stage)
            self._mark_failed(db, task, stage, "INTERNAL", str(exc))
            return
        db.add(StageLog(task_id=task.id, stage=stage.value, status="success",
                        detail=json.dumps({}, ensure_ascii=False)))
        target = next_stage(stage)
        assert target is not None
        assert_transition(stage, target)
        task.status = target
        db.flush()

    def _mark_failed(self, db, task, stage, code, message):
        db.add(StageLog(task_id=task.id, stage=stage.value, status="failed",
                        detail=json.dumps({"code": code}, ensure_ascii=False)))
        assert_transition(task.status, TaskStatus.FAILED)
        task.status = TaskStatus.FAILED
        task.failed_stage = stage.value
        task.error_code = code
        task.error_message = message
        db.flush()
