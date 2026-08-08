from app.core.exceptions import RecoverablePipelineError
from app.pipeline.stages._util import latest_file


def run(ctx) -> None:
    final_video = latest_file(ctx, "final")
    result = ctx.bundle.moderation.moderate_video(final_video)
    if not result.passed:
        raise RecoverablePipelineError(
            "VIDEO_MODERATION_FAILED", "；".join(result.violations) or "成片审核未通过")
