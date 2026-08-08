"""认证端点：登录。"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import Token

router = APIRouter()

# 用户不存在时也执行一次 bcrypt 验证，抹平响应时间差，防用户名枚举（FastAPI 官方安全教程写法）。
# 固定字面量而非模块加载时 hash_password()：避免 import 时跑 bcrypt（约 100ms）拖慢测试收集。
_DUMMY_HASH = "$2b$12$lLLZrtPouWj6ESWWWjT1Uuu92X9cof20ZkqiJWd5k4KSHISF7ZUrK"


@router.post("/login", response_model=Token)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    """用户名密码登录，返回 JWT access token。"""
    user = db.query(User).filter_by(username=form.username).first()
    if user is None:
        verify_password(form.password, _DUMMY_HASH)  # 抹平时序，防用户名枚举
        raise HTTPException(401, "incorrect credentials")
    if not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "incorrect credentials")
    return Token(access_token=create_access_token(user.username), token_type="bearer")
