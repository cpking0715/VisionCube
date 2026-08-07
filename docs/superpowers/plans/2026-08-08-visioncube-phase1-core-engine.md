# VisionCube 短视频复刻智能体 — 阶段 1 实施计划（脚手架 + 核心引擎）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建项目脚手架与核心引擎：数据模型、状态机、Mock Provider、Arq 流水线执行器、REST API + SSE，使"创建任务 → 全 Mock 阶段自动跑完（无暂停）→ 查询进度 → 下载产物"端到端可用，前端最小界面可见进度。

**Architecture:** FastAPI 同步路由 + SQLAlchemy ORM + SQLite；Arq worker 逐阶段消费状态机任务；六类能力走 Provider 抽象接口，阶段 1 全部使用 Mock 实现（真实商用 API 在阶段 2/3 接入）。状态转移白名单校验，产物登记 video_files 表。

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, Arq + Redis, pytest, httpx, SSE-starlette, uv；前端 Vite + React 18 + TypeScript + Tailwind CSS（阶段 1 仅任务列表/详情两页最小版）。

**规格依据：** `docs/superpowers/specs/2026-08-07-viral-video-replication-agent-design.md` §2/§3/§4/§6/§7/§8

**阶段 1 裁剪说明（YAGNI）：**
- 状态机保留全部状态与白名单边；但 AWAITING_SCRIPT / REVIEW 暂停点的确认 API 仅实现"确认后继续"，不含脚本编辑/封面选择交互（阶段 2/4）
- MODERATING_TEXT / MODERATING_VIDEO 由 MockModerationProvider 直接放行（整改回路逻辑在阶段 2 随真实审核接入时补全）
- 数字人轮询：MockDigitalHumanProvider 同步返回，轮询框架（Arq 延时任务）照常搭建并用测试覆盖
- SSE 进度推送延后到阶段 2；阶段 1 前端用 2 秒轮询（单用户场景足够）
- 前端 Vitest 组件测试随阶段 4（完整向导/字幕/封面交互）一并补齐；阶段 1 前端以手工联调验收

---

## 文件结构

```
backend/
├── pyproject.toml                  # 依赖与 pytest/ruff 配置
├── .env.example                    # 环境变量模板
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI 应用工厂、挂载路由
│   ├── core/
│   │   ├── config.py               # pydantic-settings 配置
│   │   ├── database.py             # engine/session/get_db
│   │   ├── security.py             # JWT 生成与校验
│   │   └── exceptions.py           # 错误分级与错误码
│   ├── models/
│   │   ├── base.py                 # DeclarativeBase
│   │   ├── user.py                 # User
│   │   ├── task.py                 # TaskStatus 枚举 + Task
│   │   ├── script.py               # Script
│   │   ├── asset.py                # Asset
│   │   ├── video_file.py           # VideoFile
│   │   └── stage_log.py            # StageLog
│   ├── schemas/                    # pydantic DTO（auth/task/script/file）
│   ├── api/
│   │   ├── deps.py                 # get_current_user 依赖
│   │   ├── auth.py                 # POST /api/auth/login
│   │   ├── tasks.py                # 任务 CRUD/确认/重试/SSE
│   │   └── files.py                # GET /api/files/{id}/download
│   ├── providers/
│   │   ├── base.py                 # 六个 Protocol 接口 + 数据结构
│   │   ├── mock.py                 # Mock 实现
│   │   └── registry.py             # 按配置装配 Provider 实例
│   ├── pipeline/
│   │   ├── state_machine.py        # 状态枚举、白名单、转移校验
│   │   ├── stages/                 # 十阶段处理器 + registry
│   │   └── runner.py               # 单步/续跑执行器 + 产物登记
│   ├── worker/
│   │   ├── settings.py             # ArqSettings
│   │   ├── tasks.py                # run_pipeline job
│   │   └── main.py                 # worker 入口 + 卡死任务扫描
│   └── scripts/seed_admin.py       # 建表 + 预置管理员
└── tests/
    ├── conftest.py                 # 内存 DB、TestClient、Mock Provider fixture
    ├── test_state_machine.py
    ├── test_runner.py
    ├── test_api_auth.py
    ├── test_api_tasks.py
    └── test_api_files.py
frontend/                            # 阶段 1 最小版：登录 + 任务列表 + 任务详情（SSE 进度）
docs/runbook.md                     # 本地运行手册（含真实 API 冒烟清单位置占位，阶段 2 填）
```

---

### Task 1: 项目脚手架与依赖

**Files:**
- Create: `backend/pyproject.toml`, `backend/.env.example`, `backend/app/__init__.py`, `.gitignore`, `README.md`

- [ ] **Step 1: 写 .gitignore 与 README**

`.gitignore`:
```
__pycache__/
*.py[cod]
.venv/
.env
backend/data/
node_modules/
frontend/dist/
*.db
.pytest_cache/
.ruff_cache/
```

`README.md`:
```markdown
# VisionCube

抖音爆款短视频复刻智能体（口播数字人）。设计规格见 docs/superpowers/specs/。

## 本地运行（阶段 1）
见 docs/runbook.md
```

- [ ] **Step 2: 写 pyproject.toml**

```toml
[project]
name = "visioncube-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "sqlalchemy>=2.0",
    "pydantic>=2.8",
    "pydantic-settings>=2.4",
    "arq>=0.26",
    "redis>=5.0",
    "httpx>=0.27",
    "python-jose[cryptography]>=3.3",
    "passlib[bcrypt]>=1.7",
    "sse-starlette>=2.1",
    "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = ["pytest>=8.3", "pytest-asyncio>=0.24", "ruff>=0.6"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"
```

- [ ] **Step 3: 安装依赖并验证**

```powershell
cd backend
uv venv .venv
uv pip install -e ".[dev]"
python -c "import fastapi, sqlalchemy, arq; print('deps ok')"
```
Expected: `deps ok`

- [ ] **Step 4: 写 .env.example**

```
DATABASE_URL=sqlite:///./data/visioncube.db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change-me-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
```

- [ ] **Step 5: Commit**

```powershell
git add .gitignore README.md backend/pyproject.toml backend/.env.example
git commit -m "chore: backend scaffold with dependencies"
```

---

### Task 2: 配置与数据库基础

**Files:**
- Create: `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/models/base.py`
- Test: `backend/tests/conftest.py`, `backend/tests/test_core.py`

- [ ] **Step 1: 写失败测试 `tests/test_core.py`**

```python
from app.core.config import Settings
from app.core.database import get_engine


def test_settings_defaults():
    s = Settings(_env_file=None)
    assert s.database_url.startswith("sqlite")
    assert s.jwt_secret != ""


def test_engine_creates_sqlite(tmp_path):
    engine = get_engine(f"sqlite:///{tmp_path/'t.db'}")
    assert engine.url.database.endswith("t.db")
    engine.dispose()
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_core.py -v`
Expected: FAIL（ModuleNotFoundError: app.core.config）

- [ ] **Step 3: 实现 config / database / base**

`app/core/config.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/visioncube.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    data_root: str = "./data"
    admin_username: str = "admin"
    admin_password: str = "admin-dev-password"


settings = Settings()
```

`app/core/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.base import Base


def get_engine(database_url: str):
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args)


engine = None  # 由 init_db 初始化
SessionLocal = None


def init_db(database_url: str):
    global engine, SessionLocal
    engine = get_engine(database_url)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

`app/models/base.py`:
```python
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_core.py -v`
Expected: PASS ×2

- [ ] **Step 5: 建立 conftest（内存数据库 + 全 Mock Provider，后续任务复用）**

`backend/tests/conftest.py`:
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import database
from app.models.base import Base


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # 内存库跨连接共享，避免后续 session 拿不到表
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    database.SessionLocal = TestingSession
    database.engine = engine
    session = TestingSession()
    yield session
    session.close()
    engine.dispose()
```

- [ ] **Step 6: Commit**

```powershell
git add backend/app/core backend/app/models/base.py backend/tests
git commit -m "feat: settings, database bootstrap and test fixtures"
```

---

### Task 3: 数据模型（6 张表）

**Files:**
- Create: `backend/app/models/user.py`, `task.py`, `script.py`, `asset.py`, `video_file.py`, `stage_log.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: 写失败测试**

```python
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.video_file import VideoFile
from app.models.stage_log import StageLog


def test_create_task_with_relations(db_session):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()

    task = Task(
        user_id=user.id,
        source_url="https://v.douyin.com/abc",
        target_industry="美妆",
        product_brief="某粉底液，持妆 12 小时",
        status=TaskStatus.PENDING,
    )
    db_session.add(task)
    db_session.flush()

    vf = VideoFile(user_id=user.id, task_id=task.id, kind="source_video",
                   path="data/1/t1/source.mp4", size_bytes=1024)
    log = StageLog(task_id=task.id, stage="PARSING", status="success", detail="{}")
    db_session.add_all([vf, log])
    db_session.commit()

    assert task.id is not None
    assert task.user_id == user.id
    assert vf.task_id == task.id
    assert log.task_id == task.id
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_models.py -v`
Expected: FAIL（ModuleNotFoundError）

- [ ] **Step 3: 实现六个模型**

`app/models/user.py`:
```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(128))
```

`app/models/task.py`:
```python
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
    selected_cover_id: Mapped[int | None] = mapped_column(
        ForeignKey("video_files.id"), nullable=True
    )
    moderation_retry_count: Mapped[int] = mapped_column(default=0)
