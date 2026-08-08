from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.task import Task, TaskStatus
from app.pipeline.stages import (
    analyze,
    avatar,
    compose,
    cover,
    meta_generate,
    moderate_text,
    moderate_video,
    parse,
    rewrite,
    synthesize,
    transcribe,
)
from app.providers.registry import ProviderBundle


@dataclass
class StageContext:
    db: Session
    task: Task
    bundle: ProviderBundle
    task_dir: Path


STAGE_RUNNERS = {
    TaskStatus.PARSING: parse.run,
    TaskStatus.TRANSCRIBING: transcribe.run,
    TaskStatus.ANALYZING: analyze.run,
    TaskStatus.REWRITING: rewrite.run,
    TaskStatus.META_GENERATING: meta_generate.run,
    TaskStatus.MODERATING_TEXT: moderate_text.run,
    TaskStatus.SYNTHESIZING: synthesize.run,
    TaskStatus.GENERATING_AVATAR: avatar.run,
    TaskStatus.COMPOSING: compose.run,
    TaskStatus.GENERATING_COVER: cover.run,
    TaskStatus.MODERATING_VIDEO: moderate_video.run,
}
