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
    TaskStatus.AWAITING_SCRIPT: {TaskStatus.META_GENERATING, TaskStatus.REWRITING},
    TaskStatus.META_GENERATING: {TaskStatus.MODERATING_TEXT},
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
    TaskStatus.META_GENERATING, TaskStatus.MODERATING_TEXT, TaskStatus.SYNTHESIZING,
    TaskStatus.GENERATING_AVATAR,
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
