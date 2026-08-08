from app.core.exceptions import RecoverablePipelineError
from app.pipeline.stages._util import require_file


def run(ctx) -> None:
    final_video = require_file(ctx, "final", "NO_FINAL_VIDEO", "缺少成片")
    result = ctx.bundle.moderation.moderate_video(final_video)
    if not result.passed:
        raise RecoverablePipelineError(
            "VIDEO_MODERATION_FAILED", "；".join(result.violations) or "成片审核未通过")
