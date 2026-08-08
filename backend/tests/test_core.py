from app.core.config import Settings
from app.core.database import get_engine, init_db


def test_settings_defaults():
    s = Settings(_env_file=None)
    assert s.database_url.startswith("sqlite")
    assert s.jwt_secret != ""


def test_engine_creates_sqlite(tmp_path):
    engine = get_engine(f"sqlite:///{tmp_path/'t.db'}")
    assert engine.url.database.endswith("t.db")
    engine.dispose()


def test_init_db_creates_sqlite_parent_dir(tmp_path):
    url = f"sqlite:///{tmp_path / 'nested' / 'dir' / 'test.db'}"
    init_db(url)
    assert (tmp_path / "nested" / "dir").is_dir()


def test_init_db_no_parent_dir_ok(tmp_path, monkeypatch):
    # 无目录相对路径（如 "data.db"）的 dirname 为空串，不能触发 os.makedirs("")
    monkeypatch.chdir(tmp_path)
    init_db("sqlite:///plain_noparent.db")
    assert (tmp_path / "plain_noparent.db").exists()
