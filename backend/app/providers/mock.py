"""全 Mock 实现：阶段 1 不依赖任何外部服务即可端到端跑通。"""
import json
from pathlib import Path

from app.providers.base import (
    AvatarJob,
    ModerationResult,
    ParseResult,
    Sentence,
    StockItem,
    TtsResult,
)

_SAMPLE_SCRIPT = "你知道吗，这个问题困扰了百分之九十的人。其实解决方案很简单。第一步，明确目标。第二步，立即行动。现在就试试吧。"

# 分支判别词：与 Task 9 各阶段 prompt 对应（顺序敏感：scripts 需先于 structure 检测，
# 因为 rewrite 的 prompt 同时包含"爆款结构"与"scripts"）
_PROMPT_TITLE = "标题与话题"
_PROMPT_SCRIPTS = "改写脚本"
_PROMPT_STRUCTURE = "爆款结构"


class MockParse:
    def parse(self, url: str) -> ParseResult:
        return ParseResult(
            title="Mock 爆款视频", cover_url="https://example.com/cover.jpg",
            video_url="https://example.com/video.mp4", duration_sec=10.0,
            meta={"likes": 100000, "source_url": url},
        )

    def download(self, parse_result: ParseResult, dest_dir: Path) -> Path:
        dest_dir.mkdir(parents=True, exist_ok=True)
        out = dest_dir / "source.mp4"
        out.write_bytes(b"MOCK-VIDEO-BYTES")
        return out


class MockAsr:
    def transcribe(self, audio_path: Path) -> list[Sentence]:
        parts = _SAMPLE_SCRIPT.replace("。", "。|").split("|")[:-1]
        sentences, t = [], 0.0
        for p in parts:
            dur = max(1.0, len(p) * 0.25)
            sentences.append(Sentence(text=p, start=t, end=t + dur))
            t += dur
        return sentences


class MockLlm:
    def complete(self, prompt: str, *, json_mode: bool = False) -> str:
        if _PROMPT_TITLE in prompt:
            return json.dumps({"options": [
                {"title": f"Mock标题{i}", "hashtags": ["#爆款", "#推荐"]}
                for i in range(1, 4)
            ]}, ensure_ascii=False)
        if _PROMPT_SCRIPTS in prompt:
            return json.dumps({"scripts": [_SAMPLE_SCRIPT, _SAMPLE_SCRIPT + "变体二"]},
                              ensure_ascii=False)
        if _PROMPT_STRUCTURE in prompt or "structure" in prompt.lower():
            return json.dumps({
                "hook": "提问开场", "pain_points": ["效率低"],
                "arguments": ["方法简单"], "conversion": "行动号召",
                "style_notes": "语速快、情绪饱满",
            }, ensure_ascii=False)
        if json_mode:
            return json.dumps({"scripts": [_SAMPLE_SCRIPT, _SAMPLE_SCRIPT + "变体二"]},
                              ensure_ascii=False)
        return _SAMPLE_SCRIPT


class MockTts:
    def synthesize(
        self, text: str, voice_id: str | None, dest_dir: Path,
        *, speed: float = 1.0, emotion: str | None = None,
    ) -> TtsResult:
        dest_dir.mkdir(parents=True, exist_ok=True)
        audio = dest_dir / "voice.mp3"
        audio.write_bytes(b"MOCK-AUDIO-BYTES")
        parts = [p for p in text.replace("。", "。|").split("|") if p]
        sentences, t = [], 0.0
        for p in parts:
            dur = max(1.0, len(p) * 0.25)
            sentences.append(Sentence(text=p, start=t, end=t + dur))
            t += dur
        return TtsResult(audio_path=audio, sentences=sentences)

    def clone_voice(self, sample_path: Path, name: str) -> str:
        return "mock-voice-1"


class MockStock:
    def search(self, keyword: str, limit: int = 6) -> list[StockItem]:
        # Mock 素材池上限 3；limit<=0 返回空列表
        n = max(0, min(limit, 3))
        return [StockItem(url=f"https://example.com/{keyword}-{i}.jpg",
                          thumb_url=f"https://example.com/{keyword}-{i}_t.jpg",
                          source="mock", license="cc0", author="mock")
                for i in range(n)]

    def download(self, item: StockItem, dest_dir: Path) -> Path:
        dest_dir.mkdir(parents=True, exist_ok=True)
        out = dest_dir / "stock.jpg"
        out.write_bytes(b"MOCK-STOCK")
        return out


class MockDigitalHuman:
    def submit(self, audio_path: Path, avatar_id: str | None,
               background: Path | None = None) -> AvatarJob:
        return AvatarJob(job_id="mock-job-1", finished=False)

    def poll(self, job: AvatarJob, dest_dir: Path) -> AvatarJob:
        dest_dir.mkdir(parents=True, exist_ok=True)
        video = dest_dir / "avatar.mp4"
        video.write_bytes(b"MOCK-AVATAR-VIDEO")
        return AvatarJob(job_id=job.job_id, finished=True, video_path=video)


class MockModeration:
    def moderate_text(self, text: str) -> ModerationResult:
        return ModerationResult(passed=True)

    def moderate_video(self, video_path: Path) -> ModerationResult:
        return ModerationResult(passed=True)
