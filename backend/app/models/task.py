import enum

from sqlalchemy import JSON, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARSING = "PARSING"
    TRANSCRIBING = "TRANSCRIBING"
    ANALYZING = "ANALYZING"
    REWRITING = "REWRITING"
    AWAITING_SCRIPT = "AWAITING_SCRIPT"
    META_GENERATING = "META_GENERATING"
    MODERATING_TEXT = "MODERATING_TEXT"
    SYNTHESIZING = "SYNTHESIZING"
    GENERATING_AVATAR = "GENERATING_AVATAR"
    COMPOSING = "COMPOSING"
    GENERATING_COVER = "GENERATING_COVER"
    MODERATING_VIDEO = "MODERATING_VIDEO"
    REVIEW = "REVIEW"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.PENDING)
    failed_stage: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_url: Mapped[str] = mapped_column(String(512))
    target_industry: Mapped[str | None] = mapped_column(String(64), nullable=True)
    product_brief: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="zh")
    voice_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    avatar_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    subtitle_style: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    title_style: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pip_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    scene_config: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [{segment, background_asset_id, camera_move}]
    background_asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    selected_cover_id: Mapped[int | None] = mapped_column(
        ForeignKey("video_files.id"), nullable=True
    )
    moderation_retry_count: Mapped[int] = mapped_column(default=0)
