# 抖音爆款短视频复刻智能体 — 设计规格

日期：2026-08-07
状态：已与需求方逐节确认
项目代号：VisionCube

## 1. 概述

构建一个 Web 应用形态的短视频复刻智能体：用户粘贴抖音爆款视频链接，选择目标行业/领域并填写产品卖点，系统自动完成"解析爆款 → ASR 提取文案 → 爆款结构分析 → LLM 跨行业改写 → 合规审核 → TTS 合成 → 数字人口播视频生成 → 自动剪辑（字幕/BGM/9:16）→ 封面生成 → 成片审核"全链路，最终输出可下载的成片 MP4 与选定封面 JPG。

复刻形态为"口播数字人复刻"（市面主流）：仅借鉴原视频的文案叙事结构，画面全部由数字人生成，不复用原视频画面。

### 范围边界（MVP）

- 单用户自用，但架构按多用户多端预留（见 §3.3）
- 发布分发：仅下载成片 + 封面，不接平台发布 OpenAPI（数据模型与模块边界预留）
- 外部能力全部调用商用 API，不自部署模型、不自训数字人/音色
- 合规审核全自动，无人工审核环节

## 2. 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 后端 | Python 3.12 + FastAPI | AI/音视频生态最友好，asyncio 原生 |
| ORM / 数据库 | SQLAlchemy + SQLite | 单用户足够，可平滑迁移 PostgreSQL |
| 任务队列 | Arq + Redis | 轻量、asyncio 原生、支持延时任务（数字人轮询） |
| 前端 | Vite + React + TypeScript + Tailwind CSS | SPA，REST + SSE 交互 |
| 剪辑/封面/音频处理 | FFmpeg + Pillow（本地） | 免费可控，覆盖字幕烧录、混音、关键帧抽取、封面合成 |
| 进度推送 | SSE | 单向推送足够，单用户无需 WebSocket |
| CI | GitHub Actions（ruff + pytest） | 质量门槛见 §9 |

### 仓库结构（monorepo）

```
VisionCube/
├── backend/
│   ├── app/
│   │   ├── api/            # REST 路由（auth、tasks、assets、下载）+ SSE
│   │   ├── core/           # 配置、日志、异常、安全（JWT）
│   │   ├── models/         # SQLAlchemy 数据模型
│   │   ├── pipeline/       # 状态机 + 各阶段处理器（stages/）
│   │   ├── providers/      # 第三方能力适配层（抽象接口 + 具体实现）
│   │   └── worker/         # Arq worker 与任务定义
│   ├── tests/
│   └── data/               # 媒体文件本地存储，按用户分目录
├── frontend/
└── docs/
```

## 3. 总体架构

### 3.1 架构模式

状态机流水线 + 异步任务队列（方案 A）。全链路建模为任务状态机，Arq worker 逐阶段消费，人工确认点（脚本确认、成片审阅）作为状态机暂停点自然嵌入。

不采用 DAG 工作流引擎（流程固定，属过度设计）与 LLM 自主编排（确定性流水线引入不可控性与额外 token 成本）。

### 3.2 分层职责

- API 层：鉴权、参数校验、任务创建与输入预检、人工确认入口、SSE 推送、文件下载
- Pipeline 层：状态机定义与转移控制、各阶段处理器（纯编排逻辑，不含第三方调用细节）
- Provider 层：七类能力的抽象接口与具体实现，上层只依赖接口（见 §4）
- Worker 层：Arq job 定义、数字人异步轮询、启动时卡死任务扫描

### 3.3 多用户预留设计

1. 认证先行：MVP 即引入用户表 + JWT 认证中间件，初始化脚本预置单个管理员账号，不开放注册；JWT 无状态天然支持多端登录
2. 数据隔离：所有业务表带 `user_id` 外键
3. 文件隔离：`data/{user_id}/{task_id}/...`
4. 第三方 API Key 首期放服务端环境变量；数据模型预留"用户自带 Key"的概念位（不实现）

## 4. Provider 能力层

`backend/app/providers/` 中每类能力定义抽象接口（Protocol/ABC）+ 具体实现，统一异常映射为系统内错误分级（见 §7.1）。具体供应商在实施阶段按报价与文档质量选定，本规格只约束接口契约。

