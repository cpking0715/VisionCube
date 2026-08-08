import pytest

from app.models.stage_log import StageLog
from app.models.task import Task
from app.models.task import TaskStatus as TS
from app.models.user import User
from app.pipeline.runner import PipelineRunner
from app.providers.registry import build_mock_bundle


@pytest.fixture()
def task(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    t = Task(user_id=user.id, source_url="https://v.douyin.com/x", status=TS.PENDING)
    db_session.add(t)
    db_session.flush()
    return t


def test_run_until_first_pause(db_session, task, tmp_path):
    runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
    runner.run_until_pause(db_session, task)
    assert task.status == TS.AWAITING_SCRIPT
    logs = db_session.query(StageLog).filter_by(task_id=task.id).all()
    assert any(l.stage == TS.PARSING.value and l.status == "success" for l in logs)


def test_resume_after_confirm_runs_to_review(db_session, task, tmp_path):
    from app.models.script import Script
    runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
    runner.run_until_pause(db_session, task)
    # 模拟确认脚本
    s = db_session.query(Script).filter_by(task_id=task.id, kind="rewrite").first()
    s.is_confirmed = True
    task.status = TS.META_GENERATING  # 确认 API 负责置位
    db_session.flush()
    runner.run_until_pause(db_session, task)
    assert task.status == TS.REVIEW


def test_failure_marks_stage_and_can_resume(db_session, task, tmp_path):
    from app.core.exceptions import RecoverablePipelineError
    from app.pipeline.stages import STAGE_RUNNERS

    def boom(ctx):
        raise RecoverablePipelineError("PARSE_EMPTY", "解析返回空")

    # STAGE_RUNNERS 持有的是函数引用，直接替换注册表条目才能生效
    original = STAGE_RUNNERS[TS.PARSING]
    STAGE_RUNNERS[TS.PARSING] = boom
    try:
        runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
        runner.run_until_pause(db_session, task)
    finally:
        STAGE_RUNNERS[TS.PARSING] = original
    assert task.status == TS.FAILED
    assert task.failed_stage == TS.PARSING.value
    assert task.error_code == "PARSE_EMPTY"


def test_illegal_state_rejected(db_session, task, tmp_path):
    task.status = TS.COMPLETED
    db_session.flush()
    runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
    runner.run_until_pause(db_session, task)  # 终态不执行
    assert task.status == TS.COMPLETED