```

`app/models/script.py`:
```python
from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Script(Base, TimestampMixin):
    __tablename__ = "scripts"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    kind: Mapped[str] = mapped_column(default="rewrite")  # original | rewrite | final
    content: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
```

`app/models/asset.py`:
```python
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # avatar | voice | bgm
    name: Mapped[str] = mapped_column(String(128))
    provider_ref: Mapped[str] = mapped_column(String(128))  # 供应商侧资产 ID
```

`app/models/video_file.py`:
```python
from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class VideoFile(Base, TimestampMixin):
    __tablename__ = "video_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(32))  # source_video|audio|avatar_video|final|cover
    stage: Mapped[str | None] = mapped_column(String(32), nullable=True)
    path: Mapped[str] = mapped_column(String(512))
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    duration_sec: Mapped[float | None] = mapped_column(nullable=True)
```

`app/models/stage_log.py`:
```python
from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class StageLog(Base, TimestampMixin):
    __tablename__ = "stage_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    stage: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16))  # started | success | failed
    detail: Mapped[str] = mapped_column(Text, default="{}")
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_models.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add backend/app/models backend/tests/test_models.py
git commit -m "feat: data models for users/tasks/scripts/assets/files/logs"
```

---

### Task 4: 安全模块（JWT + 密码哈希）

**Files:**
- Create: `backend/app/core/security.py`
- Test: `backend/tests/test_security.py`

- [ ] **Step 1: 写失败测试**

```python
import pytest

from app.core.security import create_access_token, decode_token, hash_password, verify_password


def test_password_roundtrip():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_token_roundtrip():
    token = create_access_token(subject="admin")
    payload = decode_token(token)
    assert payload["sub"] == "admin"


def test_decode_invalid_token():
    with pytest.raises(ValueError):
        decode_token("garbage.token.value")
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_security.py -v`
Expected: FAIL

- [ ] **Step 3: 实现**

```python
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": subject, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("invalid token") from exc
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_security.py -v`
Expected: PASS ×3

- [ ] **Step 5: Commit**

```powershell
git add backend/app/core/security.py backend/tests/test_security.py
git commit -m "feat: JWT token and password hashing"
```

---

### Task 5: 错误分级体系

**Files:**
- Create: `backend/app/core/exceptions.py`
- Test: `backend/tests/test_exceptions.py`

- [ ] **Step 1: 写失败测试**

```python
from app.core.exceptions import (
    FatalPipelineError,
    PipelineError,
    RecoverablePipelineError,
    TransientPipelineError,
    classify_http_status,
)


def test_error_hierarchy():
    for cls in (TransientPipelineError, RecoverablePipelineError, FatalPipelineError):
        assert issubclass(cls, PipelineError)


def test_error_fields():
    err = RecoverablePipelineError(code="ASR_NO_SPEECH", message="未检测到人声")
    assert err.code == "ASR_NO_SPEECH"
    assert str(err) == "未检测到人声"


def test_classify_http_status():
    assert classify_http_status(429) is TransientPipelineError
    assert classify_http_status(503) is TransientPipelineError
    assert classify_http_status(402) is FatalPipelineError
    assert classify_http_status(400) is RecoverablePipelineError
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_exceptions.py -v`
Expected: FAIL

- [ ] **Step 3: 实现**

```python
class PipelineError(Exception):
    """流水线阶段错误基类。code 用于前端展示与日志检索。"""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class TransientPipelineError(PipelineError):
    """瞬时错误：超时/限流/5xx，阶段内指数退避自动重试。"""


class RecoverablePipelineError(PipelineError):
    """可恢复错误：任务置 FAILED，可从失败阶段重试。"""


class FatalPipelineError(PipelineError):
    """致命错误：输入无效/凭证失效，禁止盲目重试。"""


def classify_http_status(status: int) -> type[PipelineError]:
    if status in (429, 500, 502, 503, 504):
        return TransientPipelineError
    if status in (401, 402, 403):
        return FatalPipelineError
    return RecoverablePipelineError
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_exceptions.py -v`
Expected: PASS ×3

- [ ] **Step 5: Commit**

```powershell
git add backend/app/core/exceptions.py backend/tests/test_exceptions.py
git commit -m "feat: pipeline error taxonomy with http status classification"
```

---

### Task 6: 状态机（白名单转移）

**Files:**
- Create: `backend/app/pipeline/__init__.py`, `backend/app/pipeline/state_machine.py`
- Test: `backend/tests/test_state_machine.py`

- [ ] **Step 1: 写失败测试**

```python
import pytest

from app.models.task import TaskStatus
from app.pipeline.state_machine import (
    PAUSE_STATES,
    TERMINAL_STATES,
    assert_transition,
    next_stage,
)


def test_happy_path_chain():
    chain = [
        (TaskStatus.PENDING, TaskStatus.PARSING),
        (TaskStatus.PARSING, TaskStatus.TRANSCRIBING),
        (TaskStatus.TRANSCRIBING, TaskStatus.ANALYZING),
        (TaskStatus.ANALYZING, TaskStatus.REWRITING),
        (TaskStatus.REWRITING, TaskStatus.AWAITING_SCRIPT),
        (TaskStatus.AWAITING_SCRIPT, TaskStatus.MODERATING_TEXT),
        (TaskStatus.MODERATING_TEXT, TaskStatus.SYNTHESIZING),
        (TaskStatus.SYNTHESIZING, TaskStatus.GENERATING_AVATAR),
        (TaskStatus.GENERATING_AVATAR, TaskStatus.COMPOSING),
        (TaskStatus.COMPOSING, TaskStatus.GENERATING_COVER),
        (TaskStatus.GENERATING_COVER, TaskStatus.MODERATING_VIDEO),
        (TaskStatus.MODERATING_VIDEO, TaskStatus.REVIEW),
        (TaskStatus.REVIEW, TaskStatus.COMPLETED),
    ]
    for src, dst in chain:
        assert_transition(src, dst)  # 不抛异常即合法


def test_special_edges():
    assert_transition(TaskStatus.AWAITING_SCRIPT, TaskStatus.REWRITING)  # 重新生成
    assert_transition(TaskStatus.MODERATING_TEXT, TaskStatus.REWRITING)  # 审核整改回路
    assert_transition(TaskStatus.REVIEW, TaskStatus.COMPOSING)           # 字幕重剪


def test_any_state_can_fail():
    for s in TaskStatus:
        if s not in TERMINAL_STATES:
            assert_transition(s, TaskStatus.FAILED)


def test_illegal_transition_raises():
    with pytest.raises(ValueError):
        assert_transition(TaskStatus.PENDING, TaskStatus.COMPOSING)
    with pytest.raises(ValueError):
        assert_transition(TaskStatus.COMPLETED, TaskStatus.PARSING)


def test_next_stage():
    assert next_stage(TaskStatus.PENDING) == TaskStatus.PARSING
    assert next_stage(TaskStatus.MODERATING_VIDEO) == TaskStatus.REVIEW
    assert next_stage(TaskStatus.COMPLETED) is None


def test_pause_states():
    assert TaskStatus.AWAITING_SCRIPT in PAUSE_STATES
    assert TaskStatus.REVIEW in PAUSE_STATES
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_state_machine.py -v`
Expected: FAIL

- [ ] **Step 3: 实现**

```python
from app.models.task import TaskStatus

TERMINAL_STATES = {TaskStatus.COMPLETED, TaskStatus.FAILED}
PAUSE_STATES = {TaskStatus.AWAITING_SCRIPT, TaskStatus.REVIEW}

# 白名单：主链 + 特殊边（重新生成 / 审核整改 / 重剪）
_ALLOWED: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.PENDING: {TaskStatus.PARSING},
    TaskStatus.PARSING: {TaskStatus.TRANSCRIBING},
    TaskStatus.TRANSCRIBING: {TaskStatus.ANALYZING},
    TaskStatus.ANALYZING: {TaskStatus.REWRITING},
    TaskStatus.REWRITING: {TaskStatus.AWAITING_SCRIPT},
    TaskStatus.AWAITING_SCRIPT: {TaskStatus.MODERATING_TEXT, TaskStatus.REWRITING},
    TaskStatus.MODERATING_TEXT: {TaskStatus.SYNTHESIZING, TaskStatus.REWRITING},
    TaskStatus.SYNTHESIZING: {TaskStatus.GENERATING_AVATAR},
    TaskStatus.GENERATING_AVATAR: {TaskStatus.COMPOSING},
    TaskStatus.COMPOSING: {TaskStatus.GENERATING_COVER},
    TaskStatus.GENERATING_COVER: {TaskStatus.MODERATING_VIDEO},
    TaskStatus.MODERATING_VIDEO: {TaskStatus.REVIEW},
    TaskStatus.REVIEW: {TaskStatus.COMPLETED, TaskStatus.COMPOSING},
}

# 顺序主链（供 runner 推进）
_MAIN_CHAIN: list[TaskStatus] = [
    TaskStatus.PENDING, TaskStatus.PARSING, TaskStatus.TRANSCRIBING,
    TaskStatus.ANALYZING, TaskStatus.REWRITING, TaskStatus.AWAITING_SCRIPT,
    TaskStatus.MODERATING_TEXT, TaskStatus.SYNTHESIZING, TaskStatus.GENERATING_AVATAR,
    TaskStatus.COMPOSING, TaskStatus.GENERATING_COVER, TaskStatus.MODERATING_VIDEO,
    TaskStatus.REVIEW, TaskStatus.COMPLETED,
]


