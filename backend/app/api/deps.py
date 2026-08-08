"""API 通用依赖：认证相关依赖。"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

bearer = HTTPBearer(auto_error=False)

# 401 响应统一携带 RFC 6750 要求的 WWW-Authenticate 头，提示客户端使用 Bearer 方案
_WWW_AUTH = {"WWW-Authenticate": "Bearer"}


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """校验 Bearer token 并返回当前用户。"""
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing token", headers=_WWW_AUTH)
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token", headers=_WWW_AUTH)
    sub = payload.get("sub")
    if sub is None:
        # 签名有效但缺 sub claim：视为非法 token，而非 500
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token", headers=_WWW_AUTH)
    user = db.query(User).filter_by(username=sub).first()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found", headers=_WWW_AUTH)
    return user
