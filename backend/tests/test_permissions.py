from decimal import Decimal
from fastapi import Depends
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_learner, get_current_tutor
from app.main import app

# Add temporary test routes to verify role guard dependencies
@app.get("/api/v1/test/learner-only", tags=["Test"])
def learner_only_endpoint(user=Depends(get_current_learner)):
    return {"message": "Welcome learner", "user_id": user.id}


@app.get("/api/v1/test/tutor-only", tags=["Test"])
def tutor_only_endpoint(user=Depends(get_current_tutor)):
    return {"message": "Welcome tutor", "user_id": user.id}


def test_profile_retrieval_learner(client: TestClient):
    # Register learner
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "profile_learner@test.edu",
            "password": "password123",
            "full_name": "Profile Learner",
            "role": "learner",
            "college": "Berkeley",
            "department": "Physics",
        },
    )
    token = reg.json()["access_token"]
    client.cookies.set("access_token", token)

    response = client.get("/api/v1/users/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "profile_learner@test.edu"
    assert data["college"] == "Berkeley"
    assert data["department"] == "Physics"
    assert data["tutor_profile"] is None


def test_profile_retrieval_tutor(client: TestClient):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "profile_tutor@test.edu",
            "password": "password123",
            "full_name": "Profile Tutor",
            "role": "tutor",
            "college": "Harvard",
            "department": "Computer Science",
            "hourly_rate": 40.00,
            "teaching_subjects": "Algorithms",
        },
    )
    token = reg.json()["access_token"]
    client.cookies.set("access_token", token)

    response = client.get("/api/v1/users/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "profile_tutor@test.edu"
    assert data["tutor_profile"] is not None
    assert float(data["tutor_profile"]["hourly_rate"]) == 40.00
    assert data["tutor_profile"]["teaching_subjects"] == "Algorithms"


def test_profile_update_learner(client: TestClient):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "update_learner@test.edu",
            "password": "password123",
            "full_name": "Before Update",
            "role": "learner",
        },
    )
    token = reg.json()["access_token"]
    client.cookies.set("access_token", token)

    # Perform profile update
    update_res = client.put(
        "/api/v1/users/profile",
        json={
            "full_name": "After Update",
            "bio": "Enthusiastic about operating systems and networks.",
            "college": "Caltech",
            "department": "EE & CS",
            "year_of_study": "3rd Year",
            "learning_interests": "Distributed Systems, Rust, C++",
        },
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["full_name"] == "After Update"
    assert data["bio"] == "Enthusiastic about operating systems and networks."
    assert data["college"] == "Caltech"
    assert data["learning_interests"] == "Distributed Systems, Rust, C++"


def test_profile_update_tutor_credentials(client: TestClient):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "update_tutor@test.edu",
            "password": "password123",
            "full_name": "Initial Tutor",
            "role": "tutor",
            "hourly_rate": 20.00,
        },
    )
    token = reg.json()["access_token"]
    client.cookies.set("access_token", token)

    # Tutor updates hourly rate and description
    update_res = client.put(
        "/api/v1/users/profile",
        json={
            "full_name": "Senior Tutor",
            "hourly_rate": 50.00,
            "teaching_subjects": "Compiler Design, Systems Programming",
            "experience_years": 4,
            "experience_description": "Promoted to Senior TA.",
        },
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["full_name"] == "Senior Tutor"
    assert float(data["tutor_profile"]["hourly_rate"]) == 50.00
    assert data["tutor_profile"]["experience_years"] == 4
    assert data["tutor_profile"]["experience_description"] == "Promoted to Senior TA."


def test_profile_unauthenticated_forbidden(client: TestClient):
    client.cookies.clear()
    get_res = client.get("/api/v1/users/profile")
    assert get_res.status_code == 401

    put_res = client.put("/api/v1/users/profile", json={"full_name": "Hacker"})
    assert put_res.status_code == 401


def test_role_guard_dependencies(client: TestClient):
    # 1. Register a Learner
    reg_l = client.post(
        "/api/v1/auth/register",
        json={
            "email": "pure_learner@test.edu",
            "password": "password123",
            "full_name": "Pure Learner",
            "role": "learner",
        },
    )
    learner_token = reg_l.json()["access_token"]

    # 2. Register a Tutor
    reg_t = client.post(
        "/api/v1/auth/register",
        json={
            "email": "pure_tutor@test.edu",
            "password": "password123",
            "full_name": "Pure Tutor",
            "role": "tutor",
        },
    )
    tutor_token = reg_t.json()["access_token"]

    # Learner accessing learner-only endpoint -> 200
    client.cookies.set("access_token", learner_token)
    res1 = client.get("/api/v1/test/learner-only")
    assert res1.status_code == 200

    # Learner accessing tutor-only endpoint -> 403 Forbidden
    res2 = client.get("/api/v1/test/tutor-only")
    assert res2.status_code == 403
    assert "tutor role required" in res2.json()["detail"].lower()

    # Tutor accessing tutor-only endpoint -> 200
    client.cookies.set("access_token", tutor_token)
    res3 = client.get("/api/v1/test/tutor-only")
    assert res3.status_code == 200

    # Tutor accessing learner-only endpoint -> 403 Forbidden
    res4 = client.get("/api/v1/test/learner-only")
    assert res4.status_code == 403
    assert "learner role required" in res4.json()["detail"].lower()
