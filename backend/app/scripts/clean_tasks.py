"""清理所有 Mock 任务数据（保留 admin 用户）。"""

import shutil
from pathlib import Path

from app.core.config import settings
from app.core.database import init_db
from app.models import Asset, PublishMeta, Script, StageLog, Task, VideoFile


def main() -> None:
    init_db(settings.database_url)

    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        n_scripts = db.query(Script).delete()
        n_logs = db.query(StageLog).delete()
        n_files = db.query(VideoFile).delete()
        n_metas = db.query(PublishMeta).delete()
        n_assets = db.query(Asset).delete()
        n_tasks = db.query(Task).delete()
        db.commit()
        print(
            f"已删除: tasks={n_tasks}, scripts={n_scripts}, logs={n_logs}, "
            f"files={n_files}, metas={n_metas}, assets={n_assets}"
        )
    finally:
        db.close()

    # 删除 data 目录下的任务文件
    data_root = Path(settings.data_root)
    for d in data_root.iterdir():
        if d.is_dir() and d.name.isdigit():
            shutil.rmtree(d)
            print(f"已删除目录: {d}")


if __name__ == "__main__":
    main()

