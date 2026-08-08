import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.api.tasks import router as tasks_router
from app.core.security import create_access_token
from app.models.script import Script
from app.models.task import TaskStatus as TS
from app.models.user import User


@pytest.fixture()
def client_and_user(db_session, tmp_path):
    user = User(username="admin", hashed_password="x")
    db_session.add(user)
    db_session.commit()

    app = FastAPI()
    app.include_router(tasks_router, prefix="/api/tasks")
    app.dependency_overrides[get_current_user] = lambda: user

    from app.api import tasks as tasks_api
    tasks_api._DATA_ROOT = tmp_path  # 测试注入存储根目录

    return TestClient(app), user


def test_create_task_runs_to_pause(client_and_user, db_session):
    client, _ = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={
        "source_url": "https://v.douyin.com/x",
        "target_industry": "美妆",
        "product_brief": "粉底液",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == TS.AWAITING_SCRIPT.value


def test_confirm_script_continues_to_review(client_and_user, db_session):
    client, _ = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"},
                    headers={"Authorization": f"Bearer {token}"})
    task_id = r.json()["id"]
    script = db_session.query(Script).filter_by(task_id=task_id).first()
    r2 = client.post(f"/api/tasks/{task_id}/confirm-script",
                     json={"script_id": script.id, "content": None},
                     headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
    assert r2.json()["status"] == TS.REVIEW.value


def test_complete_from_review(client_and_user, db_session):
    client, _ = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"},
                    headers={"Authorization": f"Bearer {token}"})
    task_id = r.json()["id"]
    script = db_session.query(Script).filter_by(task_id=task_id).first()
    client.post(f"/api/tasks/{task_id}/confirm-script", json={"script_id": script.id},
                headers={"Authorization": f"Bearer {token}"})
    r3 = client.post(f"/api/tasks/{task_id}/complete",
                     headers={"Authorization": f"Bearer {token}"})
    assert r3.json()["status"] == TS.COMPLETED.value


def test_retry_from_failed(client_and_user, db_session):
    client, _ = client_and_user
    token = create_access_token("admin")
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"},
                    headers={"Authorization": f"Bearer {token}"})
    task_id = r.json()["id"]
    from app.models.task import Task
    task = db_session.get(Task, task_id)
    task.status = TS.FAILED
    task.failed_stage = TS.MODERATING_TEXT.value
    db_session.commit()
    r2 = client.post(f"/api/tasks/{task_id}/retry",
                     headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200


def test_task_ownership_boundary(client_and_user, db_session):
    """I-1: 跨用户隔离——B 访问 A 的任务 404，list 对 B 为空。"""
    client, _ = client_and_user
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"})
    assert r.status_code == 201
    task_id = r.json()["id"]

    user_b = User(username="b", hashed_password="x")
    db_session.add(user_b)
    db_session.commit()

    app_b = FastAPI()
    app_b.include_router(tasks_router, prefix="/api/tasks")
    app_b.dependency_overrides[get_current_user] = lambda: user_b
    client_b = TestClient(app_b)

    assert client_b.get(f"/api/tasks/{task_id}").status_code == 404
    assert client_b.post(f"/api/tasks/{task_id}/complete").status_code == 404
    assert client_b.post(f"/api/tasks/{task_id}/retry").status_code == 404
    assert client_b.post(f"/api/tasks/{task_id}/confirm-script",
                         json={"script_id": 1}).status_code == 404
    assert client_b.get("/api/tasks").json() == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/api/tasks/999999", None),
    ("post", "/api/tasks/999999/complete", None),
    ("post", "/api/tasks/999999/retry", None),
    ("post", "/api/tasks/999999/confirm-script", {"script_id": 1}),
])
def test_task_not_found_404(client_and_user, method, path, body):
    """I-1: 不存在的任务在各端点均返回 404。"""
    client, _ = client_and_user
    if body is None:
        r = getattr(client, method)(path)
    else:
        r = getattr(client, method)(path, json=body)
    assert r.status_code == 404


def test_conflict_states_409_and_detail_structure(client_and_user, db_session):
    """I-1: 状态前置 409 + get_task 详情结构。"""
    client, _ = client_and_user
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"})
    task_id = r.json()["id"]
    assert r.json()["status"] == TS.AWAITING_SCRIPT.value

    # AWAITING_SCRIPT 上 complete → 409
    assert client.post(f"/api/tasks/{task_id}/complete").status_code == 409

    # get 详情：logs/scripts/files 三键存在
    detail = client.get(f"/api/tasks/{task_id}")
    assert detail.status_code == 200
    assert {"logs", "scripts", "files"} <= set(detail.json())

    # 确认脚本推到 REVIEW 后，再 confirm-script → 409
    script = db_session.query(Script).filter_by(task_id=task_id).first()
    assert client.post(f"/api/tasks/{task_id}/confirm-script",
                       json={"script_id": script.id}).status_code == 200
    assert client.post(f"/api/tasks/{task_id}/confirm-script",
                       json={"script_id": script.id}).status_code == 409


def test_retry_missing_failed_stage_409(client_and_user, db_session):
    """Minor 2: FAILED 但 failed_stage=None 时 retry → 409 而非 500。"""
    client, _ = client_and_user
    r = client.post("/api/tasks", json={"source_url": "https://v.douyin.com/x"})
    task_id = r.json()["id"]
    from app.models.task import Task
    task = db_session.get(Task, task_id)
    task.status = TS.FAILED
    task.failed_stage = None
    db_session.commit()
    r2 = client.post(f"/api/tasks/{task_id}/retry")
    assert r2.status_code == 409