| Provider | 输入 | 输出 |
|---|---|---|
| `VideoParseProvider` | 抖音分享链接 | 标题、封面、视频直链、元信息（时长/点赞等） |
| `AsrProvider` | 音频文件 | 带时间戳的逐句文案 |
| `LlmProvider` | prompt + 参数 | 文本（结构分析 JSON / 备选脚本 / 封面标题） |
| `TtsProvider` | 文本 + 音色 ID + 语速情绪参数 | 音频文件 + 逐句时间戳；另提供 `clone_voice(样本音频) -> voice_id`（上传参考音色，供应商侧克隆） |
| `DigitalHumanProvider` | 音频 + 形象 ID + 背景素材（可选） | 异步任务句柄；轮询后得口播视频 |
| `ModerationProvider` | 文本 / 视频文件 | 通过与否 + 违规点明细 |
| `StockProvider` | 关键词 + 数量 | 素材清单（直链/缩略图/来源/许可/作者）；实现：自建素材库、Openverse（免 Key，CC 许可）、Pixabay/Pexels（免费 Key，可商用） |

契约测试：每类接口配一套 fixture 驱动的契约测试，替换供应商时新实现必须通过同一套测试。

## 5. 流水线阶段模块

`backend/app/pipeline/stages/`，每个阶段一个独立处理器：

| 阶段 | 模块 | 职责 |
|---|---|---|
| 解析 | `parse.py` | 链接校验 → `VideoParseProvider` 拉取元信息与视频直链 → 下载原视频到本地 |
| ASR | `transcribe.py` | FFmpeg 抽取音频 → `AsrProvider` → 带时间戳逐句文案 |
| 结构分析 | `analyze.py` | `LlmProvider` 拆解爆款结构：钩子/痛点/论据/转化结尾、语速、停顿、情绪风格；同时提取原视频话题标签（来自 parse 元信息） |
| 改写 | `rewrite.py` | 输入三件套（原文案 + 结构分析 + 目标行业/产品信息），保留叙事骨架、跨行业迁移案例与论据，输出 1-3 版备选脚本，支持多语言参数 |
| 标题话题生成 | `meta_generate.py` | 脚本确认后，`LlmProvider` 基于确认稿生成 3 套"标题 + 话题标签"方案供用户选择（即使人工发布也是必需物料） |
| 文本审核 | `moderate_text.py` | 确认稿送 `ModerationProvider`；未过则携带违规点反馈自动回路重新改写（最多 2 次） |
| TTS | `synthesize.py` | 确认稿 + 所选音色 → 语音 + 逐句时间戳 |
| 数字人 | `avatar.py` | 音频 + 形象 + 背景素材（可选，默认平台场景）→ 提交驱动任务 → Arq 延时任务轮询 → 口播视频 |
| 剪辑 | `compose.py` | ASS 字幕烧录（按 subtitle_style）+ BGM 混音（人声/BGM 音量配比）+ 9:16 MP4 输出 |
| 封面生成 | `cover.py` | **3 种风格方案**（A 大字冲击型 / B 干净截帧型 / C 情绪渲染型），每种 FFmpeg 抽关键帧 × LLM 标题文案 → Pillow 合成 1-2 张，共 3-6 张候选；支持调参（标题文案/配色/文字位置）后重新生成 |
| 成片审核 | `moderate_video.py` | 成片截帧 + 音轨送 `ModerationProvider`，通过才允许下载 |

字幕实现：由 TTS 时间戳生成 ASS 字幕（字体/字号/颜色/描边/阴影/位置/每行字数均可配），FFmpeg `subtitles` 滤镜烧录。默认一套抖音常见样式（底部白字黑边）。

剪辑配置扩展（v1.1）：除 `subtitle_style` 外，任务选项新增 `title_style`（标题样式：字体/配色/入场效果）与 `pip_config`（画中画：叠加图位置/尺寸/出现时段），均由 compose 阶段消费。

封面实现：MVP 采用"关键帧 + 标题排版"，不引入文生图 API；如需纯 AI 封面，后续新增 `CoverProvider` 实现即可。

