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


def create_completed_session(client: TestClient, tutor_token: str, learner_token: str) -> int:
    client.cookies.set("access_token", tutor_token)
    off_res = client.post(
        "/api/v1/offerings",
        json={
            "title": "Reviewable Course",
            "subject": "Chemistry",
            "description": "Offering description for reviews test.",
            "level": "Intermediate",
            "hourly_rate": 25.00,
        },
    )
    offering_id = off_res.json()["id"]

    client.cookies.set("access_token", learner_token)
    book_res = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": offering_id,
            "scheduled_start": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "duration_minutes": 60,
        },
    )
    session_id = book_res.json()["id"]

    # Accept & complete
    client.cookies.set("access_token", tutor_token)
    client.patch(f"/api/v1/sessions/{session_id}/status", json={"action": "accept"})
    client.patch(f"/api/v1/sessions/{session_id}/status", json={"action": "complete"})
    return session_id


def test_submit_review_success_and_recalculates_rating(client: TestClient):
    tutor_token = register_user(client, "rev_tutor@test.edu", "tutor", "Reviewee Tutor")
    learner1_token = register_user(client, "rev_l1@test.edu", "learner", "Reviewer One")
    learner2_token = register_user(client, "rev_l2@test.edu", "learner", "Reviewer Two")

    session1_id = create_completed_session(client, tutor_token, learner1_token)
    session2_id = create_completed_session(client, tutor_token, learner2_token)

    # 1. Learner 1 leaves 5-star review
    client.cookies.set("access_token", learner1_token)
    res1 = client.post(
        "/api/v1/reviews",
        json={
            "session_id": session1_id,
            "rating": 5,
            "comment": "Outstanding explanations of organic synthesis!",
        },
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["rating"] == 5
    assert data1["learner_name"] == "Reviewer One"

    # 2. Learner 2 leaves 4-star review
    client.cookies.set("access_token", learner2_token)
    res2 = client.post(
        "/api/v1/reviews",
        json={
            "session_id": session2_id,
            "rating": 4,
            "comment": "Great session, very helpful practice problems.",
        },
    )
    assert res2.status_code == 201

    # 3. Check tutor profile rating recalculated: (5 + 4) / 2 = 4.50
    tutor_id = data1["tutor_id"]
    client.cookies.clear()
    tutor_detail = client.get(f"/api/v1/tutors/{tutor_id}").json()
    assert float(tutor_detail["average_rating"]) == 4.50
    assert tutor_detail["total_reviews"] == 2
    assert len(tutor_detail["reviews"]) == 2


def test_review_duplicate_rejected(client: TestClient):
    tutor_token = register_user(client, "dup_rev_tutor@test.edu", "tutor", "Dup Tutor")
    learner_token = register_user(client, "dup_rev_l@test.edu", "learner", "Dup Learner")

    session_id = create_completed_session(client, tutor_token, learner_token)

    client.cookies.set("access_token", learner_token)
    # First review
    r1 = client.post(
        "/api/v1/reviews",
        json={"session_id": session_id, "rating": 5, "comment": "First review"},
    )
    assert r1.status_code == 201

    # Second review attempt for same session
    r2 = client.post(
        "/api/v1/reviews",
        json={"session_id": session_id, "rating": 4, "comment": "Second review"},
    )
    assert r2.status_code == 400
    assert "already been submitted" in r2.json()["detail"].lower()


def test_cannot_review_incomplete_session(client: TestClient):
    tutor_token = register_user(client, "pend_tutor@test.edu", "tutor", "Pending Tutor")
    learner_token = register_user(client, "pend_learner@test.edu", "learner", "Pending Learner")

    client.cookies.set("access_token", tutor_token)
    off_id = client.post(
        "/api/v1/offerings",
        json={
            "title": "Pending Subject",
            "subject": "CS",
            "description": "CS Course description.",
            "level": "Beginner",
            "hourly_rate": 20.00,
        },
    ).json()["id"]

    client.cookies.set("access_token", learner_token)
    sess_id = client.post(
        "/api/v1/sessions",
        json={
            "offering_id": off_id,
            "scheduled_start": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "duration_minutes": 60,
        },
    ).json()["id"]

    # Session is currently pending; review should fail
    bad_rev = client.post(
        "/api/v1/reviews",
        json={"session_id": sess_id, "rating": 5},
    )
    assert bad_rev.status_code == 400
    assert "only 'completed' sessions" in bad_rev.json()["detail"].lower()


def test_review_rating_validation(client: TestClient):
    tutor_token = register_user(client, "val_tutor@test.edu", "tutor", "Val Tutor")
    learner_token = register_user(client, "val_learner@test.edu", "learner", "Val Learner")
    session_id = create_completed_session(client, tutor_token, learner_token)

    client.cookies.set("access_token", learner_token)

    # 0 star
    res_zero = client.post("/api/v1/reviews", json={"session_id": session_id, "rating": 0})
    assert res_zero.status_code == 422

    # 6 star
    res_six = client.post("/api/v1/reviews", json={"session_id": session_id, "rating": 6})
    assert res_six.status_code == 422


def test_non_participant_cannot_review(client: TestClient):
    tutor_token = register_user(client, "np_tutor@test.edu", "tutor", "NP Tutor")
    learner_token = register_user(client, "np_learner@test.edu", "learner", "NP Learner")
    session_id = create_completed_session(client, tutor_token, learner_token)

    # Stranger learner attempts to review
    stranger_token = register_user(client, "stranger@test.edu", "learner", "Stranger")
    client.cookies.set("access_token", stranger_token)

    res = client.post(
        "/api/v1/reviews",
        json={"session_id": session_id, "rating": 5, "comment": "Imposter review"},
    )
    assert res.status_code == 403
    assert "only the learner who participated" in res.json()["detail"].lower()
