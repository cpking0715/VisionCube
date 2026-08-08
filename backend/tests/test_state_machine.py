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
        (TaskStatus.AWAITING_SCRIPT, TaskStatus.META_GENERATING),
        (TaskStatus.META_GENERATING, TaskStatus.MODERATING_TEXT),
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


def test_terminal_states_are_frozen():
    with pytest.raises(ValueError):
        assert_transition(TaskStatus.FAILED, TaskStatus.PARSING)
    with pytest.raises(ValueError):
        assert_transition(TaskStatus.COMPLETED, TaskStatus.FAILED)


def test_next_stage():
    assert next_stage(TaskStatus.PENDING) == TaskStatus.PARSING
    assert next_stage(TaskStatus.AWAITING_SCRIPT) == TaskStatus.META_GENERATING
    assert next_stage(TaskStatus.MODERATING_VIDEO) == TaskStatus.REVIEW
    assert next_stage(TaskStatus.COMPLETED) is None


def test_pause_states():
    assert TaskStatus.AWAITING_SCRIPT in PAUSE_STATES
    assert TaskStatus.REVIEW in PAUSE_STATES
