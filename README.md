# VisionCube

抖音爆款短视频复刻智能体（口播数字人）。粘贴抖音分享链接，自动完成「内容理解 → 脚本确认 → 内容生成 → 成片审核 → 发布分发」五阶段流水线。

## 功能特性

- **五阶段流水线工作台**（14 个流水线步骤合并为 5 个阶段）：
  1. **内容理解**（自动）：解析视频 / 语音转写 / 内容分析 / 脚本改写
  2. **脚本确认**（人工）：候选脚本选择，确认后继续
  3. **内容生成**（自动）：元信息 / 文本审核 / 语音合成 / 数字人 / 视频合成 / 封面 / 视频审核
  4. **成片审核**（人工）：成片预览 + 封面候选 + 字幕样式调整
  5. **发布分发**（人工，mock 待联调）：多平台一键发布
- **自动阶段折叠**：运行中显示当前子任务名，失败时定位到具体子步骤
- **人工介入点双卡**：输入·前置产物 / 输出·确认后，操作按钮语义明确（确认并继续 / 确认并完成）
- **失败诊断与重试**：失败阶段标红、`failed_stage / error_code / error_message` 诊断卡、从失败阶段一键重试
- **深色 AI 智能体风格**：CSS 变量驱动的语义 token（canvas/panel/line/ink），桌面左侧阶段侧栏 + 移动端横向阶段条，全站无硬编码灰色
- **Provider 按配置切换**：配置真实服务即用真实实现，未配置自动回退 Mock，开箱即跑

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy + SQLite + Arq（异步 worker） |
| 集成 | yt-dlp（视频解析）、阿里云 DashScope ASR、DeepSeek LLM、Edge TTS、火山引擎 OmniHuman1.5（数字人） |

## 快速开始

完整步骤（环境要求 / 启动 / 故障排查）见 [docs/runbook.md](docs/runbook.md)。

```powershell
# 后端（backend/ 目录）
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
python -m app.scripts.seed_admin     # 建库 + 预置管理员账号
uvicorn app.main:app --port 8000     # API: http://localhost:8000/docs

# 前端（frontend/ 目录）
npm install
npm run dev                          # http://localhost:5173
```

登录账号：`admin` / `admin-dev-password`（若存在 `backend/.env`，以其中 `ADMIN_PASSWORD` 为准）。

## 目录结构

```
backend/
  app/pipeline/      流水线阶段实现（解析→转写→分析→改写→生成→合成→审核）
  app/providers/     Provider 抽象与实现（mock + 真实，registry 按配置切换）
  app/worker/        Arq worker（重启时自动标记卡死任务 FAILED）
frontend/
  src/pages/         TaskDetail 五阶段工作台、首页、登录等
  src/components/    business 业务组件（PipelineSteps/ScriptEditor/CoverPicker 等）
                     + ui 基础组件 + layout（TopBar 任务切换器）
  DESIGN.md          设计系统契约（token / 组件 / 布局规范）
docs/
  runbook.md         运维手册
  superpowers/specs/ 设计规格
```

## 测试

```powershell
# 后端（backend/ 目录）
pytest -q                # 当前 81 passed
ruff check app tests

# 前端（frontend/ 目录）
npx tsc --noEmit
npm run build
```
