from app.providers.mock import (
    MockAsr,
    MockDigitalHuman,
    MockLlm,
    MockModeration,
    MockParse,
    MockStock,
    MockTts,
)
from app.providers.registry import ProviderBundle, build_mock_bundle


def test_mock_parse_and_download(tmp_path):
    p = MockParse()
    r = p.parse("https://v.douyin.com/x")
    assert r.title
    local = p.download(r, tmp_path)
    assert local.exists() and local.name == "source.mp4"


def test_mock_asr_returns_sentences(tmp_path):
    f = tmp_path / "a.wav"
    f.write_bytes(b"x")
    out = MockAsr().transcribe(f)
    assert len(out) >= 2 and out[0].end > out[0].start


def test_mock_llm_json_mode():
    out = MockLlm().complete("p", json_mode=True)
    assert out.lstrip().startswith("{")


def test_mock_tts_writes_audio(tmp_path):
    r = MockTts().synthesize("你好世界", None, tmp_path)
    assert r.audio_path.exists()
    assert sum(s.duration for s in r.sentences) > 0


def test_mock_llm_title_options():
    import json
    data = json.loads(MockLlm().complete("请生成标题与话题", json_mode=True))
    assert len(data["options"]) == 3 and data["options"][0]["title"]


def test_mock_llm_structure_analysis():
    import json
    data = json.loads(MockLlm().complete("请分析以下爆款短视频文案的爆款结构", json_mode=True))
    assert {"hook", "pain_points", "arguments", "conversion", "style_notes"} <= set(data)


def test_mock_llm_rewrite_prompt_returns_scripts():
    import json
    prompt = "保留爆款结构并迁移到目标行业……输出 1-3 版改写脚本，JSON：{\"scripts\": [...]}"
    data = json.loads(MockLlm().complete(prompt, json_mode=True))
    assert len(data["scripts"]) >= 1


def test_mock_tts_clone_voice(tmp_path):
    sample = tmp_path / "s.wav"
    sample.write_bytes(b"x")
    assert MockTts().clone_voice(sample, "我的音色") == "mock-voice-1"


def test_mock_stock_search_and_download(tmp_path):
    s = MockStock()
    items = s.search("办公室", limit=3)
    assert len(items) == 3 and items[0].url
    assert s.search("办公室", limit=0) == []
    f = s.download(items[0], tmp_path / "backgrounds")
    assert f.exists()


def test_mock_digital_human_submit_then_poll(tmp_path):
    dh = MockDigitalHuman()
    job = dh.submit(tmp_path / "a.mp3", None)
    assert not job.finished
    job = dh.poll(job, tmp_path)
    assert job.finished and job.video_path and job.video_path.exists()


def test_mock_moderation_passes():
    assert MockModeration().moderate_text("任意文本").passed


def test_bundle():
    b = build_mock_bundle()
    assert isinstance(b, ProviderBundle)
    assert b.parse is not None and b.moderation is not None
