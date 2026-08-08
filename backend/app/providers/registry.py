from dataclasses import dataclass

from app.providers import mock
from app.providers.base import (
    AsrProvider,
    DigitalHumanProvider,
    LlmProvider,
    ModerationProvider,
    StockProvider,
    TtsProvider,
    VideoParseProvider,
)


@dataclass
class ProviderBundle:
    parse: VideoParseProvider
    asr: AsrProvider
    llm: LlmProvider
    tts: TtsProvider
    digital_human: DigitalHumanProvider
    moderation: ModerationProvider
    stock: StockProvider


def build_mock_bundle() -> ProviderBundle:
    return ProviderBundle(
        parse=mock.MockParse(), asr=mock.MockAsr(), llm=mock.MockLlm(),
        tts=mock.MockTts(), digital_human=mock.MockDigitalHuman(),
        moderation=mock.MockModeration(), stock=mock.MockStock(),
    )
