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
