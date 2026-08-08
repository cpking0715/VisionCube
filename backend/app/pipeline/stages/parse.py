from app.pipeline.stages._util import register_file


def run(ctx) -> None:
    result = ctx.bundle.parse.parse(ctx.task.source_url)
    ctx.task_dir.mkdir(parents=True, exist_ok=True)
    local = ctx.bundle.parse.download(result, ctx.task_dir)
    register_file(ctx, local, "source_video", "PARSING")
