from app.core.config import Settings
from app.core.database import get_engine


def test_settings_defaults():
    s = Settings(_env_file=None)
    assert s.database_url.startswith("sqlite")
    assert s.jwt_secret != ""


def test_engine_creates_sqlite(tmp_path):
    engine = get_engine(f"sqlite:///{tmp_path/'t.db'}")
    assert engine.url.database.endswith("t.db")
    engine.dispose()
