from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.api.files import router as files_router
from app.models.user import User
from app.models.video_file import VideoFile


def test_download_own_file(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    f = tmp_path / "final.mp4"
    f.write_bytes(b"VIDEO")
    vf = VideoFile(user_id=user.id, kind="final", path=str(f))
    db_session.add(vf)
    db_session.commit()

    app = FastAPI()
    app.include_router(files_router, prefix="/api/files")
    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app)
    r = client.get(f"/api/files/{vf.id}/download")
    assert r.status_code == 200 and r.content == b"VIDEO"


def test_download_other_user_file_denied(db_session, tmp_path):
    owner = User(username="owner", hashed_password="x")
    other = User(username="other", hashed_password="x")
    db_session.add_all([owner, other])
    db_session.flush()
    f = tmp_path / "a.mp4"
    f.write_bytes(b"V")
    vf = VideoFile(user_id=owner.id, kind="final", path=str(f))
    db_session.add(vf)
    db_session.commit()

    app = FastAPI()
    app.include_router(files_router, prefix="/api/files")
    app.dependency_overrides[get_current_user] = lambda: other
    client = TestClient(app)
    assert client.get(f"/api/files/{vf.id}/download").status_code == 404


def test_download_missing_file_404(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    vf = VideoFile(user_id=user.id, kind="final", path=str(tmp_path / "missing.mp4"))
    db_session.add(vf)
    db_session.commit()

    app = FastAPI()
    app.include_router(files_router, prefix="/api/files")
    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app)
    assert client.get(f"/api/files/{vf.id}/download").status_code == 404