数字人资产：MVP 使用商用平台公共形象/音色或用户已授权克隆资产的引用 ID，系统不自训模型；`assets` 表管理形象、音色、BGM 库。

素材体系（v1.2）：背景与画中画素材分开保存，各有三种来源——数字人平台内置场景（供应商引用）、自建素材库（用户上传，入 `assets` 表）、开源免费素材库检索（`StockProvider`，下载缓存后同样入 `assets` 表）。新建任务时可任选其一作为背景；画中画从 pip 分类中选择。

## 6. 状态机与数据流

### 6.1 状态机

```
PENDING → PARSING → TRANSCRIBING → ANALYZING → REWRITING
  → AWAITING_SCRIPT        （暂停：人工选版/编辑，可循环回 REWRITING 重新生成）
  → META_GENERATING        （生成 3 套"标题+话题"方案）
  → MODERATING_TEXT        （审核确认稿 + 标题；未过 → 自动回路 REWRITING，最多 2 次；仍失败 → FAILED）
  → SYNTHESIZING → GENERATING_AVATAR → COMPOSING → GENERATING_COVER（3 种风格方案）
  → MODERATING_VIDEO       （未过 → FAILED，可从剪辑阶段重试）
  → REVIEW                 （暂停：选封面方案、选标题方案、调字幕样式；调样式触发局部回到 COMPOSING 重剪）
  → COMPLETED

任意阶段失败 → FAILED（记录失败阶段，可从该阶段断点重试，前序产物复用）
```

- 实现于 `app/pipeline/state_machine.py`；转移仅允许白名单边，非法转移抛异常
- 状态存 `tasks.status`；每次转移写 `stage_logs`（阶段、耗时、输入输出摘要、错误）
- 人工确认点：worker 到达暂停状态即结束本次执行；用户确认后 API 再次入队续跑；暂停无超时限制
- 数字人轮询：提交后由 Arq 延时任务周期轮询，不阻塞 worker；轮询上限 30 分钟，超时按可恢复错误处理

### 6.2 执行模型

1. API 创建任务：同步输入预检（链接格式校验、解析 API 探活取元信息）→ 写库 PENDING → Arq 入队 → 立即返回任务 ID
2. Worker 逐阶段执行：阶段开始前置状态，成功后推进；产物登记 `video_files`
3. 重试：检测已有产物直接跳过（幂等），从失败阶段续跑
4. Worker 启动时扫描"卡在中途态"的任务，标记 FAILED 待重试

### 6.3 产物数据流

```
原视频(mp4) → 音频(wav) → 逐句文案JSON(带时间戳) → 结构分析JSON
→ 备选脚本(1-3版, scripts表) → [确认稿] → [文本审核] → 语音(mp3+时间戳)
→ 数字人口播视频(mp4) → 成片(字幕+BGM, mp4) → 封面候选(jpg ×3~6) → [成片审核]
```

文件统一落 `data/{user_id}/{task_id}/`，文件名含阶段标识；所有产物在 `video_files` 登记（路径、类型、大小、时长），支持独立追溯与复用。

### 6.4 前端进度同步

任务详情页订阅 SSE（`/api/tasks/{id}/events`），推送状态转移与阶段日志；断线先 GET 任务详情补齐状态再重连。

## 7. 错误处理

### 7.1 错误分级（`app/core/exceptions.py`）

| 级别 | 场景 | 策略 |
|---|---|---|
| 瞬时 | 第三方 API 超时、限流、5xx | 阶段内自动重试，指数退避 2s/8s/32s，最多 3 次 |
| 可恢复 | 解析返回空、ASR 无人声、数字人生成失败 | FAILED + 保留前序产物，一键从失败阶段重试 |
| 致命 | 链接无效/已删除、Key 失效、余额不足 | FAILED + 明确错误码与提示，禁止盲目重试 |

### 7.2 关键机制

