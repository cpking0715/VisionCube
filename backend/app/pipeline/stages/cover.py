from app.pipeline.stages._util import latest_file, register_file


def run(ctx) -> None:
    final_video = latest_file(ctx, "final")
    if final_video is None:
        from app.core.exceptions import RecoverablePipelineError
        raise RecoverablePipelineError("NO_FINAL_VIDEO", "缺少成片")
    for i in range(3):
        cover = ctx.task_dir / f"cover_{i}.jpg"
        cover.write_bytes(b"MOCK-COVER")
        register_file(ctx, cover, "cover", "GENERATING_COVER")
    # 阶段 3 接入：3 种风格方案（大字冲击/干净截帧/情绪渲染）× 每种 1-2 张，
    # FFmpeg 抽帧 + LLM 标题 + Pillow 合成，支持调参重生成