def assert_transition(src: TaskStatus, dst: TaskStatus) -> None:
    if dst == TaskStatus.FAILED and src not in TERMINAL_STATES:
        return
    if dst in _ALLOWED.get(src, set()):
        return
    raise ValueError(f"illegal state transition: {src.value} -> {dst.value}")


def next_stage(current: TaskStatus) -> TaskStatus | None:
    idx = _MAIN_CHAIN.index(current)
    return _MAIN_CHAIN[idx + 1] if idx + 1 < len(_MAIN_CHAIN) else None
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_state_machine.py -v`
Expected: PASS ×6

- [ ] **Step 5: Commit**

```powershell
git add backend/app/pipeline backend/tests/test_state_machine.py
git commit -m "feat: pipeline state machine with whitelisted transitions"
```

---

### Task 7: Provider 抽象接口与数据结构

**Files:**
- Create: `backend/app/providers/__init__.py`, `backend/app/providers/base.py`
- Test: `backend/tests/test_providers_base.py`

- [ ] **Step 1: 写失败测试**

```python
from app.providers.base import (
    AsrProvider,
    DigitalHumanProvider,
    LlmProvider,
    MockAsr,
    ModerationProvider,
    ParseResult,
    Sentence,
    TtsProvider,
    VideoParseProvider,
)


def test_parse_result_shape():
    r = ParseResult(title="t", cover_url="u", video_url="v", duration_sec=10.0, meta={})
    assert r.duration_sec == 10.0


def test_sentence_shape():
    s = Sentence(text="你好", start=0.0, end=1.2)
    assert s.duration == 1.2


def test_mock_asr_implements_protocol():
    assert isinstance(MockAsr(), AsrProvider)


