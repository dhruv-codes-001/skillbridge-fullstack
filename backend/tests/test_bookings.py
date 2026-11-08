from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient


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


def create_offering(client: TestClient, tutor_token: str, title: str = "Test Subject") -> int:
    client.cookies.set("access_token", tutor_token)
    res = client.post(
        "/api/v1/offerings",
        json={
            "title": title,
            "subject": "Computer Science",
            "description": "Offering description for test bookings.",
            "level": "Intermediate",
            "hourly_rate": 30.00,
        },
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_learner_create_booking_success(client: TestClient):
    tutor_token = register_user(client, "tutor_b1@test.edu", "tutor", "Tutor Booking")
    offering_id = create_offering(client, tutor_token, "Calculus II")

    learner_token = register_user(client, "learner_b1@test.edu", "learner", "Learner Booking")
    client.cookies.set("access_token", learner_token)

    start_time = datetime.now(timezone.utc) + timedelta(days=2)
    response = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": start_time.isoformat(),
            "duration_minutes": 60,
            "learner_notes": "Please cover integration by parts.",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["offering_title"] == "Calculus II"
    assert data["learner_name"] == "Learner Booking"
    assert data["tutor_name"] == "Tutor Booking"
    assert data["learner_notes"] == "Please cover integration by parts."

    # Check notification sent to tutor
    client.cookies.set("access_token", tutor_token)
    notif_res = client.get("/api/v1/notifications")
    assert notif_res.status_code == 200
    assert notif_res.json()["unread_count"] >= 1
    assert any("New Booking Request" in n["title"] for n in notif_res.json()["items"])


def test_tutor_cannot_book_own_offering(client: TestClient):
    tutor_token = register_user(client, "self_book_tutor@test.edu", "tutor", "Self Tutor")
    offering_id = create_offering(client, tutor_token, "Self Subject")

    client.cookies.set("access_token", tutor_token)
    start_time = datetime.now(timezone.utc) + timedelta(days=1)
    response = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": start_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    assert response.status_code == 403
    assert "learner role required" in response.json()["detail"].lower()


def test_session_state_machine_accept_and_complete(client: TestClient):
    tutor_token = register_user(client, "sm_tutor@test.edu", "tutor", "SM Tutor")
    offering_id = create_offering(client, tutor_token, "Algorithms")

    learner_token = register_user(client, "sm_learner@test.edu", "learner", "SM Learner")
    client.cookies.set("access_token", learner_token)

    start_time = datetime.now(timezone.utc) + timedelta(days=3)
    book_res = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": start_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    session_id = book_res.json()["id"]

    # 1. Learner cannot accept session
    bad_accept = client.patch(
        f"/api/v1/sessions/{session_id}/status",
        json={"action": "accept"},
    )
    assert bad_accept.status_code == 403

    # 2. Tutor accepts pending session -> accepted
    client.cookies.set("access_token", tutor_token)
    accept_res = client.patch(
        f"/api/v1/sessions/{session_id}/status",
        json={"action": "accept"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # 3. Tutor marks session complete -> completed
    complete_res = client.patch(
        f"/api/v1/sessions/{session_id}/status",
        json={"action": "complete"},
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # 4. Verify completed session cannot be accepted again
    invalid_res = client.patch(
        f"/api/v1/sessions/{session_id}/status",
        json={"action": "accept"},
    )
    assert invalid_res.status_code == 400


def test_session_state_machine_reject(client: TestClient):
    tutor_token = register_user(client, "rej_tutor@test.edu", "tutor", "Reject Tutor")
    offering_id = create_offering(client, tutor_token, "Physics")

    learner_token = register_user(client, "rej_learner@test.edu", "learner", "Reject Learner")
    client.cookies.set("access_token", learner_token)

    start_time = datetime.now(timezone.utc) + timedelta(days=4)
    book_res = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": start_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    session_id = book_res.json()["id"]

    # Tutor rejects request
    client.cookies.set("access_token", tutor_token)
    rej_res = client.patch(
        f"/api/v1/sessions/{session_id}/status",
        json={"action": "reject", "reason": "Schedule full on that day."},
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "rejected"
    assert rej_res.json()["cancellation_reason"] == "Schedule full on that day."


def test_session_state_machine_cancel(client: TestClient):
    tutor_token = register_user(client, "can_tutor@test.edu", "tutor", "Cancel Tutor")
    offering_id = create_offering(client, tutor_token, "Chemistry")

    learner_token = register_user(client, "can_learner@test.edu", "learner", "Cancel Learner")
    client.cookies.set("access_token", learner_token)

    start_time = datetime.now(timezone.utc) + timedelta(days=5)
    book_res = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": start_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    session_id = book_res.json()["id"]

    # Learner cancels their pending session
    can_res = client.patch(
        f"/api/v1/sessions/{session_id}/status",
        json={"action": "cancel", "reason": "No longer needed."},
    )
    assert can_res.status_code == 200
    assert can_res.json()["status"] == "cancelled"


def test_booking_conflict_prevention_overlapping_schedules(client: TestClient):
    tutor_token = register_user(client, "conflict_tutor@test.edu", "tutor", "Conflict Tutor")
    offering_id = create_offering(client, tutor_token, "Data Science")

    learner1_token = register_user(client, "conflict_l1@test.edu", "learner", "Learner One")
    learner2_token = register_user(client, "conflict_l2@test.edu", "learner", "Learner Two")

    base_time = datetime(2027, 5, 10, 14, 0, 0, tzinfo=timezone.utc)

    # 1. Learner 1 books 14:00 to 15:00
    client.cookies.set("access_token", learner1_token)
    book1 = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": base_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    assert book1.status_code == 201
    session1_id = book1.json()["id"]

    # Tutor accepts Learner 1's booking -> Confirmed slot 14:00 - 15:00
    client.cookies.set("access_token", tutor_token)
    accept1 = client.patch(
        f"/api/v1/sessions/{session1_id}/status",
        json={"action": "accept"},
    )
    assert accept1.status_code == 200

    # 2. Learner 2 attempts to book overlapping slot (14:30 to 15:30) with same tutor
    client.cookies.set("access_token", learner2_token)
    overlap_time = base_time + timedelta(minutes=30)
    conflict_res = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": overlap_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    assert conflict_res.status_code == 409
    assert "tutor already has a confirmed session" in conflict_res.json()["detail"].lower()

    # 3. Non-overlapping slot immediately following (15:00 to 16:00) should SUCCEED
    adjacent_time = base_time + timedelta(minutes=60)
    ok_res = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": adjacent_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    assert ok_res.status_code == 201


def test_booking_conflict_prevention_learner_double_booking(client: TestClient):
    tutor1_token = register_user(client, "tutor_a@test.edu", "tutor", "Tutor A")
    off1 = create_offering(client, tutor1_token, "Course A")

    tutor2_token = register_user(client, "tutor_b@test.edu", "tutor", "Tutor B")
    off2 = create_offering(client, tutor2_token, "Course B")

    learner_token = register_user(client, "double_booker@test.edu", "learner", "Busy Student")

    slot_time = datetime(2027, 6, 1, 10, 0, 0, tzinfo=timezone.utc)

    # 1. Book and confirm with Tutor A (10:00 - 11:00)
    client.cookies.set("access_token", learner_token)
    b1 = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": off1,
            "scheduled_start": slot_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    s1_id = b1.json()["id"]

    client.cookies.set("access_token", tutor1_token)
    client.patch(f"/api/v1/sessions/{s1_id}/status", json={"action": "accept"})

    # 2. Same learner attempts to book with Tutor B for the exact same hour
    client.cookies.set("access_token", learner_token)
    b2 = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": off2,
            "scheduled_start": slot_time.isoformat(),
            "duration_minutes": 60,
        },
    )
    assert b2.status_code == 409
    assert "you already have a confirmed session" in b2.json()["detail"].lower()
