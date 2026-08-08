"""端到端集成测试：API 层完整业务流（创建 → 确认脚本 → 完成）。

通过 create_app() 挂载全部路由（auth/tasks/files），沿用 conftest 注入的内存库与
get_current_user 覆盖，验证 Mock Provider 流水线在真实应用工厂下的全链路行为。
"""

from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import create_app
from app.models.user import User


def test_full_business_flow_with_mock_providers(db_session, tmp_path, monkeypatch):
    # 阻止 create_app 重建真实数据库，沿用 conftest 注入的内存库
    monkeypatch.setattr("app.main.init_db", lambda url: None)
    app = create_app()
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user

    from app.api import tasks as tasks_api
    tasks_api._DATA_ROOT = tmp_path

    client = TestClient(app)
    r = client.post("/api/tasks", json={
        "source_url": "https://v.douyin.com/demo",
        "target_industry": "美妆",
        "product_brief": "持妆粉底液",
    })
    assert r.status_code == 201
    task_id = r.json()["id"]
    assert r.json()["status"] == "AWAITING_SCRIPT"

    detail = client.get(f"/api/tasks/{task_id}").json()
    script_id = detail["scripts"][0]["id"]
    r2 = client.post(f"/api/tasks/{task_id}/confirm-script",
                     json={"script_id": script_id})
    assert r2.json()["status"] == "REVIEW"

    r3 = client.post(f"/api/tasks/{task_id}/complete")
    assert r3.json()["status"] == "COMPLETED"
