from fastapi.testclient import TestClient

from app.models.notification import Notification


def register_user(client: TestClient, email: str, role: str, name: str, **kwargs) -> str:
    payload = {
        "email": email,
        "password": "securePassword123",
        "full_name": name,
        "role": role,
        **kwargs,
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    return res.json()["access_token"]


def test_notifications_lifecycle(client: TestClient, db_session):
    user1_token = register_user(client, "notif1@test.edu", "learner", "Notif User 1")
    client.cookies.set("access_token", user1_token)
    me1 = client.get("/api/v1/auth/me").json()
    u1_id = me1["id"]

    user2_token = register_user(client, "notif2@test.edu", "tutor", "Notif User 2")
    client.cookies.set("access_token", user2_token)
    me2 = client.get("/api/v1/auth/me").json()
    u2_id = me2["id"]

    # 1. Create notifications in DB for user 1
    n1 = Notification(
        user_id=u1_id,
        title="Session Confirmed",
        message="Your session has been accepted.",
        notification_type="booking_accepted",
        is_read=False,
    )
    n2 = Notification(
        user_id=u1_id,
        title="Review Reminder",
        message="Please leave a review.",
        notification_type="session_completed",
        is_read=False,
    )
    # Notification for user 2
    n3 = Notification(
        user_id=u2_id,
        title="User 2 Notification",
        message="Private alert for user 2.",
        notification_type="system",
        is_read=False,
    )
    db_session.add_all([n1, n2, n3])
    db_session.commit()
    db_session.refresh(n1)
    db_session.refresh(n2)
    db_session.refresh(n3)

    # 2. User 1 checks notifications
    client.cookies.set("access_token", user1_token)
    res_list = client.get("/api/v1/notifications")
    assert res_list.status_code == 200
    data = res_list.json()
    assert data["unread_count"] == 2
    assert len(data["items"]) == 2
    assert not any(item["id"] == n3.id for item in data["items"])

    # 3. User 1 marks n1 as read
    res_read = client.patch(f"/api/v1/notifications/{n1.id}/read")
    assert res_read.status_code == 200
    assert res_read.json()["is_read"] is True

    # Check unread count is now 1
    res_list2 = client.get("/api/v1/notifications")
    assert res_list2.json()["unread_count"] == 1

    # 4. User 1 cannot mark user 2's notification as read
    res_forbidden = client.patch(f"/api/v1/notifications/{n3.id}/read")
    assert res_forbidden.status_code == 403

    # 5. User 1 marks all as read
    res_all = client.post("/api/v1/notifications/read-all")
    assert res_all.status_code == 200
    assert res_all.json()["count"] == 1

    # Check unread count is now 0
    res_list3 = client.get("/api/v1/notifications")
    assert res_list3.json()["unread_count"] == 0


def test_notifications_unauthenticated_rejected(client: TestClient):
    client.cookies.clear()
    res = client.get("/api/v1/notifications")
    assert res.status_code == 401
