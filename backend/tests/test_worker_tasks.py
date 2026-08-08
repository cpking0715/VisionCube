import pytest

from app.models.task import Task
from app.models.task import TaskStatus as TS
from app.models.user import User


async def test_run_pipeline_job_executes_to_pause(db_session, tmp_path, monkeypatch):
    from app.worker import tasks as worker_tasks

    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    task = Task(user_id=user.id, source_url="https://v.douyin.com/x", status=TS.PENDING)
    db_session.add(task)
    db_session.commit()

    monkeypatch.setattr(worker_tasks, "_make_runner",
                        lambda: _runner(tmp_path))
    await worker_tasks.run_pipeline({"db": db_session}, task_id=task.id)
    db_session.refresh(task)
    assert task.status == TS.AWAITING_SCRIPT


def _runner(tmp_path):
    from app.pipeline.runner import PipelineRunner
    from app.providers.registry import build_mock_bundle
    return PipelineRunner(build_mock_bundle(), data_root=tmp_path)


def test_scan_stuck_tasks_marks_failed(db_session):
    from app.worker.tasks import scan_stuck_tasks
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    stuck = Task(user_id=user.id, source_url="u", status=TS.GENERATING_AVATAR)
    done = Task(user_id=user.id, source_url="u", status=TS.COMPLETED)
    db_session.add_all([stuck, done])
    db_session.commit()
    n = scan_stuck_tasks(db_session)
    db_session.refresh(stuck)
    assert n == 1 and stuck.status == TS.FAILED and done.status == TS.COMPLETED


def test_scan_stuck_tasks_ignores_pause_states(db_session):
    from app.worker.tasks import scan_stuck_tasks

    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    paused = [
        Task(user_id=user.id, source_url="u", status=TS.AWAITING_SCRIPT),
        Task(user_id=user.id, source_url="u", status=TS.REVIEW),
    ]
    db_session.add_all(paused)
    db_session.commit()

    n = scan_stuck_tasks(db_session)

    assert n == 0
    for t in paused:
        db_session.refresh(t)
        assert t.status in (TS.AWAITING_SCRIPT, TS.REVIEW)


@pytest.mark.parametrize("status", [TS.COMPLETED, TS.FAILED, TS.AWAITING_SCRIPT])
async def test_run_pipeline_skips_terminal_and_pause(db_session, monkeypatch, status):
    from app.worker import tasks as worker_tasks

    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    task = Task(user_id=user.id, source_url="u", status=status)
    db_session.add(task)
    db_session.commit()

    class SpyRunner:
        def __init__(self):
            self.run_called = False

        def run_until_pause(self, db, task):
            self.run_called = True

    spy = SpyRunner()
    monkeypatch.setattr(worker_tasks, "_make_runner", lambda: spy)

    await worker_tasks.run_pipeline({"db": db_session}, task_id=task.id)

    db_session.refresh(task)
    assert task.status == status
    assert spy.run_called is False


async def test_run_pipeline_skips_missing_task(db_session, monkeypatch):
    from app.worker import tasks as worker_tasks

    class SpyRunner:
        def __init__(self):
            self.run_called = False

        def run_until_pause(self, db, task):
            self.run_called = True

    spy = SpyRunner()
    monkeypatch.setattr(worker_tasks, "_make_runner", lambda: spy)

    await worker_tasks.run_pipeline({"db": db_session}, task_id=999999)

    assert spy.run_called is False


def test_non_recoverable_states_cover_all_executing():
    from app.pipeline.state_machine import PAUSE_STATES, TERMINAL_STATES
    from app.worker.tasks import _NON_RECOVERABLE_ON_BOOT

    assert (
        set(_NON_RECOVERABLE_ON_BOOT) | TERMINAL_STATES | PAUSE_STATES | {TS.PENDING}
    ) == set(TS)


async def test_run_pipeline_self_managed_session_closed(db_session, tmp_path, monkeypatch):
    from app.core import database
    from app.worker import tasks as worker_tasks

    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    task = Task(user_id=user.id, source_url="https://v.douyin.com/x", status=TS.PENDING)
    db_session.add(task)
    db_session.commit()

    class SpySession:
        def __init__(self, wrapped):
            self._wrapped = wrapped
            self.closed = False

        def __getattr__(self, name):
            return getattr(self._wrapped, name)

        def close(self):
            self.closed = True
            self._wrapped.close()

    spy = SpySession(db_session)
    monkeypatch.setattr(database, "SessionLocal", lambda: spy)
    monkeypatch.setattr(worker_tasks, "_make_runner", lambda: _runner(tmp_path))

    await worker_tasks.run_pipeline({}, task_id=task.id)

    assert spy.closed
    # 自建 session 已被 close，用同库新查询断言（StaticPool 内存库跨连接共享）
    check = spy.get(Task, task.id)
    assert check.status == TS.AWAITING_SCRIPT


async def test_worker_on_startup_initializes_db_then_scans(db_session, monkeypatch):
    from app.core import database
    from app.core.config import settings
    from app.worker.main import WorkerSettings

    calls: list = []

    def fake_init_db(url: str) -> None:
        calls.append(("init_db", url))

    def fake_scan(db) -> int:
        calls.append("scan")
        return 0

    monkeypatch.setattr(database, "init_db", fake_init_db)
    monkeypatch.setattr("app.worker.tasks.scan_stuck_tasks", fake_scan)

    await WorkerSettings.on_startup({})

    assert calls == [("init_db", settings.database_url), "scan"]
