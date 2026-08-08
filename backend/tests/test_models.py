from app.models.publish_meta import PublishMeta
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.video_file import VideoFile
from app.models.stage_log import StageLog


def test_create_task_with_relations(db_session):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()

    task = Task(
        user_id=user.id,
        source_url="https://v.douyin.com/abc",
        target_industry="美妆",
        product_brief="某粉底液，持妆 12 小时",
        status=TaskStatus.PENDING,
    )
    db_session.add(task)
    db_session.flush()

    vf = VideoFile(user_id=user.id, task_id=task.id, kind="source_video",
                   path="data/1/t1/source.mp4", size_bytes=1024)
    log = StageLog(task_id=task.id, stage="PARSING", status="success", detail="{}")
    pm = PublishMeta(task_id=task.id, title="标题一", hashtags=["#爆款"], version=1)
    db_session.add_all([vf, log, pm])
    db_session.commit()

    assert task.id is not None
    assert task.user_id == user.id
    assert vf.task_id == task.id
    assert log.task_id == task.id
    assert pm.task_id == task.id
