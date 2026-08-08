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


@router.post("/login", response_model=Token)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    """用户名密码登录，返回 JWT access token。"""
    user = db.query(User).filter_by(username=form.username).first()
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "incorrect credentials")
    return {"access_token": create_access_token(user.username), "token_type": "bearer"}
