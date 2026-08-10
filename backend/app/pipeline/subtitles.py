"""字幕工具：TTS 句子 → ASS 字幕 → FFmpeg 烧录到成片。

供 COMPOSING 阶段使用；样式来自 Task.subtitle_style（前端 SubtitleStylePanel 的
SubtitleStyle 结构），缺省为白字黑描边底部。
"""
import logging
import re
import subprocess

logger = logging.getLogger(__name__)

MAX_CHARS = 14  # 字幕段最大字符数（中文口播经验值）

_POSITION_ALIGN = {"top": 8, "middle": 5, "bottom": 2}
_POSITION_MARGIN_V = {"top": 40, "middle": 0, "bottom": 60}
_DEFAULT_STYLE = {
    "fontSize": 32,
    "color": "#FFFFFF",
    "stroke": True,
    "position": "bottom",
}


def split_sentences(sentences: list[dict], max_chars: int = MAX_CHARS) -> list[dict]:
    """把 TTS 句子切成适合显示的字幕段。

    - 按标点（，。！？；、,.!?;）优先拆分，再贪心合并到 <= max_chars 字
    - 每段时间按该段字数占总字数的比例分配
    """
    segments: list[dict] = []
    for s in sentences:
        text = (s.get("text") or "").strip()
        if not text:
            continue
        start, end = float(s.get("start", 0.0)), float(s.get("end", 0.0))
        duration = max(end - start, 0.1)
        parts = [p for p in re.split(r"([，。！？；、,.!?;])", text) if p.strip()]
        if not parts:
            continue
        merged: list[str] = []
        buf = ""
        for p in parts:
            if buf and len(buf) + len(p) > max_chars:
                merged.append(buf)
                buf = p
            else:
                buf += p
        if buf:
            merged.append(buf)
        total_chars = sum(len(m) for m in merged)
        t = start
        for m in merged:
            seg_dur = duration * len(m) / total_chars
            segments.append({"text": m.strip(), "start": t, "end": t + seg_dur})
            t += seg_dur
    return segments


def _ass_color(hex_color: str) -> str:
    """#RRGGBB -> ASS &HAABBGGRR（ASS 颜色为 BGR 序）"""
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return "&H00FFFFFF"
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"


def _ass_time(seconds: float) -> str:
    ms = max(0, round(seconds * 100))
    h, rem = divmod(ms, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def render_ass(segments: list[dict], width: int, height: int,
               style: dict | None = None) -> str:
    """渲染 ASS 字幕文本。fontSize 以 720 高度为基准缩放。"""
    cfg = {**_DEFAULT_STYLE, **(style or {})}
    font_size = max(12, round(cfg["fontSize"] * height / 720))
    color = _ass_color(cfg["color"])
    outline = 3 if cfg["stroke"] else 0
    position = cfg["position"] if cfg["position"] in _POSITION_ALIGN else "bottom"
    align = _POSITION_ALIGN[position]
    margin_v = _POSITION_MARGIN_V[position]
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {width}",
        f"PlayResY: {height}",
        "WrapStyle: 0",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,Microsoft YaHei,{font_size},{color},&H000000FF,"
        f"&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,{outline},0,"
        f"{align},40,40,{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, "
        "Effect, Text",
    ]
    for seg in segments:
        lines.append(
            f"Dialogue: 0,{_ass_time(seg['start'])},{_ass_time(seg['end'])},"
            f"Default,,0,0,0,,{seg['text']}"
        )
    return "\n".join(lines) + "\n"


def probe_video_size(video_path) -> tuple[int, int]:
    """ffprobe 探测视频宽高。"""
    from static_ffmpeg import add_paths

    add_paths()
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    w, h = out.split()
    return int(w), int(h)


def burn_subtitles(video_path, ass_path, out_path) -> None:
    """用 FFmpeg 把 ASS 字幕烧录进视频（libx264 重编码视频，音频流拷贝）。

    ass_path 与 out_path 需与 video_path 同目录或使用绝对路径；subtitles filter
    在 Windows 上对路径冒号敏感，故以 ass_path 所在目录为工作目录、使用相对文件名。
    """
    from static_ffmpeg import add_paths

    if not add_paths():
        raise RuntimeError("static_ffmpeg 初始化失败（无法获取 FFmpeg）")
    workdir = ass_path.parent
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vf", f"subtitles={ass_path.name}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "copy",
        str(out_path),
    ]
    subprocess.run(cmd, cwd=str(workdir), capture_output=True, check=True)
    logger.info("字幕烧录完成: %s", out_path)
