"""Edge TTS Provider（微软 Edge 浏览器 TTS，免费）

使用 edge-tts 库调用微软 Edge 浏览器的 TTS 服务，完全免费，无需 API Key。
文档：https://github.com/rany2/edge-tts
"""
import asyncio
import logging
from pathlib import Path

import edge_tts

from app.core.config import settings
from app.providers.base import TtsProvider, TtsResult, Sentence

logger = logging.getLogger(__name__)


class EdgeTts(TtsProvider):
    """Edge TTS（免费）"""

    def __init__(self):
        self.voice = settings.tts_voice or "zh-CN-XiaoxiaoNeural"

    async def synthesize(
        self,
        text: str,
        voice_id: str | None,
        dest_dir: Path,
        *,
        speed: float = 1.0,
        emotion: str | None = None,
    ) -> TtsResult:
        """
        将文本合成为语音
        
        Args:
            text: 要合成的文本
            voice_id: 音色 ID（可选，覆盖默认音色）
            dest_dir: 输出目录
            speed: 语速（0.5-2.0，1.0 为正常）
            emotion: 情感（Edge TTS 不支持，忽略）
        
        Returns:
            TtsResult 包含音频文件路径和句子时间戳
        """
        dest_dir.mkdir(parents=True, exist_ok=True)
        output_file = dest_dir / "tts_output.mp3"
        
        voice = voice_id or self.voice
        logger.info(f"Edge TTS 合成，音色: {voice}，语速: {speed}，文本长度: {len(text)}")
        
        # 调整语速（Edge TTS 使用 +XX% 或 -XX% 格式）
        rate = self._convert_speed(speed)
        
        # 使用 edge-tts 合成
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        
        # 保存音频并收集时间戳
        sentences = []
        current_time = 0.0
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                # 写入音频数据
                with open(output_file, "ab") as f:
                    f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # 收集词级别时间戳
                offset = chunk["offset"] / 10_000_000  # 100ns 转秒
                duration = chunk["duration"] / 10_000_000
                text_part = chunk["text"]
                
                # 简单的句子分割（按标点）
                if any(p in text_part for p in "。！？；"):
                    sentences.append(Sentence(
                        text=text_part,
                        start=offset,
                        end=offset + duration,
                    ))
        
        # 如果没有检测到句子边界，返回整个文本作为一个句子
        if not sentences:
            # 获取音频时长
            audio_duration = await self._get_audio_duration(output_file)
            sentences.append(Sentence(
                text=text,
                start=0.0,
                end=audio_duration,
            ))
        
        logger.info(f"TTS 合成完成，音频: {output_file}，句子数: {len(sentences)}")
        
        return TtsResult(
            audio_path=output_file,
            sentences=sentences,
        )

    def _convert_speed(self, speed: float) -> str:
        """
        将语速转换为 Edge TTS 格式
        
        Edge TTS 使用 +XX% 或 -XX% 格式
        1.0 = +0%, 1.5 = +50%, 0.5 = -50%
        """
        if speed == 1.0:
            return "+0%"
        elif speed > 1.0:
            percent = int((speed - 1.0) * 100)
            return f"+{percent}%"
        else:
            percent = int((1.0 - speed) * 100)
            return f"-{percent}%"

    async def _get_audio_duration(self, audio_path: Path) -> float:
        """
        获取音频文件时长（秒）
        
        使用 mutagen 库读取 MP3 时长
        """
        try:
            from mutagen.mp3 import MP3
            audio = MP3(audio_path)
            return audio.info.length
        except ImportError:
            logger.warning("mutagen 未安装，无法获取音频时长")
            return 0.0
        except Exception as e:
            logger.warning(f"获取音频时长失败: {e}")
            return 0.0

    async def clone_voice(self, sample_path: Path, name: str) -> str:
        """
        克隆音色（Edge TTS 不支持）
        
        Edge TTS 是预定义音色，不支持克隆。
        返回空字符串表示不支持。
        """
        logger.warning("Edge TTS 不支持音色克隆")
        return ""

    async def list_voices(self) -> list[dict]:
        """
        列出可用的音色
        
        Returns:
            音色列表，每个包含 id, name, language 等
        """
        voices = await edge_tts.list_voices()
        
        # 过滤中文音色
        zh_voices = [
            {
                "id": v["ShortName"],
                "name": v["FriendlyName"],
                "language": v["Locale"],
                "gender": v.get("Gender", "Unknown"),
            }
            for v in voices
            if v["Locale"].startswith("zh-")
        ]
        
        return zh_voices
