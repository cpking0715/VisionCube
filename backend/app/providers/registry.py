"""Provider 注册表

根据配置构建 ProviderBundle，支持 Mock 和真实 Provider 切换。
"""
from dataclasses import dataclass

from app.core.config import settings
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


def build_provider_bundle() -> ProviderBundle:
    """
    根据配置构建 ProviderBundle
    
    优先级：
    1. 如果配置了对应 Provider，使用真实实现
    2. 否则使用 Mock 实现
    """
    # LLM
    if settings.llm_provider == "deepseek" and settings.llm_api_key:
        from app.providers.deepseek_llm import DeepSeekLlm
        llm = DeepSeekLlm()
    else:
        llm = mock.MockLlm()
    
    # ASR
    if settings.asr_provider == "dashscope" and settings.asr_api_key:
        from app.providers.dashscope_asr import DashScopeAsr
        asr = DashScopeAsr()
    else:
        asr = mock.MockAsr()
    
    # TTS
    if settings.tts_provider == "edge":
        from app.providers.edge_tts import EdgeTts
        tts = EdgeTts()
    else:
        tts = mock.MockTts()
    
    # 视频解析（yt-dlp，开源免费）
    if settings.parse_provider == "ytdlp":
        from app.providers.ytdlp_parse import YtdlpParse
        parse = YtdlpParse()
    else:
        parse = mock.MockParse()
    # 数字人
    if settings.dh_provider == "omnihuman" and settings.dh_api_key and settings.dh_api_secret:
        from app.providers.omnihuman_dh import OmniHumanDigitalHuman
        digital_human = OmniHumanDigitalHuman()
    else:
        digital_human = mock.MockDigitalHuman()
    moderation = mock.MockModeration()
    stock = mock.MockStock()
    
    return ProviderBundle(
        parse=parse,
        asr=asr,
        llm=llm,
        tts=tts,
        digital_human=digital_human,
        moderation=moderation,
        stock=stock,
    )


# 向后兼容：保留 build_mock_bundle
def build_mock_bundle() -> ProviderBundle:
    """构建全 Mock Bundle（用于测试）"""
    return ProviderBundle(
        parse=mock.MockParse(),
        asr=mock.MockAsr(),
        llm=mock.MockLlm(),
        tts=mock.MockTts(),
        digital_human=mock.MockDigitalHuman(),
        moderation=mock.MockModeration(),
        stock=mock.MockStock(),
    )