1. 阶段原子性：产物先写临时文件，完成后原子改名并登记 `video_files`，防止半成品被下游引用
2. 错误现场：`stage_logs` 记录错误码、上游响应摘要、参数快照；前端展示可读错误提示（不暴露堆栈）
3. 合规整改回路：文本审核未过自动携带违规点重新改写（上限 2 次），仍失败则 FAILED 并提示调整产品描述；无人工审核环节
4. 合规双保险：改写提示词内置违规规避指令，降低审核触发整改频率；数字人仅允许平台公共形象或用户已授权资产
5. 人工确认点无超时，不占用 worker

## 8. 数据模型（7 张表）

- `users`：认证与基础信息
- `tasks`：状态机主表。含 `status`、`failed_stage`、`source_url`、`target_industry`、`product_brief`、`subtitle_style`/`title_style`/`pip_config`(JSON)、`selected_cover`、语言/音色/形象选项、各阶段产物引用
- `scripts`：多版本文案（原版 + 1-3 改写版 + 确认稿标记 + 整改轮次）
- `publish_metas`：标题+话题方案（每任务 3 版，含选中标记），REVIEW 阶段选择；作为未来自动发布的物料，也随成片打包供人工发布使用
- `assets`：数字人形象、音色、BGM、背景素材、画中画素材（kind 区分：avatar/voice/bgm/background/pip；source 区分：upload/openverse/pixabay/pexels/platform；背景与画中画分目录存储 `data/{user_id}/stocks/backgrounds/` 与 `.../pips/`）
- `video_files`：所有媒体文件（路径、类型、大小、时长、所属任务/阶段）
- `stage_logs`：阶段执行与错误留痕

全部表带 `user_id` 外键。发布分发概念位：`tasks` 预留 `publish_status` 字段不启用。

## 9. 测试策略

- Provider 契约测试：fixture 驱动的输入输出格式与异常映射测试；供应商替换的验收门槛
- 状态机测试：合法转移、非法转移拒绝、失败阶段恢复、审核整改回路
- 纯逻辑单测：ASS 字幕生成、封面排版、FFmpeg 命令构建（断言参数不执行）、改写提示词要素完整性
- 集成测试：全部 Provider 以 Mock 替换，用仓库内置 10s 样例视频跑通 PENDING → COMPLETED 全状态机；覆盖失败重试幂等、人工确认暂停/续跑、字幕重剪回路
- API 测试：TestClient 覆盖任务 CRUD、无 token 拒绝、SSE 事件流、下载端点
- 真实环境冒烟：手动清单写入 `docs/runbook.md`（真实链接解析、ASR/TTS/数字人各一条），不自动化以免烧费
- 前端：Vitest + Testing Library 覆盖向导校验与关键交互（脚本确认、封面选择）；不做 E2E
- 质量门槛：`pipeline/` 与 `providers/` 覆盖率 >= 80%；CI 跑 ruff + pytest

## 10. 前端页面（4 个）

1. 登录页
2. 任务列表：进度条 + 状态筛选
3. 新建任务向导：链接 → 目标行业/领域（预设 + 自由输入）与产品卖点描述 → 音色/形象/语言/字幕样式 → 提交
4. 任务详情：阶段时间线、原文案/结构分析展示、脚本确认编辑器（选版/编辑/重新生成）、字幕样式编辑面板（预设 + 微调）、封面候选网格选择器、成片预览与下载（MP4 + 所选封面 JPG）

## 11. 明确不做（YAGNI）

- 对标账号主页批量拉取与视频挑选（首期仅单条链接输入）
- 自动多平台发布、矩阵账号
- 镜头复刻/分镜迁移形态
- 自训数字人形象与音色克隆训练（仅引用商用平台资产）
- 计费与配额
- DAG 自定义编排、E2E 测试

## 12. 开源项目调研与复用策略（2026-08-07）

| 项目 | 协议 | 评估 | 结论 |
|---|---|---|---|
| MoneyPrinterTurbo（Python/FastAPI，~90k stars） | MIT | 五阶段流水线 + Provider 抽象，字幕/TTS/BGM 合成与本项目剪辑段相似；但无抖音解析、无 ASR 提取原文案、无爆款结构分析、无数字人、无审核 | 架构参照；实施阶段可借鉴其 MIT 许可的字幕生成、TTS 封装代码（标注来源） |
| ClipForge（Next.js/TS） | AGPL-3.0 | "爆款复刻"为镜头级分镜复刻，数字人唇形在 Roadmap | 不采用：协议传染性 + 技术栈不符 + 核心能力缺失 |
| Pixelle-Video（阿里，ComfyUI） | Apache-2.0 | 含数字人口播，但依赖本地模型与 GPU 自部署 | 与"全部商用 API"决策冲突，不采用 |
| MuseTalk / LiveTalking / DUIX | 各自 | 口型驱动单点能力，需 GPU 自部署 | 暂不采用；留作未来降本的备选 DigitalHumanProvider 实现 |

