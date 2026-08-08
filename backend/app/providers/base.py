"""六类能力的抽象接口。上层（pipeline/stages）只依赖这里定义的类型。

异常契约：实现必须将供应商错误映射为 app.core.exceptions 的三级错误
（TransientPipelineError / RecoverablePipelineError / FatalPipelineError），
禁止向调用方抛裸异常；HTTP 状态码可用 classify_http_status 快速分类。
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol, runtime_checkable


@dataclass
class ParseResult:
    title: str
    cover_url: str
    video_url: str
    duration_sec: float
    meta: dict = field(default_factory=dict)


@dataclass
class Sentence:
    text: str
    start: float  # 秒
    end: float

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class StructureAnalysis:
    hook: str
    pain_points: list[str]
    arguments: list[str]
    conversion: str
    style_notes: str  # 语速/停顿/情绪风格描述


@dataclass
class ModerationResult:
    passed: bool
    violations: list[str] = field(default_factory=list)


@dataclass
class TtsResult:
    audio_path: Path
    sentences: list[Sentence]


@dataclass
class AvatarJob:
    job_id: str
    finished: bool
    video_path: Path | None = None


class VideoParseProvider(Protocol):
    def parse(self, url: str) -> ParseResult: ...
    def download(self, parse_result: ParseResult, dest_dir: Path) -> Path: ...


@runtime_checkable  # 仅用于契约测试的 isinstance 断言
class AsrProvider(Protocol):
    def transcribe(self, audio_path: Path) -> list[Sentence]: ...


class LlmProvider(Protocol):
    def complete(self, prompt: str, *, json_mode: bool = False) -> str: ...


class TtsProvider(Protocol):
    def synthesize(
        self, text: str, voice_id: str | None, dest_dir: Path,
        *, speed: float = 1.0, emotion: str | None = None,
    ) -> TtsResult: ...
    def clone_voice(self, sample_path: Path, name: str) -> str:
        """上传参考音色样本，供应商侧克隆，返回 voice_id"""
        ...


class DigitalHumanProvider(Protocol):
    def submit(self, audio_path: Path, avatar_id: str | None,
               background: Path | None = None) -> AvatarJob: ...
    def poll(self, job: AvatarJob, dest_dir: Path) -> AvatarJob: ...


class ModerationProvider(Protocol):
    def moderate_text(self, text: str) -> ModerationResult: ...
    def moderate_video(self, video_path: Path) -> ModerationResult: ...


@dataclass
class StockItem:
    url: str
    thumb_url: str
    source: str        # openverse | pixabay | pexels
    license: str       # cc0 / pexels-license 等，入库前需验证可商用
    author: str


class StockProvider(Protocol):
    def search(self, keyword: str, limit: int = 6) -> list[StockItem]: ...
    def download(self, item: StockItem, dest_dir: Path) -> Path: ...


class MockAsr:
    def transcribe(self, audio_path: Path) -> list[Sentence]:
        return [Sentence(text="mock", start=0.0, end=1.0)]
