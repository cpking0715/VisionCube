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