结论：无开源项目覆盖本项目的核心链路（解析 → ASR → 跨行业改写 → 审核 → 数字人口播），维持自建；工程模式参照 MoneyPrinterTurbo。

## 13. 假设与待定

- 六类商用 API 的具体供应商在实施计划阶段按报价与文档质量选定，本规格只约束接口契约
- 数字人环节依赖商用平台公共形象/已授权克隆资产
- FFmpeg 与 Redis 作为运行时依赖，由部署文档说明安装要求

## 14. v1.1 设计优化（2026-08-08，参照成熟全链路智能体方案）

对照成熟产品流程梳理，吸收以下优化（上文各节已同步修订）：

1. **标题话题三方案**：新增 `META_GENERATING` 阶段（脚本确认后、文本审核前），LLM 生成 3 套"标题 + 话题标签"方案存 `publish_metas` 表；标题与脚本一同过文本审核（审核未过的整改回路会连带重新生成标题）；REVIEW 阶段用户选定一套，随成片作为发布物料包输出。参考分析阶段同时提取原视频话题标签作为生成输入。
2. **封面三方案**：封面生成升级为 3 种风格方案（大字冲击/干净截帧/情绪渲染）× 每种 1-2 张，支持标题文案、配色、文字位置调参后重新生成（重生成只重跑封面阶段，不重剪）。
3. **参考音色克隆**：`TtsProvider` 增加 `clone_voice(sample_audio) -> voice_id`，用户上传参考音频后由供应商侧完成克隆，资产存 `assets` 表（kind=voice）；未克隆时回退平台公共音色。
4. **剪辑风格扩展**：任务选项新增 `title_style`（标题样式）与 `pip_config`（画中画：叠加图位置/尺寸/出现时段），与 `subtitle_style` 并列由 compose 阶段消费。
5. **发布物料包**：任务完成时导出"成片 MP4 + 选定封面 + 选中标题与话题文本"物料包，为未来自动发布预留标准化输出（自动发布本身仍不在 MVP）。

实施节奏：阶段 1 落地数据模型字段、状态机新状态与 Mock 阶段（生成逻辑全 Mock）；真实生成与交互选择（标题/封面选择器、音色上传、调参重生成）随阶段 2-4 接入。

## 15. v1.2 素材体系优化（2026-08-08）

数字人与声音为生成式产出，背景支持多方案选择：

1. **背景三来源**：数字人平台内置场景（默认，供应商引用 ID）、自建素材库（用户上传/系统缓存的检索结果）、开源免费素材库实时检索（`StockProvider`：Openverse 免 Key / Pixabay / Pexels 免费 Key，均需验证许可证后入库）。
2. **背景/画中画分开保存**：`assets` 表以 `kind`（background/pip）+ `source`（upload/openverse/pixabay/pexels/platform）双字段区分，文件系统按 `data/{user_id}/stocks/backgrounds/` 与 `pips/` 分目录；检索下载的素材缓存入库后即为自建素材库成员，后续可直接复用无需重新检索。
3. **任务级选择**：`tasks.background_asset_id` 指定背景素材；avatar 阶段优先将背景传给数字人 API（平台支持背景参数时），不支持时由 compose 阶段叠加；画中画仍由 `pip_config` 指定。
4. **检索为交互 API 而非流水线阶段**：用户在新建任务向导中搜索关键词 → `GET /api/stocks/search` 返回候选 → 选中后下载缓存入 `assets`。

实施节奏：阶段 1 落地 `StockProvider` 契约与 Mock、`assets` 分类字段、`background_asset_id`；真实检索实现（Openverse 优先，免 Key）随阶段 2 接入。
