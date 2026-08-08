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
