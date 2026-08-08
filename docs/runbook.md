# VisionCube 运维手册（Runbook）

> 阶段 1：Mock Provider 全链路（创建任务内联同步执行到暂停点），worker 与真实服务（ASR/TTS/数字人）为阶段 2 预留。
> 本手册覆盖：环境要求、启动步骤、故障排查、阶段 2 真实 API 冒烟清单模板。

## 1. 环境要求

| 组件 | 版本要求 | 用途 | 备注 |
| --- | --- | --- | --- |
| Python | >= 3.12 | 后端 FastAPI 应用 | 项目声明 `requires-python = ">=3.12"` |
| Node.js | >= 20.19 | 前端 React + Vite | Vite 8 engines：`^20.19.0 \|\| >=22.12.0` |
| FFmpeg | 任意较新版本 | 视频解析/合成（阶段 2 使用） | 阶段 1 Mock 流水线不需要，先装好备用 |
| Redis | >= 5 | Arq worker 队列（阶段 2 使用） | 阶段 1 任务内联执行，Redis 仅备阶段 2；本地可用 Docker：`docker run -d -p 6379:6379 redis:7` |

## 2. 后端启动步骤

以下命令均在 `backend/` 目录下执行（Windows PowerShell）。

### 2.1 创建虚拟环境并安装依赖（首次）

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

### 2.2 建库并预置管理员账号

```powershell
python -m app.scripts.seed_admin
```

- 自动建表（默认 SQLite：`data/visioncube.db`）
- 预置管理员：`admin` / `admin-dev-password`（可用 `.env` 覆盖，参考 `.env.example`）

### 2.3 启动 API 服务

```powershell
uvicorn app.main:app --port 8000
```

- API 文档：http://localhost:8000/docs
- 健康检查：`Invoke-RestMethod http://localhost:8000/api/tasks`（未带 token 应返回 401，说明服务正常）

### 2.4 启动 Arq worker（可选，阶段 2 需要）

```powershell
arq app.worker.main.WorkerSettings
```

> 阶段 1 任务在创建请求内同步执行流水线至暂停点，不依赖 worker。阶段 2 接入真实服务后，任务创建改为入队，此步骤为必选。

## 3. 前端启动步骤

```powershell
cd frontend
npm install        # 首次
npm run dev
```

访问 http://localhost:5173 ，使用 `admin` / `admin-dev-password` 登录（若存在 `backend/.env`，密码以其中 `ADMIN_PASSWORD` 为准）。

## 4. 后端测试与静态检查

```powershell
pytest -q                          # 全量测试（当前 81 passed）
ruff check app tests               # 静态检查，0 错误
```

## 5. 常见故障排查

| 症状 | 可能原因 | 处理 |
| --- | --- | --- |
| `uvicorn` 启动报数据库锁/SQLite 错误 | `data/` 目录不存在或权限问题 | 确认 `backend/data/` 存在（seed_admin 会自动创建） |
| 登录返回 401 | 未执行 seed_admin 或密码被 `.env` 覆盖 | 重跑 `python -m app.scripts.seed_admin`；确认 `.env` 配置 |
| 创建任务后状态一直 PENDING | 流水线异常被吞 | 查看详情接口 `GET /api/tasks/{id}` 的 `error_message`；查 uvicorn 日志 |
| 前端无法登录/跨域 | 后端未启动或端口不一致 | 确认 8000 端口 uvicorn 已启动；vite 代理配置在 `frontend/vite.config.ts` |
| Redis 连接失败（阶段 2） | Redis 未启动 | 启动 Redis 或确认 `redis_url` 配置 |

## 6. 真实 API 冒烟清单模板（阶段 2 填充）

> 阶段 2 接入真实 Provider 后，逐条执行并记录结果。每条验证要点与预期结果需结合各服务实际响应填写。

### 6.1 真实链接解析

| 项 | 内容 |
| --- | --- |
| 操作 | 创建任务，`source_url` 填真实抖音分享链接 |
| 预期结果 | 任务进入解析阶段，详情中生成 `source.mp4`（kind=`source` 的文件记录） |
| 验证要点 | 视频时长/分辨率与源视频一致；解析失败时任务 FAILED 且 `failed_stage` 指向解析阶段 |
| 结果 | （待填充） |

### 6.2 ASR 语音识别

| 项 | 内容 |
| --- | --- |
| 操作 | 在解析成功后观察流水线转写阶段（`/api/tasks/{id}` 的 logs 出现 TRANSCRIBING） |
| 预期结果 | 生成 `transcript.json`，`scripts` 出现 raw 脚本 |
| 验证要点 | 中文转写准确率抽查关键句；说话人/时间戳结构完整 |
| 结果 | （待填充） |

### 6.3 TTS 语音合成

| 项 | 内容 |
| --- | --- |
| 操作 | 确认脚本后流水线执行 TTS 阶段 |
| 预期结果 | 生成 `voice.mp3`（kind=`voice` 的文件记录），任务进入 REVIEW |
| 验证要点 | 音频可播放、时长与脚本朗读时长近似；音色与 `voice_id` 一致 |
| 结果 | （待填充） |

### 6.4 数字人合成

| 项 | 内容 |
| --- | --- |
| 操作 | REVIEW 通过（complete）后检查合成阶段产物 |
| 预期结果 | 生成 `avatar.mp4` 与 `final.mp4`（kind=`avatar`/`final`），任务 COMPLETED |
| 验证要点 | 数字人口型与音频同步；封面图 `cover_*.jpg` 生成；成品可正常播放 |
| 结果 | （待填充） |

## 7. 数据与产物位置

| 路径 | 内容 |
| --- | --- |
| `backend/data/visioncube.db` | SQLite 业务库（已被 .gitignore 忽略） |
| `backend/data/{user_id}/{task_id}/` | 任务产物目录（全部产物在同一目录，无 stage 子目录）：source.mp4 / transcript.json / tts_sentences.json / voice.mp3 / avatar.mp4 / cover_*.jpg / final.mp4 |
