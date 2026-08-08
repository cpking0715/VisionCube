from arq.connections import RedisSettings

from app.core.config import settings


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(settings.redis_url)
