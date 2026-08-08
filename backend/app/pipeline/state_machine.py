from app.models.task import TaskStatus

TERMINAL_STATES = {TaskStatus.COMPLETED, TaskStatus.FAILED}
PAUSE_STATES = {TaskStatus.AWAITING_SCRIPT, TaskStatus.REVIEW}

# 顺序主链（供 runner 推进）
_MAIN_CHAIN: list[TaskStatus] = [
    TaskStatus.PENDING, TaskStatus.PARSING, TaskStatus.TRANSCRIBING,
    TaskStatus.ANALYZING, TaskStatus.REWRITING, TaskStatus.AWAITING_SCRIPT,
    TaskStatus.META_GENERATING, TaskStatus.MODERATING_TEXT, TaskStatus.SYNTHESIZING,
    TaskStatus.GENERATING_AVATAR,
    TaskStatus.COMPOSING, TaskStatus.GENERATING_COVER, TaskStatus.MODERATING_VIDEO,
    TaskStatus.REVIEW, TaskStatus.COMPLETED,
]

# 白名单：主链边从 _MAIN_CHAIN 派生 + 特殊边（重新生成 / 审核整改 / 重剪）
_ALLOWED: dict[TaskStatus, set[TaskStatus]] = {
    _MAIN_CHAIN[i]: {_MAIN_CHAIN[i + 1]} for i in range(len(_MAIN_CHAIN) - 1)
}
_ALLOWED[TaskStatus.AWAITING_SCRIPT].add(TaskStatus.REWRITING)  # 重新生成
_ALLOWED[TaskStatus.MODERATING_TEXT].add(TaskStatus.REWRITING)  # 审核整改回路
_ALLOWED[TaskStatus.REVIEW].add(TaskStatus.COMPOSING)           # 字幕重剪


def assert_transition(src: TaskStatus, dst: TaskStatus) -> None:
    if dst == TaskStatus.FAILED and src not in TERMINAL_STATES:
        return
    if dst in _ALLOWED.get(src, set()):
        return
    raise ValueError(f"illegal state transition: {src.value} -> {dst.value}")


def next_stage(current: TaskStatus) -> TaskStatus | None:
    idx = _MAIN_CHAIN.index(current)
    return _MAIN_CHAIN[idx + 1] if idx + 1 < len(_MAIN_CHAIN) else None
