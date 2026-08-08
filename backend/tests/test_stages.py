import pytest

from app.models.script import Script
from app.models.task import Task
from app.models.task import TaskStatus as TS
from app.models.user import User
from app.models.video_file import VideoFile
from app.pipeline.stages import STAGE_RUNNERS, StageContext
from app.providers.registry import build_mock_bundle


@pytest.fixture()
def ctx(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    task = Task(user_id=user.id, source_url="https://v.douyin.com/x",
                status=TS.PENDING)
    db_session.add(task)
    db_session.flush()
    return StageContext(db=db_session, task=task, bundle=build_mock_bundle(),
                        task_dir=tmp_path / str(task.id))


def test_all_stages_registered():
    for s in (TS.PARSING, TS.TRANSCRIBING, TS.ANALYZING, TS.REWRITING,
              TS.META_GENERATING, TS.MODERATING_TEXT, TS.SYNTHESIZING,
              TS.GENERATING_AVATAR, TS.COMPOSING, TS.GENERATING_COVER,
              TS.MODERATING_VIDEO):
        assert s in STAGE_RUNNERS


def test_parse_stage_registers_source_video(ctx):
    STAGE_RUNNERS[TS.PARSING](ctx)
    ctx.db.flush()
    files = ctx.db.query(VideoFile).filter_by(task_id=ctx.task.id).all()
    assert any(f.kind == "source_video" for f in files)
    assert (ctx.task_dir / "source.mp4").exists()


def test_rewrite_stage_creates_versions(ctx):
    for s in (TS.PARSING, TS.TRANSCRIBING, TS.ANALYZING):
        STAGE_RUNNERS[s](ctx)
    STAGE_RUNNERS[TS.REWRITING](ctx)
    ctx.db.flush()
    scripts = ctx.db.query(Script).filter_by(task_id=ctx.task.id, kind="rewrite").all()
    assert len(scripts) >= 1


def test_full_mock_chain_produces_final_and_covers(ctx):
    order = [TS.PARSING, TS.TRANSCRIBING, TS.ANALYZING, TS.REWRITING]
    for s in order:
        STAGE_RUNNERS[s](ctx)
    # 模拟人工确认：标记第一版为 final
    script = ctx.db.query(Script).filter_by(task_id=ctx.task.id, kind="rewrite").first()
    script.kind = "final"
    script.is_confirmed = True
    ctx.db.flush()
    for s in (TS.META_GENERATING, TS.MODERATING_TEXT, TS.SYNTHESIZING,
              TS.GENERATING_AVATAR, TS.COMPOSING, TS.GENERATING_COVER,
              TS.MODERATING_VIDEO):
        STAGE_RUNNERS[s](ctx)
    ctx.db.flush()
    kinds = {f.kind for f in ctx.db.query(VideoFile).filter_by(task_id=ctx.task.id)}
    assert {"source_video", "audio", "avatar_video", "final", "cover"} <= kinds
    from app.models.publish_meta import PublishMeta
    metas = ctx.db.query(PublishMeta).filter_by(task_id=ctx.task.id).all()
    assert len(metas) == 3
