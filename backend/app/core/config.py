from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    # ── 基础 ──
    database_url: str = "sqlite:///./data/visioncube.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    data_root: str = "./data"
    admin_username: str = "admin"
    admin_password: str = "admin-dev-password"
    public_base_url: str = ""  # 公网可访问的基础 URL（用于文件回调）

    # ── LLM ──
    llm_provider: str = ""
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""

    # ── ASR 语音转写 ──
    asr_provider: str = ""
    asr_api_key: str = ""
    asr_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    asr_model: str = "qwen-audio-3.0-asr-flash-filetrans"
    asr_access_key_id: str = ""
    asr_access_key_secret: str = ""
    asr_app_key: str = ""
    asr_model_size: str = "large-v3"

    # ── TTS 语音合成 ──
    tts_provider: str = "edge"
    tts_voice: str = "zh-CN-XiaoxiaoNeural"
    tts_access_key_id: str = ""
    tts_access_key_secret: str = ""
    tts_app_key: str = ""

    # ── 数字人 ──
    dh_provider: str = ""
    dh_api_key: str = ""  # 火山引擎 Access Key ID
    dh_api_secret: str = ""  # 火山引擎 Secret Access Key
    dh_avatar_id: str = ""  # 默认人物图片 URL（公开可访问）
    dh_avatar_url: str = ""  # 同上，兼容字段
    dh_prompt: str = ""  # 可选：控制表情、运镜的提示词

    # ── 内容审核 ──
    moderation_provider: str = ""
    moderation_access_key_id: str = ""
    moderation_access_key_secret: str = ""

    # ── 素材库 ──
    stock_provider: str = ""
    stock_api_key: str = ""

    # ── 视频解析 ──
    parse_provider: str = "ytdlp"
    parse_douyin_cookie: str = ""
    # 抖音 cookies 文件（Netscape 格式，可用 scripts/fetch_douyin_cookies.py 刷新）
    parse_cookies_file: str = ""


settings = Settings()
