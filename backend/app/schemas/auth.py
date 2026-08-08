"""认证相关请求/响应模型。"""

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
