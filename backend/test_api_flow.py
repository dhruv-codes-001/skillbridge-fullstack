import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_full_flow():
    with httpx.Client() as client:
        print("1. Testing Learner Login...")
        res = client.post(f"{BASE_URL}/auth/login", json={
            "email": "aarav.learner@college.edu",
            "password": "password123"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        print("   Learner logged in successfully. Cookies:", dict(client.cookies))

        print("2. Testing /auth/me...")
        res = client.get(f"{BASE_URL}/auth/me")
        assert res.status_code == 200, f"/auth/me failed: {res.text}"
        user = res.json()
        print(f"   Logged in user: {user['full_name']} ({user['role']})")

        print("3. Testing /sessions for Learner...")
        res = client.get(f"{BASE_URL}/sessions?role=learner")
        assert res.status_code == 200, f"Get sessions failed: {res.text}"
        sessions = res.json()
        print(f"   Found {len(sessions)} sessions for learner")

        print("4. Testing /notifications...")
        res = client.get(f"{BASE_URL}/notifications")
        assert res.status_code == 200, f"Get notifications failed: {res.text}"
        notifs = res.json()
        print(f"   Found {len(notifs['items'])} notifications, unread: {notifs['unread_count']}")

    with httpx.Client() as tutor_client:
        print("5. Testing Tutor Login...")
        res = tutor_client.post(f"{BASE_URL}/auth/login", json={
            "email": "rohan.tutor@college.edu",
            "password": "password123"
        })
        assert res.status_code == 200, f"Tutor login failed: {res.text}"
        tutor_id = res.json()["user"]["id"]
        print("   Tutor logged in successfully.")

        print("6. Testing /offerings for Tutor...")
        res = tutor_client.get(f"{BASE_URL}/offerings?tutor_id={tutor_id}")
        assert res.status_code == 200, f"Get offerings failed: {res.text}"
        offerings = res.json()
        print(f"   Found {len(offerings)} offerings for tutor Rohan")

        print("7. Testing /sessions for Tutor...")
        res = tutor_client.get(f"{BASE_URL}/sessions?role=tutor")
        assert res.status_code == 200, f"Get tutor sessions failed: {res.text}"
        tutor_sessions = res.json()
        print(f"   Found {len(tutor_sessions)} sessions for tutor")

    print("\n>>> ALL LOCAL API INTEGRATION CHECKS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    test_full_flow()
