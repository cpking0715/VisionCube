"""yt-dlp 视频解析 Provider（开源免费，本地运行）

支持抖音、B站、YouTube 等 1000+ 网站视频解析和下载。
文档：https://github.com/yt-dlp/yt-dlp
"""
import json
import logging
import re
from pathlib import Path

import yt_dlp

from app.core.config import settings
from app.providers.base import ParseResult, VideoParseProvider

logger = logging.getLogger(__name__)


class YtdlpParse(VideoParseProvider):
    """yt-dlp 视频解析"""

    def __init__(self):
        self.cookie_str = settings.parse_douyin_cookie or ""
        # cookies 文件支持相对路径（相对 backend/ 目录）
        raw = (settings.parse_cookies_file or "").strip()
        self.cookie_file = ""
        if raw:
            p = Path(raw)
            if not p.is_absolute():
                p = Path(__file__).resolve().parent.parent.parent / p
            if p.exists():
                self.cookie_file = str(p)
            else:
                logger.warning("cookies 文件不存在: %s", p)

    def parse(self, url: str) -> ParseResult:
        """
        解析视频链接，获取元信息（不下载）

        Args:
            url: 视频链接（支持抖音分享文本，会自动提取 URL）

        Returns:
            ParseResult: 视频元信息
        """
        # 如果是抖音分享文本，提取 URL
        url = self._extract_url(url)

        ydl_opts = self._build_opts()

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if not info:
                raise RuntimeError(f"无法解析视频: {url}")

            # 获取最佳视频 URL
            video_url = info.get("url") or self._get_best_url(info)

            return ParseResult(
                title=info.get("title", "未知标题"),
                cover_url=info.get("thumbnail", ""),
                video_url=video_url,
                duration_sec=float(info.get("duration", 0)),
                meta={
                    "likes": info.get("like_count", 0),
                    "source_url": url,
                    "uploader": info.get("uploader", ""),
                    "description": info.get("description", ""),
                },
            )

    def download(self, parse_result: ParseResult, dest_dir: Path) -> Path:
        """
        下载视频到本地

        Args:
            parse_result: 解析结果
            dest_dir: 目标目录

        Returns:
            Path: 下载后的本地文件路径
        """
        dest_dir.mkdir(parents=True, exist_ok=True)
        out_path = dest_dir / "source.mp4"

        url = parse_result.video_url

        ydl_opts = {
            **self._build_opts(),
            "outtmpl": str(out_path),
            "format": "best[ext=mp4]/best",
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # 如果输出文件不存在（可能因为模板原因），查找实际文件
        if not out_path.exists():
            # yt-dlp 可能添加了扩展名
            for f in dest_dir.iterdir():
                if f.stem == "source" and f.suffix in (".mp4", ".webm", ".mkv"):
                    return f

        return out_path

    def _build_opts(self) -> dict:
        """构建 yt-dlp 配置"""
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "socket_timeout": 30,
            "retries": 3,
        }

        # cookies 优先级：文件 > 字符串（抖音需要新鲜 cookies，建议用文件）
        if self.cookie_file:
            opts["cookiefile"] = self.cookie_file
        elif self.cookie_str:
            opts["cookiefile"] = self._save_cookies_temp()

        return opts

    def _save_cookies_temp(self) -> str:
        """将 Cookie 字符串保存为临时文件"""
        import tempfile

        # yt-dlp 需要 Netscape 格式的 Cookie 文件
        # 如果是简单的字符串，尝试直接使用
        cookie_file = Path(tempfile.gettempdir()) / "visioncube_cookies.txt"

        # 如果是 Netscape 格式，直接写入
        if self.cookie_str.startswith("# Netscape"):
            cookie_file.write_text(self.cookie_str)
        else:
            # 尝试从浏览器 Cookie 字符串转换
            # 格式: name1=value1; name2=value2
            lines = ["# Netscape HTTP Cookie File"]
            for item in self.cookie_str.split(";"):
                item = item.strip()
                if "=" in item:
                    name, value = item.split("=", 1)
                    # Netscape 格式: domain flag path secure expiration name value
                    lines.append(f".douyin.com\tTRUE\t/\tFALSE\t0\t{name}\t{value}")
            cookie_file.write_text("\n".join(lines))

        return str(cookie_file)

    def _extract_url(self, text: str) -> str:
        """
        从文本中提取 URL

        支持：
        - 纯 URL: https://www.douyin.com/video/123
        - 抖音分享文本: 7.64 03/15 AbC:/ 复制打开抖音... https://v.douyin.com/xxx/

        Args:
            text: 可能包含 URL 的文本

        Returns:
            str: 提取的 URL
        """
        # 匹配 http/https URL
        url_pattern = r"https?://[^\s<>\"']+"
        match = re.search(url_pattern, text)

        if match:
            return match.group(0)

        # 如果没有找到 URL，假设整个文本就是 URL
        if text.startswith("http"):
            return text

        raise ValueError(f"无法从文本中提取 URL: {text[:100]}")

    def _get_best_url(self, info: dict) -> str:
        """从 info 字典中获取最佳视频 URL"""
        # 尝试从 formats 中获取最佳 MP4
        formats = info.get("formats", [])

        # 优先选择 mp4 格式
        mp4_formats = [f for f in formats if f.get("ext") == "mp4"]
        if mp4_formats:
            # 选择分辨率最高的
            best = max(mp4_formats, key=lambda f: f.get("height", 0) or 0)
            return best.get("url", "")

        # 回退到第一个有 url 的 format
        for f in formats:
            if f.get("url"):
                return f["url"]

        # 最后回退到 url 字段
        return info.get("url", "")
