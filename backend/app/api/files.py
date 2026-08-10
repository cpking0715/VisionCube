"""文件下载端点：下载当前用户任务产物文件。"""

import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.video_file import VideoFile

router = APIRouter()


@router.get("/{file_id}/download")
def download(
    file_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """下载文件；仅限文件所属用户，越权一律 404（不泄露存在性）。"""
    vf = db.get(VideoFile, file_id)
    if vf is None or vf.user_id != user.id:
        raise HTTPException(404, "file not found")
    if not os.path.isfile(vf.path):
        raise HTTPException(404, "file not found")
    return FileResponse(vf.path, filename=os.path.basename(vf.path))


@router.get("/public/{user_id}/{task_id}/{filename}")
def public_file(user_id: int, task_id: int, filename: str):
    """
    公开文件访问端点（无需认证）

    用于火山引擎数字人、DashScope ASR 等外部服务回调访问本地文件。
    仅限 data_root 下的任务文件。

    Args:
        user_id: 用户 ID
        task_id: 任务 ID
        filename: 文件名

    Returns:
        FileResponse: 文件内容
    """
    # 安全检查：防止路径遍历
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "invalid filename")

    file_path = Path(settings.data_root) / str(user_id) / str(task_id) / filename

    if not file_path.exists():
        raise HTTPException(404, "file not found")

    return FileResponse(file_path)
