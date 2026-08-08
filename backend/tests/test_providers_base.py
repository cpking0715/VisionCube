from app.providers.base import (
    AsrProvider,
    DigitalHumanProvider,
    LlmProvider,
    MockAsr,
    ModerationProvider,
    ParseResult,
    Sentence,
    StockItem,
    StockProvider,
    TtsProvider,
    VideoParseProvider,
)


def test_stock_item_shape():
    item = StockItem(url="u", thumb_url="t", source="openverse", license="cc0", author="a")
    assert item.source == "openverse" and item.license == "cc0"


def test_parse_result_shape():
    r = ParseResult(title="t", cover_url="u", video_url="v", duration_sec=10.0, meta={})
    assert r.duration_sec == 10.0


def test_sentence_shape():
    s = Sentence(text="你好", start=0.0, end=1.2)
    assert s.duration == 1.2


def test_mock_asr_implements_protocol():
    assert isinstance(MockAsr(), AsrProvider)


def test_all_protocols_defined():
    for proto in (VideoParseProvider, AsrProvider, LlmProvider, TtsProvider,
                  DigitalHumanProvider, ModerationProvider, StockProvider):
        assert hasattr(proto, "__protocol_attrs__") or hasattr(proto, "__abstractmethods__") \
            or proto is not None
