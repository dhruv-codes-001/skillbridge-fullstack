from fastapi.testclient import TestClient


def test_register_learner(client: TestClient):
    payload = {
        "email": "student1@test.edu",
        "password": "strongPassword123",
        "full_name": "Jordan Lee",
        "role": "learner",
        "college": "Stanford University",
        "department": "Computer Science",
        "year_of_study": "2nd Year",
        "learning_interests": "Algorithms, Systems",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "student1@test.edu"
    assert data["user"]["role"] == "learner"
    assert data["user"]["college"] == "Stanford University"
    assert data["user"]["tutor_profile"] is None

    # Check HttpOnly cookie is set
    assert "access_token" in response.cookies
    cookie_header = response.headers.get("set-cookie", "")
    assert "access_token" in cookie_header
    assert "HttpOnly" in cookie_header or "httponly" in cookie_header.lower()


def test_register_tutor_creates_tutor_profile(client: TestClient):
    payload = {
        "email": "tutor1@test.edu",
        "password": "tutorPassword123",
        "full_name": "Prof. Alan Turing",
        "role": "tutor",
        "college": "MIT",
        "department": "Mathematics",
        "hourly_rate": 35.50,
        "teaching_subjects": "Algorithms, Discrete Math, Cryptography",
        "experience_years": 5,
        "experience_description": "5 years of university teaching assistant experience.",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "tutor"
    assert data["user"]["tutor_profile"] is not None
    assert float(data["user"]["tutor_profile"]["hourly_rate"]) == 35.50
    assert data["user"]["tutor_profile"]["teaching_subjects"] == "Algorithms, Discrete Math, Cryptography"
    assert data["user"]["tutor_profile"]["experience_years"] == 5


def test_register_duplicate_email_rejected(client: TestClient):
    payload = {
        "email": "duplicate@test.edu",
        "password": "password123",
        "full_name": "First User",
        "role": "learner",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second attempt with same email
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_register_invalid_role_rejected(client: TestClient):
    payload = {
        "email": "invalid_role@test.edu",
        "password": "password123",
        "full_name": "Invalid Role",
        "role": "administrator",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_short_password_rejected(client: TestClient):
    payload = {
        "email": "short_pw@test.edu",
        "password": "short",
        "full_name": "Short Password",
        "role": "learner",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_login_success(client: TestClient):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "login_user@test.edu",
            "password": "mySecurePassword123",
            "full_name": "Login Tester",
            "role": "learner",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login_user@test.edu",
            "password": "mySecurePassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login_user@test.edu"
    assert "access_token" in response.cookies


def test_login_invalid_password(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrong_pw_user@test.edu",
            "password": "correctPassword123",
            "full_name": "Password Tester",
            "role": "learner",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "wrong_pw_user@test.edu",
            "password": "incorrectPassword!",
        },
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "ghost@test.edu",
            "password": "somePassword123",
        },
    )
    assert response.status_code == 401


def test_auth_me_with_cookie(client: TestClient):
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "me_test@test.edu",
            "password": "mePassword123",
            "full_name": "Me User",
            "role": "learner",
        },
    )
    token = reg_res.json()["access_token"]

    # Test GET /auth/me passing token via cookie
    client.cookies.set("access_token", token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me_test@test.edu"
    assert data["full_name"] == "Me User"


def test_auth_me_with_bearer_header(client: TestClient):
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "bearer_test@test.edu",
            "password": "bearerPassword123",
            "full_name": "Bearer User",
            "role": "learner",
        },
    )
    token = reg_res.json()["access_token"]

    # Remove cookies to test pure header auth
    client.cookies.clear()
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "bearer_test@test.edu"


def test_auth_me_unauthenticated(client: TestClient):
    client.cookies.clear()
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_logout_clears_cookie(client: TestClient):
    # Log in first
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout_test@test.edu",
            "password": "logoutPassword123",
            "full_name": "Logout User",
            "role": "learner",
        },
    )
    assert "access_token" in reg_res.cookies

    # Call logout
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully."

    # Check cookie deletion directive in response
    cookie_header = response.headers.get("set-cookie", "")
    assert "access_token=" in cookie_header
    # Standard cookie deletion sets max-age=0 or empty value
    assert "Max-Age=0" in cookie_header or 'access_token=""' in cookie_header