def test_all_protocols_defined():
    for proto in (VideoParseProvider, AsrProvider, LlmProvider, TtsProvider,
                  DigitalHumanProvider, ModerationProvider):
        assert hasattr(proto, "__protocol_attrs__") or hasattr(proto, "__abstractmethods__") \
            or proto is not None
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_providers_base.py -v`
Expected: FAIL（ModuleNotFoundError）

- [ ] **Step 3: 实现 base.py**

```python
"""六类能力的抽象接口。上层（pipeline/stages）只依赖这里定义的类型。"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol


@dataclass
class ParseResult:
    title: str
    cover_url: str
    video_url: str
    duration_sec: float
    meta: dict = field(default_factory=dict)


@dataclass
class Sentence:
    text: str
    start: float  # 秒
    end: float

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class StructureAnalysis:
    hook: str
    pain_points: list[str]
    arguments: list[str]
    conversion: str
    style_notes: str  # 语速/停顿/情绪风格描述


@dataclass
class ModerationResult:
    passed: bool
    violations: list[str] = field(default_factory=list)


@dataclass
class TtsResult:
    audio_path: Path
    sentences: list[Sentence]


@dataclass
class AvatarJob:
    job_id: str
    finished: bool
    video_path: Path | None = None


class VideoParseProvider(Protocol):
    def parse(self, url: str) -> ParseResult: ...
    def download(self, parse_result: ParseResult, dest_dir: Path) -> Path: ...


class AsrProvider(Protocol):
    def transcribe(self, audio_path: Path) -> list[Sentence]: ...


class LlmProvider(Protocol):
    def complete(self, prompt: str, *, json_mode: bool = False) -> str: ...


class TtsProvider(Protocol):
    def synthesize(self, text: str, voice_id: str | None, dest_dir: Path) -> TtsResult: ...


class DigitalHumanProvider(Protocol):
    def submit(self, audio_path: Path, avatar_id: str | None) -> AvatarJob: ...
    def poll(self, job: AvatarJob, dest_dir: Path) -> AvatarJob: ...


class ModerationProvider(Protocol):
    def moderate_text(self, text: str) -> ModerationResult: ...
    def moderate_video(self, video_path: Path) -> ModerationResult: ...
```

同时在 `base.py` 末尾附一个最小 `MockAsr`（仅为测试 protocol 断言）：

```python
class MockAsr:
    def transcribe(self, audio_path: Path) -> list[Sentence]:
        return [Sentence(text="mock", start=0.0, end=1.0)]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_providers_base.py -v`
Expected: PASS ×4

- [ ] **Step 5: Commit**

```powershell
git add backend/app/providers backend/tests/test_providers_base.py
git commit -m "feat: provider protocols and shared data structures"
```

---

### Task 8: Mock Provider 全家桶 + Registry

**Files:**
- Create: `backend/app/providers/mock.py`, `backend/app/providers/registry.py`
- Test: `backend/tests/test_providers_mock.py`

- [ ] **Step 1: 写失败测试**

```python
from pathlib import Path

from app.providers.mock import (
    MockAsr, MockDigitalHuman, MockLlm, MockModeration, MockParse, MockTts,
)
from app.providers.registry import ProviderBundle, build_mock_bundle


def test_mock_parse_and_download(tmp_path):
    p = MockParse()
    r = p.parse("https://v.douyin.com/x")
    assert r.title
    local = p.download(r, tmp_path)
    assert local.exists() and local.name == "source.mp4"


def test_mock_asr_returns_sentences(tmp_path):
    f = tmp_path / "a.wav"
    f.write_bytes(b"x")
    out = MockAsr().transcribe(f)
    assert len(out) >= 2 and out[0].end > out[0].start


def test_mock_llm_json_mode():
    out = MockLlm().complete("p", json_mode=True)
    assert out.lstrip().startswith("{")


def test_mock_tts_writes_audio(tmp_path):
    r = MockTts().synthesize("你好世界", None, tmp_path)
    assert r.audio_path.exists()
    assert sum(s.duration for s in r.sentences) > 0


def test_mock_digital_human_submit_then_poll(tmp_path):
    dh = MockDigitalHuman()
    job = dh.submit(tmp_path / "a.mp3", None)
    assert not job.finished
    job = dh.poll(job, tmp_path)
    assert job.finished and job.video_path and job.video_path.exists()


def test_mock_moderation_passes():
    assert MockModeration().moderate_text("任意文本").passed


def test_bundle():
    b = build_mock_bundle()
    assert isinstance(b, ProviderBundle)
    assert b.parse is not None and b.moderation is not None
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_providers_mock.py -v`
Expected: FAIL

- [ ] **Step 3: 实现 mock.py**

```python
"""全 Mock 实现：阶段 1 不依赖任何外部服务即可端到端跑通。"""
import json
import shutil
from pathlib import Path

from app.providers.base import (
    AvatarJob, ModerationResult, ParseResult, Sentence, TtsResult,
)

_SAMPLE_SCRIPT = "你知道吗，这个问题困扰了百分之九十的人。其实解决方案很简单。第一步，明确目标。第二步，立即行动。现在就试试吧。"


class MockParse:
    def parse(self, url: str) -> ParseResult:
        return ParseResult(
            title="Mock 爆款视频", cover_url="https://example.com/cover.jpg",
            video_url="https://example.com/video.mp4", duration_sec=10.0,
            meta={"likes": 100000, "source_url": url},
        )

    def download(self, parse_result: ParseResult, dest_dir: Path) -> Path:
        dest_dir.mkdir(parents=True, exist_ok=True)
        out = dest_dir / "source.mp4"
        out.write_bytes(b"MOCK-VIDEO-BYTES")
        return out


class MockAsr:
    def transcribe(self, audio_path: Path) -> list[Sentence]:
        parts = _SAMPLE_SCRIPT.replace("。", "。|").split("|")[:-1]
        sentences, t = [], 0.0
        for p in parts:
            dur = max(1.0, len(p) * 0.25)
            sentences.append(Sentence(text=p, start=t, end=t + dur))
            t += dur
        return sentences


class MockLlm:
    def complete(self, prompt: str, *, json_mode: bool = False) -> str:
        if "爆款结构" in prompt or "structure" in prompt.lower():
            return json.dumps({
                "hook": "提问开场", "pain_points": ["效率低"],
                "arguments": ["方法简单"], "conversion": "行动号召",
                "style_notes": "语速快、情绪饱满",
            }, ensure_ascii=False)
        if json_mode:
            return json.dumps({"scripts": [_SAMPLE_SCRIPT, _SAMPLE_SCRIPT + "变体二"]},
                              ensure_ascii=False)
        return _SAMPLE_SCRIPT


class MockTts:
    def synthesize(self, text: str, voice_id: str | None, dest_dir: Path) -> TtsResult:
        dest_dir.mkdir(parents=True, exist_ok=True)
        audio = dest_dir / "voice.mp3"
        audio.write_bytes(b"MOCK-AUDIO-BYTES")
        parts = [p for p in text.replace("。", "。|").split("|") if p]
        sentences, t = [], 0.0
        for p in parts:
            dur = max(1.0, len(p) * 0.25)
            sentences.append(Sentence(text=p, start=t, end=t + dur))
            t += dur
        return TtsResult(audio_path=audio, sentences=sentences)


class MockDigitalHuman:
    def submit(self, audio_path: Path, avatar_id: str | None) -> AvatarJob:
        return AvatarJob(job_id="mock-job-1", finished=False)

    def poll(self, job: AvatarJob, dest_dir: Path) -> AvatarJob:
        dest_dir.mkdir(parents=True, exist_ok=True)
        video = dest_dir / "avatar.mp4"
        video.write_bytes(b"MOCK-AVATAR-VIDEO")
        return AvatarJob(job_id=job.job_id, finished=True, video_path=video)


class MockModeration:
    def moderate_text(self, text: str) -> ModerationResult:
        return ModerationResult(passed=True)

    def moderate_video(self, video_path: Path) -> ModerationResult:
        return ModerationResult(passed=True)
```

`registry.py`：

```python
from dataclasses import dataclass

from app.providers import mock
from app.providers.base import (
    AsrProvider, DigitalHumanProvider, LlmProvider, ModerationProvider,
    TtsProvider, VideoParseProvider,
)


@dataclass
class ProviderBundle:
    parse: VideoParseProvider
    asr: AsrProvider
    llm: LlmProvider
    tts: TtsProvider
    digital_human: DigitalHumanProvider
    moderation: ModerationProvider


def build_mock_bundle() -> ProviderBundle:
    return ProviderBundle(
        parse=mock.MockParse(), asr=mock.MockAsr(), llm=mock.MockLlm(),
        tts=mock.MockTts(), digital_human=mock.MockDigitalHuman(),
        moderation=mock.MockModeration(),
    )
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_providers_mock.py -v`
Expected: PASS ×7

- [ ] **Step 5: Commit**

```powershell
git add backend/app/providers backend/tests/test_providers_mock.py
git commit -m "feat: mock providers and registry bundle"
```

---

### Task 9: 阶段处理器（10 个 stage + registry）

**Files:**
- Create: `backend/app/pipeline/stages/__init__.py`, `parse.py`, `transcribe.py`, `analyze.py`, `rewrite.py`, `moderate_text.py`, `synthesize.py`, `avatar.py`, `compose.py`, `cover.py`, `moderate_video.py`
- Test: `backend/tests/test_stages.py`

阶段处理器统一契约：

```python
class StageContext:
    """由 runner 构造，携带 db session、task、ProviderBundle、任务目录。"""
    db: Session
    task: Task
    bundle: ProviderBundle
    task_dir: Path

def run(ctx: StageContext) -> None:  # 每个 stage 模块暴露 run()
```

- [ ] **Step 1: 写失败测试（覆盖关键阶段行为）**

```python
from pathlib import Path

import pytest

from app.models.script import Script
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.video_file import VideoFile
from app.pipeline.stages import StageContext, STAGE_RUNNERS
from app.models.task import TaskStatus as TS
from app.providers.registry import build_mock_bundle


@pytest.fixture()
def ctx(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    task = Task(user_id=user.id, source_url="https://v.douyin.com/x",
                status=TS.PENDING)
    db_session.add(task)
    db_session.flush()
    return StageContext(db=db_session, task=task, bundle=build_mock_bundle(),
                        task_dir=tmp_path / str(task.id))


def test_all_stages_registered():
    for s in (TS.PARSING, TS.TRANSCRIBING, TS.ANALYZING, TS.REWRITING,
              TS.MODERATING_TEXT, TS.SYNTHESIZING, TS.GENERATING_AVATAR,
              TS.COMPOSING, TS.GENERATING_COVER, TS.MODERATING_VIDEO):
        assert s in STAGE_RUNNERS


def test_parse_stage_registers_source_video(ctx):
    STAGE_RUNNERS[TS.PARSING](ctx)
    ctx.db.flush()
    files = ctx.db.query(VideoFile).filter_by(task_id=ctx.task.id).all()
    assert any(f.kind == "source_video" for f in files)
    assert (ctx.task_dir / "source.mp4").exists()


def test_rewrite_stage_creates_versions(ctx):
    for s in (TS.PARSING, TS.TRANSCRIBING, TS.ANALYZING):
        STAGE_RUNNERS[s](ctx)
    STAGE_RUNNERS[TS.REWRITING](ctx)
    ctx.db.flush()
    scripts = ctx.db.query(Script).filter_by(task_id=ctx.task.id, kind="rewrite").all()
    assert len(scripts) >= 1


def test_full_mock_chain_produces_final_and_covers(ctx):
    order = [TS.PARSING, TS.TRANSCRIBING, TS.ANALYZING, TS.REWRITING]
    for s in order:
        STAGE_RUNNERS[s](ctx)
    # 模拟人工确认：标记第一版为 final
    script = ctx.db.query(Script).filter_by(task_id=ctx.task.id, kind="rewrite").first()
    script.kind = "final"
    script.is_confirmed = True
    ctx.db.flush()
    for s in (TS.MODERATING_TEXT, TS.SYNTHESIZING, TS.GENERATING_AVATAR,
              TS.COMPOSING, TS.GENERATING_COVER, TS.MODERATING_VIDEO):
        STAGE_RUNNERS[s](ctx)
    ctx.db.flush()
    kinds = {f.kind for f in ctx.db.query(VideoFile).filter_by(task_id=ctx.task.id)}
    assert {"source_video", "audio", "avatar_video", "final", "cover"} <= kinds
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_stages.py -v`
Expected: FAIL

- [ ] **Step 3: 实现各 stage 模块**

`stages/__init__.py`：

```python
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.task import Task, TaskStatus
from app.providers.registry import ProviderBundle
from app.pipeline.stages import (
    analyze, avatar, compose, cover, moderate_text, moderate_video,
    parse, rewrite, synthesize, transcribe,
)


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
    TaskStatus.MODERATING_TEXT: moderate_text.run,
    TaskStatus.SYNTHESIZING: synthesize.run,
    TaskStatus.GENERATING_AVATAR: avatar.run,
    TaskStatus.COMPOSING: compose.run,
    TaskStatus.GENERATING_COVER: cover.run,
    TaskStatus.MODERATING_VIDEO: moderate_video.run,
}
```

`stages/_util.py`（产物登记，所有 stage 共用）：

```python
import os
from pathlib import Path

from app.models.video_file import VideoFile


def register_file(ctx, path: Path, kind: str, stage: str) -> VideoFile:
    """原子登记：临时文件改名后入库（阶段 1 Mock 直接写终态名，仍走此入口）。"""
    vf = VideoFile(
        user_id=ctx.task.user_id, task_id=ctx.task.id, kind=kind, stage=stage,
        path=str(path), size_bytes=os.path.getsize(path) if path.exists() else None,
    )
    ctx.db.add(vf)
    ctx.db.flush()
    return vf


def latest_file(ctx, kind: str) -> Path | None:
    vf = (ctx.db.query(VideoFile)
          .filter_by(task_id=ctx.task.id, kind=kind)
          .order_by(VideoFile.id.desc()).first())
    return Path(vf.path) if vf else None
```

`stages/parse.py`：

```python
from app.pipeline.stages._util import register_file


def run(ctx) -> None:
    result = ctx.bundle.parse.parse(ctx.task.source_url)
    ctx.task_dir.mkdir(parents=True, exist_ok=True)
    local = ctx.bundle.parse.download(result, ctx.task_dir)
    register_file(ctx, local, "source_video", "PARSING")
```

`stages/transcribe.py`：

```python
import json

from app.pipeline.stages._util import latest_file


def run(ctx) -> None:
    source = latest_file(ctx, "source_video")
    sentences = ctx.bundle.asr.transcribe(source)
    out = ctx.task_dir / "transcript.json"
    out.write_text(json.dumps(
        [{"text": s.text, "start": s.start, "end": s.end} for s in sentences],
        ensure_ascii=False), encoding="utf-8")
```

`stages/analyze.py`：

```python
import json


def run(ctx) -> None:
    transcript = (ctx.task_dir / "transcript.json").read_text(encoding="utf-8")
    prompt = f"请分析以下爆款短视频文案的爆款结构：\n{transcript}"
    raw = ctx.bundle.llm.complete(prompt, json_mode=True)
    (ctx.task_dir / "structure.json").write_text(raw, encoding="utf-8")
```

`stages/rewrite.py`：

```python
import json

from app.models.script import Script


def run(ctx) -> None:
    transcript = (ctx.task_dir / "transcript.json").read_text(encoding="utf-8")
    structure = (ctx.task_dir / "structure.json").read_text(encoding="utf-8")
    prompt = (
        f"保留爆款结构并迁移到目标行业。原文案：{transcript}\n结构分析：{structure}\n"
        f"目标行业：{ctx.task.target_industry or '通用'}\n产品卖点：{ctx.task.product_brief or '无'}\n"
        f"输出 1-3 版改写脚本，JSON：{{\"scripts\": [...]}}"
    )
    raw = ctx.bundle.llm.complete(prompt, json_mode=True)
    data = json.loads(raw)
    existing = ctx.db.query(Script).filter_by(task_id=ctx.task.id, kind="rewrite").count()
    for i, text in enumerate(data.get("scripts", [])[:3]):
        ctx.db.add(Script(task_id=ctx.task.id, kind="rewrite",
                          content=text, version=existing + i + 1))
    ctx.db.flush()
```

`stages/moderate_text.py`：

```python
from app.core.exceptions import RecoverablePipelineError
from app.models.script import Script


def run(ctx) -> None:
    final = ctx.db.query(Script).filter_by(
        task_id=ctx.task.id, is_confirmed=True).order_by(Script.id.desc()).first()
    if final is None:
        raise RecoverablePipelineError("NO_CONFIRMED_SCRIPT", "缺少已确认脚本")
    result = ctx.bundle.moderation.moderate_text(final.content)
    if not result.passed:
        # 整改回路由 runner/API 层处理；此处抛出供其捕获
        raise RecoverablePipelineError(
            "TEXT_MODERATION_FAILED", "；".join(result.violations) or "文本审核未通过")
```

`stages/synthesize.py`：

```python
from app.models.script import Script
from app.pipeline.stages._util import register_file
import json


def run(ctx) -> None:
    final = ctx.db.query(Script).filter_by(
        task_id=ctx.task.id, is_confirmed=True).order_by(Script.id.desc()).first()
    tts = ctx.bundle.tts.synthesize(final.content, ctx.task.voice_id, ctx.task_dir)
    register_file(ctx, tts.audio_path, "audio", "SYNTHESIZING")
    (ctx.task_dir / "tts_sentences.json").write_text(json.dumps(
        [{"text": s.text, "start": s.start, "end": s.end} for s in tts.sentences],
        ensure_ascii=False), encoding="utf-8")
```

`stages/avatar.py`：

```python
from app.pipeline.stages._util import latest_file, register_file


def run(ctx) -> None:
    audio = latest_file(ctx, "audio")
    job = ctx.bundle.digital_human.submit(audio, ctx.task.avatar_id)
    # Mock 下一次 poll 即完成；真实实现由 worker 延时轮询
    job = ctx.bundle.digital_human.poll(job, ctx.task_dir)
    if not job.finished or job.video_path is None:
        raise RuntimeError("avatar job not finished")  # runner 捕获转可恢复错误
    register_file(ctx, job.video_path, "avatar_video", "GENERATING_AVATAR")
```

`stages/compose.py`（阶段 1 Mock：拷贝 avatar 视频为成片，不依赖 FFmpeg）：

```python
import shutil

from app.core.exceptions import RecoverablePipelineError
from app.pipeline.stages._util import latest_file, register_file


def run(ctx) -> None:
    avatar_video = latest_file(ctx, "avatar_video")
    if avatar_video is None:
        raise RecoverablePipelineError("NO_AVATAR_VIDEO", "缺少数字人视频")
    final = ctx.task_dir / "final.mp4"
    shutil.copyfile(avatar_video, final)
    register_file(ctx, final, "final", "COMPOSING")
    # 阶段 2 接入 FFmpeg：ASS 字幕烧录（subtitle_style）+ BGM 混音 + 9:16 输出
```

`stages/cover.py`（阶段 1 Mock：写占位封面文件）：

```python
from app.pipeline.stages._util import latest_file, register_file


def run(ctx) -> None:
    final_video = latest_file(ctx, "final")
    if final_video is None:
        from app.core.exceptions import RecoverablePipelineError
        raise RecoverablePipelineError("NO_FINAL_VIDEO", "缺少成片")
    for i in range(3):
        cover = ctx.task_dir / f"cover_{i}.jpg"
        cover.write_bytes(b"MOCK-COVER")
        register_file(ctx, cover, "cover", "GENERATING_COVER")
    # 阶段 3 接入：FFmpeg 抽帧 + LLM 标题 + Pillow 合成
```

`stages/moderate_video.py`：

```python
from app.core.exceptions import RecoverablePipelineError
from app.pipeline.stages._util import latest_file


def run(ctx) -> None:
    final_video = latest_file(ctx, "final")
    result = ctx.bundle.moderation.moderate_video(final_video)
    if not result.passed:
        raise RecoverablePipelineError(
            "VIDEO_MODERATION_FAILED", "；".join(result.violations) or "成片审核未通过")
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_stages.py -v`
Expected: PASS ×4

- [ ] **Step 5: Commit**

```powershell
git add backend/app/pipeline/stages backend/tests/test_stages.py
git commit -m "feat: ten pipeline stage handlers with mock backends"
```

---

### Task 10: 流水线执行器 Runner（转移、日志、失败、幂等）

**Files:**
- Create: `backend/app/pipeline/runner.py`
- Test: `backend/tests/test_runner.py`

职责：从任务当前状态推进状态机；每阶段执行前后写 StageLog 并转移状态；捕获 PipelineError 按分级处理（Transient 重试由真实 Provider 内部完成，阶段 1 不实现退避）；FAILED 时记录 failed_stage/error_code；支持从 FAILED 状态恢复（resume）。人工暂停点：转移到 PAUSE_STATES 后返回，不再继续。

- [ ] **Step 1: 写失败测试**

```python
import pytest

from app.models.stage_log import StageLog
from app.models.task import Task, TaskStatus as TS
from app.models.user import User
from app.pipeline.runner import PipelineRunner
from app.providers.registry import build_mock_bundle


@pytest.fixture()
def task(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    t = Task(user_id=user.id, source_url="https://v.douyin.com/x", status=TS.PENDING)
    db_session.add(t)
    db_session.flush()
    return t


def test_run_until_first_pause(db_session, task, tmp_path):
    runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
    runner.run_until_pause(db_session, task)
    assert task.status == TS.AWAITING_SCRIPT
    logs = db_session.query(StageLog).filter_by(task_id=task.id).all()
    assert any(l.stage == TS.PARSING.value and l.status == "success" for l in logs)


def test_resume_after_confirm_runs_to_review(db_session, task, tmp_path):
    from app.models.script import Script
    runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
    runner.run_until_pause(db_session, task)
    # 模拟确认脚本
    s = db_session.query(Script).filter_by(task_id=task.id, kind="rewrite").first()
    s.is_confirmed = True
    task.status = TS.MODERATING_TEXT  # 确认 API 负责置位
    db_session.flush()
    runner.run_until_pause(db_session, task)
    assert task.status == TS.REVIEW


def test_failure_marks_stage_and_can_resume(db_session, task, tmp_path):
    from app.core.exceptions import RecoverablePipelineError
    from app.pipeline.stages import STAGE_RUNNERS

    def boom(ctx):
        raise RecoverablePipelineError("PARSE_EMPTY", "解析返回空")

    # STAGE_RUNNERS 持有的是函数引用，直接替换注册表条目才能生效
    original = STAGE_RUNNERS[TS.PARSING]
    STAGE_RUNNERS[TS.PARSING] = boom
    try:
        runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
        runner.run_until_pause(db_session, task)
    finally:
        STAGE_RUNNERS[TS.PARSING] = original
    assert task.status == TS.FAILED
    assert task.failed_stage == TS.PARSING.value
    assert task.error_code == "PARSE_EMPTY"


def test_illegal_state_rejected(db_session, task, tmp_path):
    task.status = TS.COMPLETED
    db_session.flush()
    runner = PipelineRunner(build_mock_bundle(), data_root=tmp_path)
    runner.run_until_pause(db_session, task)  # 终态不执行
    assert task.status == TS.COMPLETED
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_runner.py -v`
Expected: FAIL

- [ ] **Step 3: 实现 runner.py**

```python
import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.exceptions import FatalPipelineError, PipelineError
from app.models.stage_log import StageLog
from app.models.task import Task, TaskStatus
from app.pipeline.state_machine import (
    PAUSE_STATES, TERMINAL_STATES, assert_transition, next_stage,
)
from app.pipeline.stages import STAGE_RUNNERS, StageContext
from app.providers.registry import ProviderBundle

logger = logging.getLogger(__name__)

MAX_STEPS_PER_RUN = 20  # 防御性上限，避免循环空转


class PipelineRunner:
    def __init__(self, bundle: ProviderBundle, data_root: str | Path):
        self.bundle = bundle
        self.data_root = Path(data_root)

    def task_dir(self, task: Task) -> Path:
        return self.data_root / str(task.user_id) / str(task.id)

    def run_until_pause(self, db: Session, task: Task) -> None:
        for _ in range(MAX_STEPS_PER_RUN):
            if task.status in TERMINAL_STATES or task.status in PAUSE_STATES:
                return
            stage = task.status if task.status in STAGE_RUNNERS else next_stage(task.status)
            if stage is None or stage not in STAGE_RUNNERS:
                # PENDING 等入口态：直接推进到下一阶段
                target = next_stage(task.status)
                if target is None:
                    return
                assert_transition(task.status, target)
                task.status = target
                db.flush()
                continue
            self._execute_stage(db, task, stage)
            db.commit()

    def _execute_stage(self, db: Session, task: Task, stage: TaskStatus) -> None:
        ctx = StageContext(db=db, task=task, bundle=self.bundle,
                           task_dir=self.task_dir(task))
        db.add(StageLog(task_id=task.id, stage=stage.value, status="started"))
        db.flush()
        try:
            STAGE_RUNNERS[stage](ctx)
        except PipelineError as exc:
            self._mark_failed(db, task, stage, exc.code, exc.message)
            return
        except Exception as exc:  # noqa: BLE001 未分类错误按可恢复处理
            logger.exception("stage %s crashed", stage)
            self._mark_failed(db, task, stage, "INTERNAL", str(exc))
            return
        db.add(StageLog(task_id=task.id, stage=stage.value, status="success",
                        detail=json.dumps({}, ensure_ascii=False)))
        target = next_stage(stage)
        assert target is not None
        assert_transition(stage, target)
        task.status = target
        db.flush()

    def _mark_failed(self, db, task, stage, code, message):
        db.add(StageLog(task_id=task.id, stage=stage.value, status="failed",
                        detail=json.dumps({"code": code}, ensure_ascii=False)))
        assert_transition(task.status, TaskStatus.FAILED)
        task.status = TaskStatus.FAILED
        task.failed_stage = stage.value
        task.error_code = code
        task.error_message = message
        db.flush()
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_runner.py -v`
Expected: PASS ×4

- [ ] **Step 5: Commit**

```powershell
git add backend/app/pipeline/runner.py backend/tests/test_runner.py
git commit -m "feat: pipeline runner with pause points, logs and failure marking"
```

---

### Task 11: Arq Worker（入队、执行、卡死扫描）

**Files:**
- Create: `backend/app/worker/settings.py`, `backend/app/worker/tasks.py`, `backend/app/worker/main.py`
- Test: `backend/tests/test_worker_tasks.py`（直接调用 job 函数，不依赖真实 Redis）

- [ ] **Step 1: 写失败测试**

```python
from app.models.task import Task, TaskStatus as TS
from app.models.user import User


async def test_run_pipeline_job_executes_to_pause(db_session, tmp_path, monkeypatch):
    from app.worker import tasks as worker_tasks

    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    task = Task(user_id=user.id, source_url="https://v.douyin.com/x", status=TS.PENDING)
    db_session.add(task)
    db_session.commit()

    monkeypatch.setattr(worker_tasks, "_make_runner",
                        lambda: _runner(tmp_path))
    await worker_tasks.run_pipeline({"db": db_session}, task_id=task.id)
    db_session.refresh(task)
    assert task.status == TS.AWAITING_SCRIPT


def _runner(tmp_path):
    from app.pipeline.runner import PipelineRunner
    from app.providers.registry import build_mock_bundle
    return PipelineRunner(build_mock_bundle(), data_root=tmp_path)


def test_scan_stuck_tasks_marks_failed(db_session):
    from app.worker.tasks import scan_stuck_tasks
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    stuck = Task(user_id=user.id, source_url="u", status=TS.GENERATING_AVATAR)
    done = Task(user_id=user.id, source_url="u", status=TS.COMPLETED)
    db_session.add_all([stuck, done])
    db_session.commit()
    n = scan_stuck_tasks(db_session)
    db_session.refresh(stuck)
    assert n == 1 and stuck.status == TS.FAILED and done.status == TS.COMPLETED
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_worker_tasks.py -v`
Expected: FAIL

- [ ] **Step 3: 实现 worker 三文件**

`worker/tasks.py`：

```python
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.task import Task, TaskStatus
from app.pipeline.runner import PipelineRunner
from app.pipeline.state_machine import TERMINAL_STATES, PAUSE_STATES
from app.providers.registry import build_mock_bundle

_NON_RECOVERABLE_ON_BOOT = (
    TaskStatus.PARSING, TaskStatus.TRANSCRIBING, TaskStatus.ANALYZING,
    TaskStatus.REWRITING, TaskStatus.MODERATING_TEXT, TaskStatus.SYNTHESIZING,
    TaskStatus.GENERATING_AVATAR, TaskStatus.COMPOSING,
    TaskStatus.GENERATING_COVER, TaskStatus.MODERATING_VIDEO,
)


def _make_runner() -> PipelineRunner:
    return PipelineRunner(build_mock_bundle(), data_root=settings.data_root)


async def run_pipeline(ctx: dict, task_id: int) -> None:
    db: Session = ctx.get("db") or SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None or task.status in TERMINAL_STATES or task.status in PAUSE_STATES:
            return
        runner = ctx.get("runner") or _make_runner()
        runner.run_until_pause(db, task)
        db.commit()
    finally:
        if "db" not in ctx:
            db.close()


def scan_stuck_tasks(db: Session) -> int:
    """worker 启动时：把卡在执行中态的任务标记 FAILED 待重试。"""
    stuck = db.query(Task).filter(Task.status.in_(_NON_RECOVERABLE_ON_BOOT)).all()
    for t in stuck:
        stage = t.status.value  # 先取原状态再置 FAILED
        t.status = TaskStatus.FAILED
        t.failed_stage = t.failed_stage or stage
        t.error_code = "WORKER_RESTART"
        t.error_message = "服务重启，任务中断，请重试"
    db.commit()
    return len(stuck)
```

`worker/settings.py`：

```python
from arq.connections import RedisSettings

from app.core.config import settings


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(settings.redis_url)
```

`worker/main.py`：

```python
from app.worker import tasks
from app.worker.settings import redis_settings


class WorkerSettings:
    redis_settings = redis_settings()
    functions = [tasks.run_pipeline]
    on_startup = None  # 真实启动入口在 runbook 说明：先 scan_stuck_tasks 再 arq worker
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_worker_tasks.py -v`
Expected: PASS ×2

- [ ] **Step 5: Commit**

```powershell
git add backend/app/worker backend/tests/test_worker_tasks.py
git commit -m "feat: arq worker jobs and stuck-task scanner"
```

---

### Task 12: API 依赖与认证端点

**Files:**
- Create: `backend/app/api/__init__.py`, `backend/app/api/deps.py`, `backend/app/api/auth.py`, `backend/app/schemas/__init__.py`, `backend/app/schemas/auth.py`
- Test: `backend/tests/test_api_auth.py`

- [ ] **Step 1: 写失败测试**

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.auth import router as auth_router
from app.core.security import hash_password
from app.models.user import User


def _app():
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/auth")
    return app


def test_login_success(db_session, monkeypatch):
    db_session.add(User(username="admin", hashed_password=hash_password("pw")))
    db_session.commit()
    client = TestClient(_app())
    r = client.post("/api/auth/login", data={"username": "admin", "password": "pw"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(db_session):
    db_session.add(User(username="admin", hashed_password=hash_password("pw")))
    db_session.commit()
    client = TestClient(_app())
    r = client.post("/api/auth/login", data={"username": "admin", "password": "bad"})
    assert r.status_code == 401
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_api_auth.py -v`
Expected: FAIL

- [ ] **Step 3: 实现**

`app/api/deps.py`：

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing token")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    user = db.query(User).filter_by(username=payload["sub"]).first()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")
    return user
```

`app/api/auth.py`：

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User

router = APIRouter()


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=form.username).first()
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "incorrect credentials")
    return {"access_token": create_access_token(user.username), "token_type": "bearer"}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_api_auth.py -v`
Expected: PASS ×2

- [ ] **Step 5: Commit**

```powershell
git add backend/app/api backend/app/schemas backend/tests/test_api_auth.py
git commit -m "feat: JWT login endpoint and auth dependency"
```

---

### Task 13: 任务 API（创建/列表/详情/确认/重试/SSE）

**Files:**
- Create: `backend/app/api/tasks.py`, `backend/app/schemas/task.py`
- Test: `backend/tests/test_api_tasks.py`

说明：阶段 1 任务创建后**不入真实 Redis 队列**，而是用 BackgroundTasks 内联调用 `run_pipeline`（注入 db session 与 runner），保持接口形状不变；测试直接断言状态。确认/重试端点改状态后同样内联续跑。

- [ ] **Step 1: 写失败测试**

```python
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.api.tasks import router as tasks_router
from app.core.security import create_access_token
from app.models.script import Script
from app.models.task import TaskStatus as TS
from app.models.user import User


@pytest.fixture()
def client_and_user(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.commit()

    app = FastAPI()
    app.include_router(tasks_router, prefix="/api/tasks")
    app.dependency_overrides[get_current_user] = lambda: user

    from app.api import tasks as tasks_api
    tasks_api._DATA_ROOT = tmp_path  # 测试注入存储根目录

    return TestClient(app), user


def test_create_task_runs_to_pause(client_and_user, db_session):
    client, user = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={
        "source_url": "https://v.douyin.com/x",
        "target_industry": "美妆",
        "product_brief": "粉底液",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == TS.AWAITING_SCRIPT.value


def test_confirm_script_continues_to_review(client_and_user, db_session):
    client, user = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"},
                    headers={"Authorization": f"Bearer {token}"})
    task_id = r.json()["id"]
    script = db_session.query(Script).filter_by(task_id=task_id).first()
    r2 = client.post(f"/api/tasks/{task_id}/confirm-script",
                     json={"script_id": script.id, "content": None},
                     headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
    assert r2.json()["status"] == TS.REVIEW.value


def test_complete_from_review(client_and_user, db_session):
    client, user = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"},
                    headers={"Authorization": f"Bearer {token}"})
    task_id = r.json()["id"]
    script = db_session.query(Script).filter_by(task_id=task_id).first()
    client.post(f"/api/tasks/{task_id}/confirm-script", json={"script_id": script.id},
                headers={"Authorization": f"Bearer {token}"})
    r3 = client.post(f"/api/tasks/{task_id}/complete",
                     headers={"Authorization": f"Bearer {token}"})
    assert r3.json()["status"] == TS.COMPLETED.value


def test_retry_from_failed(client_and_user, db_session):
    client, user = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"},
                    headers={"Authorization": f"Bearer {token}"})
    task_id = r.json()["id"]
    from app.models.task import Task
    task = db_session.get(Task, task_id)
    task.status = TS.FAILED
    task.failed_stage = TS.MODERATING_TEXT.value
    db_session.commit()
    r2 = client.post(f"/api/tasks/{task_id}/retry",
                     headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_api_tasks.py -v`
Expected: FAIL

- [ ] **Step 3: 实现 tasks.py**

```python
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.models.script import Script
from app.models.stage_log import StageLog
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.video_file import VideoFile
from app.pipeline.runner import PipelineRunner
from app.providers.registry import build_mock_bundle

router = APIRouter()

_DATA_ROOT = None  # 测试可覆盖；生产用 settings.data_root


def _runner() -> PipelineRunner:
    return PipelineRunner(build_mock_bundle(), data_root=_DATA_ROOT or settings.data_root)


def _run_now(task_id: int) -> None:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None:
            return
        _runner().run_until_pause(db, task)
        db.commit()
    finally:
        db.close()


class TaskCreate(BaseModel):
    source_url: str
    target_industry: str | None = None
    product_brief: str | None = None
    language: str = "zh"
    voice_id: str | None = None
    avatar_id: str | None = None
    subtitle_style: dict | None = None


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
                db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = Task(user_id=user.id, source_url=body.source_url,
                target_industry=body.target_industry, product_brief=body.product_brief,
                language=body.language, voice_id=body.voice_id, avatar_id=body.avatar_id,
                subtitle_style=body.subtitle_style, status=TaskStatus.PENDING)
    db.add(task)
    db.commit()
    db.refresh(task)
    _run_now(task.id)  # 阶段 1 内联执行；阶段 2 换 Arq 入队
    db.refresh(task)
    return _task_out(task)


@router.get("")
def list_tasks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tasks = db.query(Task).filter_by(user_id=user.id).order_by(Task.id.desc()).all()
    return [_task_out(t) for t in tasks]


@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
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
                   db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, user)
    if task.status != TaskStatus.AWAITING_SCRIPT:
        raise HTTPException(409, "task not awaiting script")
    script = db.get(Script, body.script_id)
    if script is None or script.task_id != task.id:
        raise HTTPException(404, "script not found")
    if body.content:
        script.content = body.content
    script.is_confirmed = True
    task.status = TaskStatus.MODERATING_TEXT
    db.commit()
    _run_now(task.id)
    db.refresh(task)
    return _task_out(task)


@router.post("/{task_id}/retry")
def retry_task(task_id: int, bg: BackgroundTasks,
               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, user)
    if task.status != TaskStatus.FAILED:
        raise HTTPException(409, "task not failed")
    task.status = TaskStatus(task.failed_stage)  # 回到失败阶段重试
    task.error_code = None
    task.error_message = None
    db.commit()
    _run_now(task.id)
    db.refresh(task)
    return _task_out(task)


@router.post("/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, user)
    if task.status != TaskStatus.REVIEW:
        raise HTTPException(409, "task not in review")
    task.status = TaskStatus.COMPLETED
    db.commit()
    return _task_out(task)
```

> SSE 端点（`/api/tasks/{id}/events`）阶段 1 暂不实现，前端用轮询；阶段 2 接 Arq 后一并补上。

- [ ] **Step 4: 运行测试确认通过**

Run: `pytest tests/test_api_tasks.py -v`
Expected: PASS ×4

- [ ] **Step 5: 全量回归**

Run: `pytest -q`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```powershell
git add backend/app/api/tasks.py backend/app/schemas/task.py backend/tests/test_api_tasks.py
git commit -m "feat: task CRUD, confirm, retry and complete endpoints"
```

---

### Task 14: 文件下载端点与应用装配

**Files:**
- Create: `backend/app/api/files.py`, `backend/app/main.py`, `backend/app/scripts/__init__.py`, `backend/app/scripts/seed_admin.py`
- Test: `backend/tests/test_api_files.py`

- [ ] **Step 1: 写失败测试**

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.api.files import router as files_router
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.video_file import VideoFile


def test_download_own_file(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.flush()
    f = tmp_path / "final.mp4"
    f.write_bytes(b"VIDEO")
    vf = VideoFile(user_id=user.id, kind="final", path=str(f))
    db_session.add(vf)
    db_session.commit()

    app = FastAPI()
    app.include_router(files_router, prefix="/api/files")
    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app)
    r = client.get(f"/api/files/{vf.id}/download")
    assert r.status_code == 200 and r.content == b"VIDEO"


def test_download_other_user_file_denied(db_session, tmp_path):
    owner = User(username="owner", hashed_password="x")
    other = User(username="other", hashed_password="x")
    db_session.add_all([owner, other])
    db_session.flush()
    f = tmp_path / "a.mp4"
    f.write_bytes(b"V")
    vf = VideoFile(user_id=owner.id, kind="final", path=str(f))
    db_session.add(vf)
    db_session.commit()

    app = FastAPI()
    app.include_router(files_router, prefix="/api/files")
    app.dependency_overrides[get_current_user] = lambda: other
    client = TestClient(app)
    assert client.get(f"/api/files/{vf.id}/download").status_code == 404
```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/test_api_files.py -v`
Expected: FAIL

- [ ] **Step 3: 实现**

`app/api/files.py`：

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.video_file import VideoFile

router = APIRouter()


@router.get("/{file_id}/download")
def download(file_id: int, db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    vf = db.get(VideoFile, file_id)
    if vf is None or vf.user_id != user.id:
        raise HTTPException(404, "file not found")
    return FileResponse(vf.path, filename=vf.path.split("/")[-1].split("\\")[-1])
```

`app/main.py`：

```python
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
```

`app/scripts/seed_admin.py`：

```python
"""建表并预置管理员账号。用法：python -m app.scripts.seed_admin"""
from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.core.security import hash_password
from app.models.user import User


def main() -> None:
    init_db(settings.database_url)
    db = SessionLocal()
    if db.query(User).filter_by(username=settings.admin_username).first() is None:
        db.add(User(username=settings.admin_username,
                    hashed_password=hash_password(settings.admin_password)))
        db.commit()
        print(f"admin user '{settings.admin_username}' created")
    else:
        print("admin user already exists")
    db.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 运行测试确认通过 + 全量回归**

Run: `pytest -q`
Expected: 全部 PASS

- [ ] **Step 5: 手工验证应用启动**

```powershell
cd backend
python -m app.scripts.seed_admin
uvicorn app.main:app --port 8000
# 另一终端：
# curl -X POST http://localhost:8000/api/auth/login -d "username=admin&password=admin-dev-password"
```
Expected: 返回 access_token

- [ ] **Step 6: Commit**

```powershell
git add backend/app/api/files.py backend/app/main.py backend/app/scripts backend/tests/test_api_files.py
git commit -m "feat: file download endpoint, app factory and admin seed script"
```

---

### Task 15: 前端最小版（登录 + 任务列表 + 任务详情）

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api.ts`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/TaskList.tsx`, `frontend/src/pages/TaskDetail.tsx`, `frontend/src/pages/NewTask.tsx`

说明：阶段 1 前端为最小可用版：登录拿 token 存 localStorage；任务列表轮询 `/api/tasks`；新建任务表单（链接/行业/卖点三字段）；任务详情展示状态、阶段日志、备选脚本、确认按钮、下载入口。样式用 Tailwind 最简实现。

- [ ] **Step 1: 初始化 Vite 项目**

```powershell
cd d:\MyProjects\VisionCube
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npm install react-router-dom
npx tailwindcss init -p
```

- [ ] **Step 2: 配置 vite 代理与 tailwind**

`vite.config.ts`：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
```

`tailwind.config.js`：

```javascript
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

`src/index.css` 首行：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: 实现 api.ts（fetch 封装）**

```typescript
const TOKEN_KEY = 'vc_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}

export async function login(username: string, password: string): Promise<void> {
  const body = new URLSearchParams({ username, password })
  const res = await fetch('/api/auth/login', { method: 'POST', body })
  if (!res.ok) throw new Error('登录失败')
  const data = await res.json()
  setToken(data.access_token)
}

export interface TaskOut {
  id: number
  status: string
  source_url: string
  target_industry: string | null
  failed_stage: string | null
  error_code: string | null
  error_message: string | null
}

export interface TaskDetail extends TaskOut {
  logs: { stage: string; status: string; created_at: string }[]
  scripts: { id: number; kind: string; version: number; content: string; is_confirmed: boolean }[]
  files: { id: number; kind: string }[]
}

export const listTasks = () => request<TaskOut[]>('/api/tasks')
export const getTask = (id: number) => request<TaskDetail>(`/api/tasks/${id}`)
export const createTask = (body: object) =>
  request<TaskOut>('/api/tasks', { method: 'POST', body: JSON.stringify(body) })
export const confirmScript = (taskId: number, scriptId: number) =>
  request<TaskOut>(`/api/tasks/${taskId}/confirm-script`, {
    method: 'POST', body: JSON.stringify({ script_id: scriptId }),
  })
export const completeTask = (taskId: number) =>
  request<TaskOut>(`/api/tasks/${taskId}/complete`, { method: 'POST' })
export const retryTask = (taskId: number) =>
  request<TaskOut>(`/api/tasks/${taskId}/retry`, { method: 'POST' })

// 带 token 下载（后端要求 Authorization 头，不能用 <a href> 直链）
export async function downloadFile(fileId: number): Promise<void> {
  const res = await fetch(`/api/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('下载失败')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `visioncube-${fileId}`
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: 实现四个页面与路由**

`App.tsx`：

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'
import TaskList from './pages/TaskList'
import { getToken } from './api'

function Guard({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><TaskList /></Guard>} />
        <Route path="/new" element={<Guard><NewTask /></Guard>} />
        <Route path="/tasks/:id" element={<Guard><TaskDetail /></Guard>} />
      </Routes>
    </BrowserRouter>
  )
}
```

`main.tsx` 使用 Vite 模板生成的默认内容（确保包含 `import './index.css'` 与 `<App />`）。

`pages/Login.tsx`：

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login(username, password)
      nav('/')
    } catch {
      setError('登录失败，请检查用户名密码')
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-32 flex w-72 flex-col gap-3">
      <h1 className="text-xl font-bold">VisionCube 登录</h1>
      <input className="border p-2 rounded" placeholder="用户名" value={username}
        onChange={(e) => setUsername(e.target.value)} />
      <input className="border p-2 rounded" type="password" placeholder="密码" value={password}
        onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button className="bg-blue-600 text-white p-2 rounded">登录</button>
    </form>
  )
}
```

`pages/TaskList.tsx`：

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTasks, TaskOut } from '../api'

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskOut[]>([])

  useEffect(() => {
    const load = () => listTasks().then(setTasks).catch(() => {})
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">复刻任务</h1>
        <Link to="/new" className="rounded bg-blue-600 px-3 py-1 text-white">新建任务</Link>
      </div>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">ID</th><th>状态</th><th>源链接</th><th>行业</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">
                <Link className="text-blue-600" to={`/tasks/${t.id}`}>#{t.id}</Link>
              </td>
              <td>{t.status}</td>
              <td className="max-w-40 truncate">{t.source_url}</td>
              <td>{t.target_industry ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

`pages/NewTask.tsx`：

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTask } from '../api'

export default function NewTask() {
  const [sourceUrl, setSourceUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [brief, setBrief] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const task = await createTask({
        source_url: sourceUrl,
        target_industry: industry || null,
        product_brief: brief || null,
      })
      nav(`/tasks/${task.id}`)
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 flex w-96 flex-col gap-3">
      <h1 className="text-xl font-bold">新建复刻任务</h1>
      <input className="rounded border p-2" placeholder="抖音爆款视频链接" required
        value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
      <input className="rounded border p-2" placeholder="目标行业（可选，如：美妆）"
        value={industry} onChange={(e) => setIndustry(e.target.value)} />
      <textarea className="rounded border p-2" rows={3} placeholder="产品卖点描述（可选）"
        value={brief} onChange={(e) => setBrief(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 p-2 text-white">提交</button>
    </form>
  )
}
```

`pages/TaskDetail.tsx`：

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { completeTask, confirmScript, downloadFile, getTask, retryTask, TaskDetail as T } from '../api'

export default function TaskDetail() {
  const { id } = useParams()
  const [task, setTask] = useState<T | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    const load = () => getTask(Number(id)).then(setTask).catch(() => {})
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [id])

  if (!task) return <p className="p-6">加载中…</p>

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-xl font-bold">任务 #{task.id} — {task.status}</h1>
      {task.error_message && (
        <p className="text-red-600">{task.error_code}: {task.error_message}</p>
      )}

      <section>
        <h2 className="mb-1 font-bold">阶段日志</h2>
        <ul className="divide-y rounded border text-sm">
          {task.logs.map((l, i) => (
            <li key={i} className="flex justify-between p-2">
              <span>{l.stage}</span><span>{l.status}</span>
            </li>
          ))}
        </ul>
      </section>

      {task.status === 'AWAITING_SCRIPT' && (
        <section>
          <h2 className="mb-1 font-bold">备选脚本（选一版确认）</h2>
          <div className="flex flex-col gap-2">
            {task.scripts.filter((s) => s.kind === 'rewrite').map((s) => (
              <label key={s.id} className="flex gap-2 rounded border p-2 text-sm">
                <input type="radio" checked={selected === s.id}
                  onChange={() => setSelected(s.id)} />
                <span>V{s.version}: {s.content.slice(0, 60)}…</span>
              </label>
            ))}
          </div>
          <button disabled={selected == null}
            className="mt-2 rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
            onClick={async () => {
              if (selected != null) await confirmScript(task.id, selected)
            }}>
            确认该版
          </button>
        </section>
      )}

      {task.status === 'REVIEW' && (
        <button className="w-fit rounded bg-green-600 px-3 py-1 text-white"
          onClick={() => completeTask(task.id)}>完成</button>
      )}
      {task.status === 'FAILED' && (
        <button className="w-fit rounded bg-orange-600 px-3 py-1 text-white"
          onClick={() => retryTask(task.id)}>从失败阶段重试</button>
      )}
      {task.status === 'COMPLETED' && (
        <section>
          <h2 className="mb-1 font-bold">产物下载</h2>
          <ul className="flex gap-3 text-sm">
            {task.files.filter((f) => ['final', 'cover'].includes(f.kind)).map((f) => (
              <li key={f.id}>
                <button className="text-blue-600 underline"
                  onClick={() => downloadFile(f.id)}>
                  {f.kind === 'final' ? '成片 MP4' : `封面 ${f.id}`}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 手工联调**

```powershell
# 终端 1：后端
cd backend; uvicorn app.main:app --port 8000
# 终端 2：前端
cd frontend; npm run dev
```
浏览器打开 http://localhost:5173：登录 admin / admin-dev-password → 新建任务 → 观察状态推进到 AWAITING_SCRIPT → 确认脚本 → REVIEW → 完成。
Expected: 全流程走通

- [ ] **Step 6: Commit**

```powershell
git add frontend
git commit -m "feat: minimal frontend with login, task list, detail and new-task wizard"
```

---

### Task 16: 全链路集成测试 + runbook + CI

**Files:**
- Create: `backend/tests/test_e2e_mock_pipeline.py`, `docs/runbook.md`, `.github/workflows/ci.yml`

- [ ] **Step 1: 写端到端集成测试（API 层完整业务流）**

```python
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import create_app
from app.models.user import User


def test_full_business_flow_with_mock_providers(db_session, tmp_path, monkeypatch):
    # 阻止 create_app 重建真实数据库，沿用 conftest 注入的内存库
    monkeypatch.setattr("app.main.init_db", lambda url: None)
    app = create_app()
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user

    from app.api import tasks as tasks_api
    tasks_api._DATA_ROOT = tmp_path

    client = TestClient(app)
    r = client.post("/api/tasks", json={
        "source_url": "https://v.douyin.com/demo",
        "target_industry": "美妆",
        "product_brief": "持妆粉底液",
    })
    assert r.status_code == 201
    task_id = r.json()["id"]
    assert r.json()["status"] == "AWAITING_SCRIPT"

    detail = client.get(f"/api/tasks/{task_id}").json()
    script_id = detail["scripts"][0]["id"]
    r2 = client.post(f"/api/tasks/{task_id}/confirm-script",
                     json={"script_id": script_id})
    assert r2.json()["status"] == "REVIEW"

    r3 = client.post(f"/api/tasks/{task_id}/complete")
    assert r3.json()["status"] == "COMPLETED"
```

- [ ] **Step 2: 运行确认通过**

Run: `pytest tests/test_e2e_mock_pipeline.py -v`
Expected: PASS

- [ ] **Step 3: 写 runbook**

`docs/runbook.md`：本地环境要求（Python 3.12 / Node 20 / FFmpeg / Redis）、启动步骤（seed_admin → uvicorn → arq worker → npm run dev）、真实 API 冒烟清单模板（阶段 2 填充：真实链接解析 / ASR / TTS / 数字人各一条）。

- [ ] **Step 4: 写 CI**

`.github/workflows/ci.yml`：

```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv venv .venv && uv pip install -e ".[dev]"
      - run: .venv/bin/ruff check app tests
      - run: .venv/bin/pytest -q
```

- [ ] **Step 5: 全量回归 + 覆盖率抽检**

```powershell
cd backend
pytest -q
pip install pytest-cov
pytest --cov=app/pipeline --cov=app/providers --cov-report=term-missing -q
```
Expected: 全部 PASS；pipeline/providers 覆盖率 >= 80%（不足则补测试）

- [ ] **Step 6: Commit 并推送**

```powershell
git add backend/tests/test_e2e_mock_pipeline.py docs/runbook.md .github
 git commit -m "test: e2e mock pipeline, runbook and CI workflow"
git push
```

---

## 阶段 1 验收标准

1. `pytest -q` 全部通过，pipeline/providers 覆盖率 >= 80%
2. 手工跑通：登录 → 新建任务（Mock 自动跑到 AWAITING_SCRIPT）→ 确认脚本 → REVIEW → 完成
3. 失败注入：任一阶段抛错后任务置 FAILED，重试可从失败阶段继续
4. CI 流水线（ruff + pytest）在 push 后绿

## 阶段 2 预告（另行出计划文档）

- 接入真实商用 API：VideoParseProvider、AsrProvider、LlmProvider（含提示词工程与爆款结构 schema）
- Arq 入队替换内联执行 + SSE 进度推送
- 审核整改回路（TEXT_MODERATION_FAILED → REWRITING 自动重改写，上限 2 次）
- 供应商选型落地（按规格 §13 待定项）

