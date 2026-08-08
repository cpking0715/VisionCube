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
