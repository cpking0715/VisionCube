# VisionCube 前端设计系统

> 版本：1.0.0 | 更新日期：2026-08-08 | 状态：已确认

本文档是 VisionCube 全站前端视觉与交互的唯一契约。所有页面与组件实现必须遵循本文档定义的 Token、组件规范与布局规则。

---

## 目录

1. [设计原则](#1-设计原则)
2. [Token 体系](#2-token-体系)
3. [组件规范](#3-组件规范)
4. [布局规范](#4-布局规范)
5. [页面设计规范](#5-页面设计规范)
6. [交互规范](#6-交互规范)
7. [竞品参考](#7-竞品参考)
8. [实施路线图](#8-实施路线图)

---

## 1. 设计原则

VisionCube 的设计遵循以下 5 条原则，作为所有视觉与交互决策的判断依据：

### 1.1 流程优先（Flow First）

每一步都让用户清楚知道"下一步做什么"。任务从创建到完成的 16 个状态应始终可见、可预期。操作路径不超过 3 步到达目标（如：列表 → 详情 → 确认脚本）。

**判断标准**：如果用户需要思考"我该点哪里"，则设计失败。

### 1.2 信息密度优先（Density First）

工具型产品，用户是内容创作者与营销人员，需要同时看到任务列表、状态、产物。不堆砌留白，但也不拥挤到无法阅读。在有限屏幕内展示尽可能多的有效信息。

**判断标准**：桌面端一屏应能展示 10+ 条任务列表或完整的任务详情双栏布局。

### 1.3 状态可见（State Visibility）

任务的 16 个状态（PENDING → ... → COMPLETED）与每个阶段的进度应始终一目了然。状态用颜色 + 文字 + 图标三重编码，色盲用户也能区分。失败状态应立即可见且可操作（重试按钮）。

**判断标准**：用户无需点击进入详情页即可在列表中判断任务当前处于哪个阶段。

### 1.4 容错友好（Forgiving）

破坏性操作（删除、重试、确认脚本）需二次确认。错误提示应说明原因与下一步操作（非"出错了"）。所有操作可撤销或可重试。

**判断标准**：用户不会因误操作丢失数据或无法恢复。

### 1.5 响应式原生（Responsive Native）

设计即考虑手机（375-428px）、平板（768-1024px）、桌面（1280px+）三端，非事后适配。每个组件与页面在三端均有明确的布局方案。手机端触摸目标不小于 44x44px。

**判断标准**：在 375px / 768px / 1280px 三个宽度下均无水平滚动、触摸目标可达、信息不截断。

---

## 2. Token 体系

所有视觉属性均通过 Token 引用，禁止硬编码数值。Token 分 7 类：颜色、字体、间距、圆角、阴影、边框、动效。另定义 4 个响应式断点。

### 2.1 颜色

#### 2.1.1 主色（Primary）——紫罗兰系

用于主要按钮、链接、激活状态、品牌标识。

| Token | 色值 | 用途 |
|---|---|---|
| `primary-50` | `#EEF2FF` | 选中行背景、hover 背景 |
| `primary-100` | `#E0E7FF` | Tag 背景、Badge 背景 |
| `primary-200` | `#C7D2FE` | 边框高亮 |
| `primary-300` | `#A5B4FC` | 图标激活 |
| `primary-400` | `#818CF8` | 次要按钮文字 |
| `primary-500` | `#6366F1` | **主色基准**：主按钮、链接、焦点环 |
| `primary-600` | `#4F46E5` | 按钮 hover |
| `primary-700` | `#4338CA` | 按钮 active |
| `primary-800` | `#3730A3` | 深色文字 |
| `primary-900` | `#312E81` | 极少用 |

#### 2.1.2 辅色（Secondary）——青蓝系

用于辅助信息、次要操作、图表辅色。

| Token | 色值 |
|---|---|
| `secondary-50` | `#F0F9FF` |
| `secondary-100` | `#E0F2FE` |
| `secondary-200` | `#BAE6FD` |
| `secondary-300` | `#7DD3FC` |
| `secondary-400` | `#38BDF8` |
| `secondary-500` | `#0EA5E9` |
| `secondary-600` | `#0284C7` |
| `secondary-700` | `#0369A1` |
| `secondary-800` | `#075985` |
| `secondary-900` | `#0C4A6E` |

#### 2.1.3 中性色（Gray）

用于文字、边框、背景、分割线。

| Token | 色值 | 用途 |
|---|---|---|
| `gray-0` | `#FFFFFF` | 纯白背景 |
| `gray-50` | `#F9FAFB` | 页面背景 |
| `gray-100` | `#F3F4F6` | 卡片背景、分割线 |
| `gray-200` | `#E5E7EB` | 边框 |
| `gray-300` | `#D1D5DB` | 禁用边框 |
| `gray-400` | `#9CA3AF` | 占位符文字 |
| `gray-500` | `#6B7280` | 次要文字 |
| `gray-600` | `#4B5563` | 常规文字 |
| `gray-700` | `#374151` | 标题文字 |
| `gray-800` | `#1F2937` | 强调文字 |
| `gray-900` | `#111827` | 最深文字 |

#### 2.1.4 语义色

| Token | 色值 | 用途 |
|---|---|---|
| `success` | `#10B981`（emerald-500） | 成功状态、COMPLETED |
| `success-bg` | `#ECFDF5` | 成功提示背景 |
| `warning` | `#F59E0B`（amber-500） | 警告、进行中（AWAITING_SCRIPT/REVIEW） |
| `warning-bg` | `#FFFBEB` | 警告提示背景 |
| `danger` | `#EF4444`（red-500） | 错误、FAILED、删除操作 |
| `danger-bg` | `#FEF2F2` | 错误提示背景 |
| `info` | `#3B82F6`（blue-500） | 信息提示、进行中状态 |
| `info-bg` | `#EFF6FF` | 信息提示背景 |

#### 2.1.5 状态机颜色映射

16 个任务状态的颜色映射（用于 StatusBadge 组件）：

| 状态 | 颜色 Token | 语义 |
|---|---|---|
| `PENDING` | `gray-400` | 等待开始 |
| `PARSING` | `info` | 解析中（执行中态） |
| `TRANSCRIBING` | `info` | 转写中 |
| `ANALYZING` | `info` | 分析中 |
| `REWRITING` | `info` | 改写中 |
| `AWAITING_SCRIPT` | `warning` | 等待确认（暂停点） |
| `MODERATING_TEXT` | `info` | 文本审核中 |
| `SYNTHESIZING` | `info` | 语音合成中 |
| `GENERATING_AVATAR` | `info` | 数字人生成中 |
| `COMPOSING` | `info` | 合成中 |
| `GENERATING_COVER` | `info` | 封面生成中 |
| `MODERATING_VIDEO` | `info` | 视频审核中 |
| `REVIEW` | `warning` | 等待审核（暂停点） |
| `COMPLETED` | `success` | 完成 |
| `FAILED` | `danger` | 失败 |
| `CANCELLED` | `gray-500` | 已取消（预留） |

### 2.2 字体

#### 2.2.1 字体栈

```
font-family: -apple-system, BlinkMacSystemFont, "Inter", "PingFang SC",
  "Microsoft YaHei", "Segoe UI", Roboto, sans-serif;
```

无 Web Font 依赖，使用系统字体保证加载速度。中文优先使用苹方（macOS/iOS）与微软雅黑（Windows）。

#### 2.2.2 字号梯度

| Token | rem | px | 用途 |
|---|---|---|---|
| `text-xs` | 0.75rem | 12px | 辅助文字、时间戳、Badge |
| `text-sm` | 0.875rem | 14px | 次要文字、表格内容 |
| `text-base` | 1rem | 16px | 正文（手机端基准） |
| `text-lg` | 1.125rem | 18px | 桌面端正文、小标题 |
| `text-xl` | 1.25rem | 20px | 页面标题 |
| `text-2xl` | 1.5rem | 24px | 区块标题 |
| `text-3xl` | 1.875rem | 30px | 大标题 |
| `text-4xl` | 2.25rem | 36px | 英雄区标题（极少用） |

**响应式字号规则**：
- 手机端：正文 `text-base`（16px，防 iOS 自动缩放）
- 平板端：正文 `text-base`（16px）
- 桌面端：正文 `text-sm`（14px），标题相应缩小

#### 2.2.3 字重

| Token | 值 | 用途 |
|---|---|---|
| `font-normal` | 400 | 正文 |
| `font-medium` | 500 | 强调正文、导航项 |
| `font-semibold` | 600 | 标题、按钮 |
| `font-bold` | 700 | 大标题、数字 |

#### 2.2.4 行高

| Token | 值 | 用途 |
|---|---|---|
| `leading-tight` | 1.25 | 标题 |
| `leading-normal` | 1.5 | 正文 |
| `leading-relaxed` | 1.75 | 长段落阅读 |

### 2.3 间距

#### 2.3.1 基准网格

4px 基准，所有间距为 4 的倍数：

| Token | px | rem | 用途 |
|---|---|---|---|
| `space-0` | 0 | 0 | 无间距 |
| `space-1` | 4 | 0.25 | 图标与文字间 |
| `space-2` | 8 | 0.5 | 紧凑元素间 |
| `space-3` | 12 | 0.75 | 表单元素间 |
| `space-4` | 16 | 1 | 卡片内 padding（手机） |
| `space-5` | 20 | 1.25 | 卡片内 padding（平板） |
| `space-6` | 24 | 1.5 | 卡片内 padding（桌面）、区块间距 |
| `space-8` | 32 | 2 | 大区块间距 |
| `space-10` | 40 | 2.5 | 页面区块间距 |
| `space-12` | 48 | 3 | 页面顶部/底部留白 |
| `space-16` | 64 | 4 | 大区块分隔 |

**响应式间距规则**：
- 手机端：页面 padding `space-4`（16px），卡片内 padding `space-4`
- 平板端：页面 padding `space-5`（20px），卡片内 padding `space-5`
- 桌面端：页面 padding `space-6`（24px），卡片内 padding `space-6`

### 2.4 圆角

| Token | px | 用途 |
|---|---|---|
| `rounded-none` | 0 | 无边框元素 |
| `rounded-sm` | 4 | 小元素（Badge、Tag） |
| `rounded-md` | 8 | **基准**：按钮、输入框、卡片 |
| `rounded-lg` | 12 | 大卡片、Modal |
| `rounded-xl` | 16 | 英雄区卡片 |
| `rounded-full` | 9999 | 圆形头像、环形进度 |

### 2.5 阴影

| Token | CSS 值 | 用途 |
|---|---|---|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | 卡片默认 |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | 卡片 hover、Dropdown |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | Modal、Drawer |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | 浮层最高级 |

### 2.6 边框

| Token | 值 | 用途 |
|---|---|---|
| `border-width` | 1px | 所有边框 |
| `border-color` | `gray-200` | 默认边框 |
| `border-color-focus` | `primary-500` | 焦点环 |
| `border-color-error` | `danger` | 错误输入边框 |

### 2.7 动效

| Token | 时长 | 缓动 | 用途 |
|---|---|---|---|
| `duration-fast` | 100ms | `ease-in` | hover 颜色变化 |
| `duration-normal` | 200ms | `ease-in-out` | 展开/折叠、Modal 出现 |
| `duration-slow` | 300ms | `ease-out` | 页面切换、Drawer 滑入 |

**规则**：所有过渡必须指定 `transition-property`，禁止 `transition: all`。

### 2.8 响应式断点

| Token | 最小宽度 | 典型设备 |
|---|---|---|
| `sm` | 640px | 手机横屏 |
| `md` | 768px | 平板竖屏 |
| `lg` | 1024px | 平板横屏 / 小桌面 |
| `xl` | 1280px | 桌面 |

**策略**：mobile-first，默认样式为手机端（<640px），通过 `sm:` / `md:` / `lg:` / `xl:` 前缀向上覆盖。

---

## 3. 组件规范

所有组件均定义三端变体。命名统一使用 PascalCase（React 组件）与 kebab-case（CSS 类名前缀）。

### 3.1 基础组件

#### 3.1.1 Button

**变体矩阵**：

| 变体 | 背景 | 文字 | 边框 | 用途 |
|---|---|---|---|---|
| `primary` | `primary-500` | `white` | 无 | 主操作（提交、确认） |
| `secondary` | `white` | `gray-700` | `gray-300` | 次要操作（取消、返回） |
| `ghost` | `transparent` | `gray-600` | 无 | 内联操作（表格行内） |
| `danger` | `danger` | `white` | 无 | 破坏性操作（删除） |
| `icon` | `transparent` | `gray-500` | 无 | 图标按钮（关闭、更多） |

**尺寸**：

| 尺寸 | 高度 | padding | 字号 | 用途 |
|---|---|---|---|---|
| `sm` | 32px | `space-2 space-3` | `text-sm` | 表格行内、工具栏 |
| `md` | 40px | `space-3 space-4` | `text-sm` | 默认 |
| `lg` | 48px | `space-3 space-6` | `text-base` | 主要 CTA、手机端 |

**状态**：`default` / `hover` / `active` / `disabled` / `loading`

**三端差异**：
- 桌面/平板：默认 `md` 尺寸
- 手机：主要操作按钮用 `lg`（触摸目标 >= 44px）
- `loading` 状态：按钮文字替换为 Spinner + "处理中..."，禁止点击

#### 3.1.2 Input

**变体**：`text` / `password` / `number` / `search` / `url`

**尺寸**：高度与 Button 一致（sm 32 / md 40 / lg 48）

**状态**：`default` / `focus`（`border-color-focus` + 外发光环 `primary-100`）/ `error`（`border-color-error` + 下方错误文案）/ `disabled`

**三端差异**：
- 桌面/平板：`md` 尺寸，label 在上方
- 手机：`lg` 尺寸（触摸友好），label 在上方，placeholder 颜色 `gray-400`

#### 3.1.3 Select

与 Input 同尺寸/状态。下拉面板：
- 桌面：绝对定位浮层，最大高度 300px 可滚动
- 平板：同桌面
- 手机：全屏 Drawer 从底部滑入（选项列表 + 搜索框）

#### 3.1.4 Textarea

最小高度 80px，可拉伸。行数自适应。其余同 Input。

#### 3.1.5 Checkbox / Radio

触摸目标 20x20px（含 label 整体 >= 44px 高度）。选中态 `primary-500` 填充 + 白色勾选图标。

#### 3.1.6 Label

`text-sm font-medium text-gray-700`，位于输入框上方 4px。必填项后缀红色 `*`。

#### 3.1.7 Badge

小圆角标签，用于状态展示。高度 20px，padding `space-1 space-2`，`text-xs font-medium`。

颜色与 StatusBadge 状态映射一致（见 2.1.5）。

#### 3.1.8 Tag

可关闭标签，用于筛选条件。高度 28px，padding `space-1 space-2`，右侧关闭图标。背景 `primary-100`，文字 `primary-700`。

### 3.2 反馈组件

#### 3.2.1 Toast

**类型**：`success` / `error` / `warning` / `info`

**三端差异**：
- 桌面/平板：右上角浮层，宽度 360px，`shadow-lg`，自动消失 3s（error 需手动关闭）
- 手机：底部浮层（BottomSheet 样式），宽度 100%，距底部 `space-4`，自动消失 3s

**结构**：图标 + 文案 + 关闭按钮（error 类型）

#### 3.2.2 Modal

居中浮层，背景遮罩 `rgb(0 0 0 / 0.5)`。

**三端差异**：
- 桌面/平板：居中 Dialog，最大宽度 560px，`shadow-xl`，`rounded-lg`
- 手机：全屏 Drawer 从底部滑入，高度自适应（最大 90vh），`rounded-t-xl`

**结构**：标题栏（标题 + 关闭按钮）+ 内容区 + 底部操作栏（主按钮 + 次按钮）

#### 3.2.3 Drawer

侧边滑入面板，用于详情预览、筛选面板。

**三端差异**：
- 桌面/平板：右侧滑入，宽度 480px，`shadow-xl`
- 手机：全屏覆盖（等同 Modal 手机端）

#### 3.2.4 Dialog

确认对话框，用于破坏性操作。宽度 400px，居中。结构：标题 + 描述 + 双按钮（取消 + 确认）。

手机端：底部 ActionSheet 样式（按钮垂直排列）。

#### 3.2.5 Progress

**线性**：高度 8px，圆角 full，背景 `gray-200`，填充 `primary-500`。

**环形**：直径 40/64/96px，线宽 4/6/8px。

#### 3.2.6 Spinner

环形旋转加载图标。尺寸 sm(16)/md(24)/lg(40)。颜色 `primary-500`。

#### 3.2.7 EmptyState

空态组件：插图（120x120px）+ 标题（`text-lg font-semibold`）+ 描述（`text-sm text-gray-500`）+ 行动按钮。

**三端差异**：手机端插图缩小至 80x80px，按钮宽度 100%。

#### 3.2.8 ErrorState

与 EmptyState 结构一致，但插图替换为错误图标，配色 `danger`，按钮为"重试"。

### 3.3 数据展示组件

#### 3.3.1 Table

**三端差异**：
- 桌面：完整表格，表头固定，行高 48px，hover 背景 `gray-50`
- 平板：隐藏次要列（保留核心 4-5 列），行高 44px
- 手机：转为卡片列表（每张卡片展示一行数据的关键字段），卡片间距 `space-3`

**结构**：表头（`text-sm font-semibold text-gray-600`）+ 行（`border-b border-gray-100`）+ 单元格（padding `space-3 space-4`）

#### 3.3.2 Card

容器组件，`rounded-md shadow-sm border border-gray-200 bg-white`。hover 时 `shadow-md`。

padding 响应式：手机 `space-4`、平板 `space-5`、桌面 `space-6`。

#### 3.3.3 List

垂直列表项，高度 56px（含 padding），hover 背景 `gray-50`，active 背景 `primary-50`。

手机端列表项高度 64px（触摸友好）。

#### 3.3.4 Timeline

阶段日志时间线。

**三端差异**：
- 桌面/平板：垂直时间线，左侧时间点 + 右侧内容卡片
- 手机：水平滚动时间线（`overflow-x-auto`），每个节点宽度 120px

#### 3.3.5 Stat

数字 + 标签展示（如"总任务数 42"）。数字 `text-2xl font-bold`，标签 `text-sm text-gray-500`。

### 3.4 导航组件

#### 3.4.1 TopNav

高度 64px（桌面/平板）/ 56px（手机），背景 `white`，底部边框 `border-gray-200`。

**桌面/平板**：左侧 Logo + 中间搜索框（可选）+ 右侧用户头像 + 通知图标

**手机**：左侧 Logo + 右侧用户头像（简化，搜索移入页面内容）

#### 3.4.2 SideNav

**桌面**：宽度 240px（展开）/ 64px（折叠），背景 `gray-50`，右侧边框。可折叠按钮在底部。

**平板**：宽度 64px（icon-only），点击汉堡图标展开为 overlay Drawer（宽度 240px）。

**手机**：隐藏，由 BottomNav 替代。

**导航项**：高度 40px，padding `space-2 space-4`，`text-sm font-medium`。选中态：背景 `primary-50`，文字 `primary-700`，左侧 3px 主色指示条。

#### 3.4.3 BottomNav

仅手机端显示（<768px）。高度 56px，背景 `white`，顶部边框。4-5 个导航项（首页/新建/消息/我的），每个项为图标 + 文字（`text-xs`）。选中态图标颜色 `primary-500`。

#### 3.4.4 Breadcrumb

面包屑导航，`text-sm text-gray-500`，分隔符 `/`。当前页 `text-gray-900 font-medium`。

手机端隐藏（由页面标题 + 返回按钮替代）。

#### 3.4.5 Tabs

**桌面/平板**：文字标签，底部指示线 `primary-500` 2px。

**手机**：图标 + 文字（如空间不足则纯图标 + Tooltip），标签可横向滚动。

### 3.5 业务组件

#### 3.5.1 TaskCard

任务卡片（手机端列表项替代表格行）。结构：
- 顶部：任务标题 + StatusBadge
- 中部：源链接（截断）+ 行业标签 + 创建时间
- 底部：操作按钮（查看详情）

高度自适应，padding `space-4`，`rounded-md shadow-sm`。

#### 3.5.2 StatusBadge

状态徽章，封装 2.1.5 的状态颜色映射。结构：圆点图标（8px）+ 状态文字。高度 24px，padding `space-1 space-2`，`rounded-full`。

#### 3.5.3 StageTimeline

阶段时间线（任务详情页核心组件）。

**桌面/平板**：垂直布局，左侧时间点（图标 + 阶段名 + 耗时）+ 右侧内容卡片（状态 + 产物预览 + 操作按钮）。当前阶段高亮 `primary-100` 背景。

**手机**：水平滚动，每个节点宽度 120px，点击展开详情 Drawer。

#### 3.5.4 ScriptEditor

脚本编辑器（AWAITING_SCRIPT 阶段）。

**桌面**：双栏布局——左侧脚本列表（radio 选择）+ 右侧预览/编辑区。

**平板**：上下堆叠——上方脚本列表 + 下方编辑区。

**手机**：Tab 切换——"选择脚本" Tab + "编辑/预览" Tab。

#### 3.5.5 CoverPicker

封面候选网格选择器（REVIEW 阶段）。

**桌面**：3 列网格，每张封面卡片 200x120px。

**平板**：2 列网格。

**手机**：1 列列表，每张封面宽度 100%。

选中态：`primary-500` 边框 2px + 左上角勾选图标。

#### 3.5.6 SubtitleStylePanel

字幕样式编辑面板（REVIEW 阶段）。结构：预设样式网格 + 微调面板（字体/字号/颜色/描边/位置）。

**桌面**：左右分栏——左侧预设网格 + 右侧微调。

**手机**：上下堆叠——上方预设横向滚动 + 下方微调表单。

#### 3.5.7 AssetPicker

素材选择器（资产库/素材检索）。结构：搜索框 + 分类筛选 + 网格/列表视图切换 + 素材卡片。

**桌面**：4 列网格。

**平板**：3 列网格。

**手机**：1 列列表（卡片宽度 100%）。

---

## 4. 布局规范（三端适配）

### 4.1 AppShell 全局骨架

AppShell 是所有已登录页面的外层布局框架，由 TopNav + 导航区 + Main 内容区组成。三端布局差异显著。

#### 4.1.1 桌面（>=1024px）

```
+--------------------------------------------------+
| TopNav (64px)                                    |
+--------+-----------------------------------------+
| SideNav| Main                                    |
| 240px  | max-width: 1280px                       |
| 可折叠 | padding: 24px                           |
| 至 64px|                                         |
+--------+-----------------------------------------+
```

- TopNav：固定顶部，高度 64px，背景 `white`，底部边框
- SideNav：左侧，宽度 240px（展开）/ 64px（折叠），背景 `gray-50`，右侧边框
- Main：内容区，`max-width: 1280px` 居中，`padding: 24px`

#### 4.1.2 平板（768-1023px）

```
+------------------------------------------+
| TopNav (64px)                            |
+------+-----------------------------------+
| Side | Main                              |
| 64px | padding: 20px                     |
| icon | 流式宽度                           |
+------+-----------------------------------+
```

- TopNav：固定顶部，高度 64px
- SideNav：左侧 icon-only 模式，宽度 64px，点击汉堡图标展开为 overlay Drawer（宽度 240px，遮罩层）
- Main：内容区，流式宽度（无 max-width 限制），`padding: 20px`

#### 4.1.3 手机（<768px）

```
+--------------------------+
| TopNav (56px)            |
+--------------------------+
| Main                     |
| padding: 16px            |
| 全屏宽度               |
|                          |
| (padding-bottom: 72px    |
|  为 BottomNav 留空间)   |
+--------------------------+
| BottomNav (56px)         |
+--------------------------+
```

- TopNav：简化版，高度 56px，仅 Logo + 用户头像
- 无 SideNav，由 BottomNav 替代
- Main：全屏宽度，`padding: 16px`，`padding-bottom: 72px`（为 BottomNav 留空间）
- BottomNav：固定底部，高度 56px，背景 `white`，顶部边框

### 4.2 栅格系统

| 设备 | 列数 | gap | 用途 |
|---|---|---|---|
| 桌面 | 12 | 24px | 复杂布局（双栏/三栏） |
| 平板 | 8 | 20px | 简化布局（双栏） |
| 手机 | 4 | 16px | 单列布局 |

### 4.3 容器断点

| Token | 最小宽度 | 用途 |
|---|---|---|
| `container-sm` | 640px | 手机横屏 |
| `container-md` | 768px | 平板竖屏 |
| `container-lg` | 1024px | 平板横屏 |
| `container-xl` | 1280px | 桌面 |

---

## 5. 页面设计规范

### 5.1 Login 登录页

**布局**：

- **桌面/平板**：页面背景 `gray-50`，居中卡片（`max-w: 400px`），卡片内包含：Logo（顶部居中）+ 标题"登录 VisionCube" + 用户名输入框 + 密码输入框 + 登录按钮（宽度 100%）+ 错误提示区
- **手机**：全屏布局，卡片占满屏幕（`padding: 24px`），Logo 缩小至 48x48px

**关键交互**：
- 输入框 focus 时显示焦点环
- 登录按钮点击后进入 loading 状态（Spinner + "登录中..."）
- 登录失败：输入框下方显示红色错误文案（"用户名或密码错误"）
- 登录成功：跳转至 TaskList（`/`）

**状态处理**：
- 空输入：登录按钮 disabled
- 网络错误：Toast 提示"网络异常，请重试"
- 已登录：自动跳转至 TaskList

### 5.2 TaskList 任务列表页

**布局**：

- **桌面**：顶部工具栏（左侧页面标题"我的任务" + 右侧搜索框 + 新建按钮）+ 状态筛选 Tab（全部/进行中/已完成/失败）+ 表格视图（列：任务名称、源链接、行业、状态、创建时间、操作）
- **平板**：同桌面，但表格隐藏"源链接"列（保留核心 4 列）
- **手机**：顶部标题 + 搜索框（全宽）+ 状态筛选 Tab（横向滚动）+ 卡片列表（每张 TaskCard 展示任务名称、行业、状态、创建时间）+ 右下角 FAB 新建按钮（56x56px 圆形，`primary-500` 背景，白色 + 图标）

**关键交互**：
- 表格行 hover 背景 `gray-50`
- 点击行跳转至 TaskDetail
- 状态筛选 Tab 切换后表格/列表重新加载（2s 轮询保持）
- 搜索框输入后 300ms 防抖过滤
- 空态：EmptyState 组件（"还没有任务，立即新建" + 按钮）
- 加载中：骨架屏（5 行卡片占位）

**状态处理**：
- 加载失败：ErrorState + "重试"按钮
- 任务状态实时更新（2s 轮询），StatusBadge 颜色动态变化

### 5.3 NewTask 新建任务向导页

**布局**：

- **桌面/平板**：顶部进度指示器（4 步：链接 → 行业/卖点 → 音色/形象/字幕 → 确认）+ 步骤内容区（居中 `max-w: 640px`）+ 底部操作栏（上一步/下一步/提交按钮）
- **手机**：顶部进度指示器（简化为圆点 + 连线）+ 步骤内容区（全屏宽，每步占满一屏）+ 底部固定操作栏

**4 步向导内容**：

1. **链接**：源链接输入框（url 类型，placeholder "粘贴抖音分享链接"）+ 链接格式校验提示
2. **行业/卖点**：行业下拉选择（预设列表 + "其他"自由输入）+ 产品卖点 Textarea
3. **音色/形象/字幕**：音色选择（下拉，预留）+ 形象选择（下拉，预留）+ 字幕样式预设网格（4-6 个预设卡片）
4. **确认**：汇总卡片展示所有填写内容 + 提交按钮

**关键交互**：
- 进度指示器当前步高亮 `primary-500`，已完成步显示勾选图标
- 每步可点击进度指示器回跳（已填内容保留）
- 提交按钮点击后进入 loading 状态，成功后跳转至 TaskDetail
- 链接格式错误：输入框下方红色提示"请输入有效的 http/https 链接"

### 5.4 TaskDetail 任务详情页

**布局**：

- **桌面**：顶部状态横幅（任务名称 + StatusBadge + 创建时间）+ 左右分栏（左侧 60% StageTimeline 阶段时间线 + 右侧 40% 操作面板）
- **平板**：顶部状态横幅 + 上下堆叠（上方 StageTimeline 折叠展示 + 下方操作面板）
- **手机**：顶部状态横幅（简化）+ 全纵向滚动（StageTimeline 水平滚动 + 操作面板垂直排列）+ 底部固定操作栏（确认/完成/重试按钮）

**操作面板内容（根据状态动态展示）**：

- `AWAITING_SCRIPT`：ScriptEditor 组件（脚本选择 + 编辑）+ "确认该版"按钮
- `REVIEW`：CoverPicker 组件 + SubtitleStylePanel 组件 + "完成审核"按钮
- `FAILED`：错误信息卡片（error_code + error_message）+ "从失败阶段重试"按钮
- `COMPLETED`：产物下载列表（成片 MP4 + 封面 JPG）+ 下载按钮

**关键交互**：
- StageTimeline 实时展示阶段进度（2s 轮询）
- 操作按钮点击后进入 loading 状态 + disabled 防重复
- 操作失败：Toast 提示"操作失败，请重试"
- 确认脚本成功后：操作面板切换至下一阶段内容
- 下载按钮：解析 content-disposition 获取文件名，触发浏览器下载

### 5.5 阶段 2 新页面（初步布局规划）

#### 5.5.1 发布物料管理页

**布局**：
- **桌面**：顶部工具栏（标题 + 新建发布计划按钮）+ 卡片网格（3 列，每张卡片展示发布平台、状态、关联任务）
- **平板**：2 列卡片网格
- **手机**：单列卡片列表

#### 5.5.2 资产库页

**布局**：
- **桌面**：左侧分类导航（音频/视频/图片/字体）+ 右侧 AssetPicker 组件（4 列网格）
- **平板**：顶部分类 Tab + AssetPicker（3 列网格）
- **手机**：顶部分类 Tab（横向滚动）+ AssetPicker（1 列列表）

#### 5.5.3 音色管理页

**布局**：
- **桌面/平板**：音色列表（表格形式，列：音色名称、语言、时长、操作）+ 上传克隆按钮
- **手机**：音色卡片列表（每张卡片展示名称 + 播放按钮 + 操作菜单）

#### 5.5.4 设置页

**布局**：
- **桌面/平板**：左侧设置分类导航（账号/通知/安全/API）+ 右侧设置表单
- **手机**：设置分类垂直列表 + 点击展开对应设置表单

---

## 6. 交互规范

### 6.1 加载状态

| 场景 | 组件 | 说明 |
|---|---|---|
| 列表/卡片页初始加载 | 骨架屏（Skeleton） | 5 行占位卡片，灰色闪烁动画 |
| 按钮操作进行中 | Button loading 态 | Spinner + "处理中..."，按钮 disabled |
| 局部数据加载 | Spinner | 居中显示，尺寸 md(24px) |
| 长任务进度 | Progress 环形/线性 | 展示百分比，可取消 |
| 页面切换 | 顶部细线 Progress | 类似 YouTube 顶部加载线 |

### 6.2 错误处理

| 级别 | 组件 | 展示方式 | 自动消失 |
|---|---|---|---|
| 表单字段错误 | Input error 态 + 下方红色文案 | 内联，立即显示 | 否（修正后消失） |
| 操作失败 | Toast error | 桌面右上角 / 手机底部 | 否（手动关闭） |
| 网络异常 | Toast error | 同上 | 否 |
| 5xx 服务器错误 | ErrorState 全屏 | 居中展示 + "重试"按钮 | 否 |
| 401 未登录 | 自动跳转 /login | 清 token + 跳转 | - |

### 6.3 空态

每个列表/网格组件均需设计空态。结构：

1. 插图（120x120px，桌面；80x80px，手机）——灰色调插画风格
2. 标题（`text-lg font-semibold text-gray-700`）——如"还没有任务"
3. 描述（`text-sm text-gray-500`）——如"创建一个新任务开始体验"
4. 行动按钮（Button primary）——如"立即新建"

### 6.4 确认操作

破坏性操作必须二次确认：

- **桌面/平板**：Dialog 居中弹窗（标题 + 描述 + 双按钮）
- **手机**：ActionSheet 底部弹出（按钮垂直排列）

需确认的操作：
- 删除任务/资产
- 重试任务（从失败阶段重新执行）
- 确认脚本（不可撤回）

### 6.5 操作反馈

| 场景 | 反馈方式 | 时长 |
|---|---|---|
| 操作成功 | Toast success | 3s 自动消失 |
| 操作失败 | Toast error | 手动关闭 |
| 操作进行中 | Button loading + disabled | 操作完成自动恢复 |
| 复制成功 | Toast info "已复制" | 1.5s 自动消失 |

### 6.6 触摸交互（手机端专有）

| 手势 | 场景 | 行为 |
|---|---|---|
| 点击 | 所有可交互元素 | 触发操作（触摸目标 >= 44x44px） |
| 长按 | 列表项 | 弹出操作菜单（编辑/删除） |
| 左滑 | 列表项 | 露出删除按钮（红色背景） |
| 下拉 | 列表页 | 下拉刷新（Progress 环形） |
| 双指缩放 | 图片预览 | 放大/缩小 |
| 左右滑动 | 图片轮播 | 切换图片 |

**触摸目标规则**：
- 所有可点击元素最小 44x44px（Apple HIG 标准）
- 相邻可点击元素间距 >= 8px
- 图标按钮用透明 padding 扩展触摸区域

---

## 7. 竞品参考

### 7.1 竞品分析表

| 产品 | 主色 | 主题 | 布局 | 信息密度 | 值得借鉴 |
|---|---|---|---|---|---|
| Linear | 紫色 #5E6AD2 | 深色为主 | TopNav + SideNav | 高 | 极简美学、键盘优先、侧边栏折叠动画 |
| Runway | 紫色渐变 | 深色 | TopNav + 工具栏 | 中 | AI 感视觉、卡片式结果展示、渐变点缀 |
| HeyGen | 蓝色 #2563EB | 浅色 | TopNav + SideNav | 中 | 清晰的信息层级、引导式流程 |
| 剪映/CapCut | 蓝色 | 深色 | 多面板 | 极高 | 时间线交互、多面板同时可见、专业工具感 |
| Vercel Dashboard | 黑白 + 蓝 | 深色/浅色 | TopNav + SideNav | 中高 | 极简黑白、卡片式布局、开发者体验 |

### 7.2 VisionCube 设计提取

从竞品中提取的设计方向：

- **Linear 的简洁**：大量留白但不浪费空间，细线边框，微妙阴影，紫色强调色
- **剪映的信息密度**：任务详情页双栏布局，状态始终可见，多信息同时展示
- **Runway 的 AI 感**：紫色主色 + 微妙渐变点缀，体现智能创作工具定位
- **HeyGen 的流程引导**：向导式新建任务、进度指示器、状态可见性
- **Vercel 的开发者体验**：键盘快捷键预留、极简配色、快速导航

### 7.3 情绪板关键词

`专业` `简洁` `高效` `可信赖` `AI 感` `创作工具` `紫罗兰` `信息密度` `响应式` `触摸友好`

---

## 8. 实施路线图

DESIGN.md 交付后的后续任务（本计划不执行，仅记录）：

### 阶段 A：组件库建立 + Token 注入

1. 在 `tailwind.config.js` 中注入全部 Token（颜色/字体/间距/圆角/阴影/动效/断点）
2. 在 `index.css` 中定义 CSS 变量（为未来深色主题预留）
3. 建立 `frontend/src/components/ui/` 目录，实现基础组件（Button/Input/Select/Badge/Tag/Card/Modal/Toast/Spinner/EmptyState）
4. 建立 `frontend/src/components/layout/` 目录，实现 TopNav/SideNav/BottomNav/AppShell

### 阶段 B：AppShell 全局布局 + 现有 4 页迁移

1. 实现 AppShell 三端布局（桌面/平板/手机）
2. 迁移 Login 页至新设计
3. 迁移 TaskList 页至新设计（表格 + 卡片列表三端适配）
4. 迁移 NewTask 页至新设计（分步向导）
5. 迁移 TaskDetail 页至新设计（双栏 + StageTimeline）

### 阶段 C：业务组件 + 阶段 2 新页面

1. 实现业务组件（StatusBadge/StageTimeline/ScriptEditor/CoverPicker/SubtitleStylePanel/AssetPicker/TaskCard）
2. 实现发布物料管理页
3. 实现资产库页
4. 实现音色管理页
5. 实现设置页

---

*本文档由 VisionCube 团队维护，版本变更请更新顶部版本号与日期。*
