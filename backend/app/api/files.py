"""文件下载端点：下载当前用户任务产物文件。"""

import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
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
