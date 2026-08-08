"""认证 API 端点测试。"""

from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt

from app.api.auth import router as auth_router
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, decode_token, hash_password
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
    # sub 契约正向基线：token 的 sub 必须是登录用户名
    assert decode_token(r.json()["access_token"])["sub"] == "admin"


def test_login_wrong_password(db_session):
    db_session.add(User(username="admin", hashed_password=hash_password("pw")))
    db_session.commit()
    client = TestClient(_app())
    r = client.post("/api/auth/login", data={"username": "admin", "password": "bad"})
    assert r.status_code == 401


def _protected_app():
    """构建临时受保护端点，直接验证 get_current_user 安全边界。"""
    app = FastAPI()

    @app.get("/me")
    def me(user: Annotated[User, Depends(get_current_user)]):
        return {"user": user.username}

    return app


def test_get_current_user_missing_token(db_session):
    """无 token：401 missing token，且带 WWW-Authenticate 头。"""
    r = TestClient(_protected_app()).get("/me")
    assert r.status_code == 401
    assert r.json()["detail"] == "missing token"
    assert r.headers.get("www-authenticate") == "Bearer"


def test_get_current_user_invalid_token(db_session):
    """签名无效的 token：401 invalid token。"""
    r = TestClient(_protected_app()).get("/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid token"


def test_get_current_user_missing_sub_claim(db_session):
    """签名有效但缺 sub claim 的 token：401 而非 500。"""
    token = jwt.encode({}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    r = TestClient(_protected_app()).get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid token"


def test_get_current_user_user_not_found(db_session):
    """token 有效但用户不存在：401 user not found。"""
    token = create_access_token("ghost")
    r = TestClient(_protected_app()).get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.json()["detail"] == "user not found"
