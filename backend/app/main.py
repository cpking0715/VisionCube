"""FastAPI 应用工厂：初始化数据库并挂载全部 API 路由。"""

from fastapi import FastAPI

from app.api import auth, files, tasks
from app.core.config import settings
from app.core.database import init_db


def create_app() -> FastAPI:
    init_db(settings.database_url)
    app = FastAPI(title="VisionCube")
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
    app.include_router(files.router, prefix="/api/files", tags=["files"])
    return app


app = create_app()
