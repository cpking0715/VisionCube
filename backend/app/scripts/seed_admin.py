"""建表并预置管理员账号。用法：python -m app.scripts.seed_admin"""

from app.core import database
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def main() -> None:
    database.init_db(settings.database_url)
    db = database.SessionLocal()
    try:
        if db.query(User).filter_by(username=settings.admin_username).first() is None:
            db.add(User(username=settings.admin_username,
                        hashed_password=hash_password(settings.admin_password)))
            db.commit()
            print(f"admin user '{settings.admin_username}' created")
        else:
            print("admin user already exists")
    finally:
        db.close()


if __name__ == "__main__":
    main()
