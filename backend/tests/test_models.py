from app.models.asset import Asset
from app.models.publish_meta import PublishMeta
from app.models.script import Script
from app.models.stage_log import StageLog
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.video_file import VideoFile


def _create_user(db_session, username="admin"):
    user = User(username=username, hashed_password="x")
    db_session.add(user)
    db_session.flush()
    return user


def _create_task(db_session, user, source_url="https://v.douyin.com/abc"):
    task = Task(user_id=user.id, source_url=source_url)
    db_session.add(task)
    db_session.flush()
    return task


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


def test_task_defaults(db_session):
    user = _create_user(db_session)
    task = _create_task(db_session, user)

    assert task.status == TaskStatus.PENDING
    assert task.language == "zh"
    assert task.moderation_retry_count == 0


def test_publish_meta_defaults(db_session):
    user = _create_user(db_session)
    task = _create_task(db_session, user)

    pm = PublishMeta(task_id=task.id, title="标题一")
    db_session.add(pm)
    db_session.flush()

    assert pm.hashtags == []
    assert pm.version == 1
    assert pm.is_selected is False


def test_script_table(db_session):
    user = _create_user(db_session)
    task = _create_task(db_session, user)

    script = Script(task_id=task.id, kind="rewrite", content="改写后的脚本内容")
    db_session.add(script)
    db_session.flush()

    assert script.task_id == task.id
    assert script.kind == "rewrite"
    assert script.content == "改写后的脚本内容"
    assert script.version == 1
    assert script.is_confirmed is False


def test_asset_table(db_session):
    user = _create_user(db_session)

    asset = Asset(user_id=user.id, kind="background", name="背景图一")
    db_session.add(asset)
    db_session.flush()

    assert asset.user_id == user.id
    assert asset.kind == "background"
    assert asset.name == "背景图一"
    assert asset.source == "upload"
