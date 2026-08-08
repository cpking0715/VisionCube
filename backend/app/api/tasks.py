"""任务 API：创建（内联执行流水线）、列表、详情、确认脚本、重试、完成。

阶段 1 任务创建后不入 Redis 队列，而是同步内联调用 run_until_pause（保持接口形状，
阶段 2 换成 Arq 入队）；SSE 端点阶段 1 不实现，前端轮询详情。
"""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core import database
from app.core.config import settings
from app.core.database import get_db
from app.models.script import Script
from app.models.stage_log import StageLog
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.video_file import VideoFile
from app.pipeline.runner import PipelineRunner
from app.pipeline.state_machine import assert_transition
from app.providers.registry import build_mock_bundle

router = APIRouter()

# 测试可覆盖；生产用 settings.data_root
_DATA_ROOT = None


def _runner() -> PipelineRunner:
    return PipelineRunner(build_mock_bundle(), data_root=_DATA_ROOT or settings.data_root)


def _run_now(task_id: int) -> None:
    # 动态引用 database 模块：保证读到测试替换/init_db 初始化后的 SessionLocal，
    # 不能用 `from app.core.database import SessionLocal`（模块导入时绑定，替换不生效）
    db = database.SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None:
            return
        _runner().run_until_pause(db, task)
        db.commit()  # runner 内部逐阶段 commit，此处兜底
    finally:
        db.close()


class TaskCreate(BaseModel):
    source_url: str
    target_industry: str | None = None
    product_brief: str | None = None
    language: str = "zh"
    voice_id: str | None = None
    avatar_id: str | None = None
    background_asset_id: int | None = None
    subtitle_style: dict | None = None
    title_style: dict | None = None
    pip_config: dict | None = None
    scene_config: list | None = None


class ScriptConfirm(BaseModel):
    script_id: int
    content: str | None = None  # 传入则覆盖原文（人工编辑）


def _task_out(task: Task) -> dict:
    return {
        "id": task.id, "status": task.status.value,
        "source_url": task.source_url,
        "target_industry": task.target_industry,
        "failed_stage": task.failed_stage,
        "error_code": task.error_code, "error_message": task.error_message,
    }


def _get_task_or_404(db: Session, task_id: int, user: User) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(404, "task not found")
    return task


@router.post("", status_code=201)
def create_task(body: TaskCreate, bg: BackgroundTasks,
                db: Annotated[Session, Depends(get_db)],
                user: Annotated[User, Depends(get_current_user)]):
    """创建任务并内联执行流水线至暂停态（AWAITING_SCRIPT/REVIEW）或终态。"""
    task = Task(user_id=user.id, source_url=body.source_url,
                target_industry=body.target_industry, product_brief=body.product_brief,
                language=body.language, voice_id=body.voice_id, avatar_id=body.avatar_id,
                background_asset_id=body.background_asset_id,
                subtitle_style=body.subtitle_style, title_style=body.title_style,
                pip_config=body.pip_config, scene_config=body.scene_config,
                status=TaskStatus.PENDING)
    db.add(task)
    db.commit()
    db.refresh(task)
    _run_now(task.id)  # 阶段 1 内联执行；阶段 2 换 Arq 入队（bg.add_task 形状保持）
    db.refresh(task)
    return _task_out(task)


@router.get("")
def list_tasks(db: Annotated[Session, Depends(get_db)],
               user: Annotated[User, Depends(get_current_user)]):
    """当前用户的任务列表（按创建时间倒序）。"""
    tasks = db.query(Task).filter_by(user_id=user.id).order_by(Task.id.desc()).all()
    return [_task_out(t) for t in tasks]


@router.get("/{task_id}")
def get_task(task_id: int, db: Annotated[Session, Depends(get_db)],
             user: Annotated[User, Depends(get_current_user)]):
    """任务详情：基本信息 + 阶段日志 + 脚本 + 产物文件。"""
    task = _get_task_or_404(db, task_id, user)
    out = _task_out(task)
    out["logs"] = [{"stage": l.stage, "status": l.status, "created_at": str(l.created_at)}
                   for l in db.query(StageLog).filter_by(task_id=task.id).all()]
    out["scripts"] = [{"id": s.id, "kind": s.kind, "version": s.version,
                       "content": s.content, "is_confirmed": s.is_confirmed}
                      for s in db.query(Script).filter_by(task_id=task.id).all()]
    out["files"] = [{"id": f.id, "kind": f.kind}
                    for f in db.query(VideoFile).filter_by(task_id=task.id).all()]
    return out


@router.post("/{task_id}/confirm-script")
def confirm_script(task_id: int, body: ScriptConfirm, bg: BackgroundTasks,
                   db: Annotated[Session, Depends(get_db)],
                   user: Annotated[User, Depends(get_current_user)]):
    """确认脚本后从 META_GENERATING 继续执行流水线至暂停态。"""
    task = _get_task_or_404(db, task_id, user)
    if task.status != TaskStatus.AWAITING_SCRIPT:
        raise HTTPException(409, "task not awaiting script")
    script = db.get(Script, body.script_id)
    if script is None or script.task_id != task.id:
        raise HTTPException(404, "script not found")
    if body.content:
        script.content = body.content
    script.is_confirmed = True
    assert_transition(task.status, TaskStatus.META_GENERATING)  # 状态机边校验
    task.status = TaskStatus.META_GENERATING
    db.commit()
    _run_now(task.id)  # 阶段 2 换 Arq 入队（bg.add_task 形状保持）
    db.refresh(task)
    return _task_out(task)


@router.post("/{task_id}/retry")
def retry_task(task_id: int, bg: BackgroundTasks,
               db: Annotated[Session, Depends(get_db)],
               user: Annotated[User, Depends(get_current_user)]):
    """失败任务回到失败阶段重跑流水线。"""
    task = _get_task_or_404(db, task_id, user)
    if task.status != TaskStatus.FAILED:
        raise HTTPException(409, "task not failed")
    if not task.failed_stage:
        raise HTTPException(409, "task missing failed_stage")
    task.status = TaskStatus(task.failed_stage)  # 回到失败阶段重试（FAILED 无出边，不走状态机校验）
    task.error_code = None
    task.error_message = None
    db.commit()
    _run_now(task.id)  # 阶段 2 换 Arq 入队（bg.add_task 形状保持）
    db.refresh(task)
    return _task_out(task)


@router.post("/{task_id}/complete")
def complete_task(task_id: int, db: Annotated[Session, Depends(get_db)],
                  user: Annotated[User, Depends(get_current_user)]):
    """审核通过，任务完成。"""
    task = _get_task_or_404(db, task_id, user)
    if task.status != TaskStatus.REVIEW:
        raise HTTPException(409, "task not in review")
    task.status = TaskStatus.COMPLETED
    db.commit()
    return _task_out(task)
