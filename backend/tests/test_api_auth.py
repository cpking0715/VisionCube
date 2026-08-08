"""认证 API 端点测试。"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.auth import router as auth_router
from app.core.security import hash_password
from app.models.user import User


def _app():
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/auth")
    return app


def test_login_success(db_session):
    db_session.add(User(username="admin", hashed_password=hash_password("pw")))
    db_session.commit()
    client = TestClient(_app())
    r = client.post("/api/auth/login", data={"username": "admin", "password": "pw"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(db_session):
    db_session.add(User(username="admin", hashed_password=hash_password("pw")))
    db_session.commit()
    client = TestClient(_app())
    r = client.post("/api/auth/login", data={"username": "admin", "password": "bad"})
    assert r.status_code == 401
