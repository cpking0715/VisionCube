from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # avatar|voice|bgm|background|pip
    source: Mapped[str] = mapped_column(String(16), default="upload")  # upload|platform|openverse|pixabay|pexels
    name: Mapped[str] = mapped_column(String(128))
    provider_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)  # 供应商侧资产 ID
    path: Mapped[str | None] = mapped_column(String(512), nullable=True)  # 本地文件，背景/画中画分目录存储
