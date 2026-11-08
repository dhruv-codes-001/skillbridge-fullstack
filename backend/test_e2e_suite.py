import sys
import httpx
from datetime import datetime, timedelta, timezone

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE = "http://127.0.0.1:8000/api/v1"

def test_full_application():
    print("==================================================")
    print("SKILLBRIDGE END-TO-END VERIFICATION SUITE")
    print("==================================================")

    # 1. Test Learner Login
    print("\n[1] Testing Learner Login (Aarav Sharma)...")
    learner_client = httpx.Client(base_url=BASE)
    res = learner_client.post("/auth/login", json={
        "email": "aarav.learner@college.edu",
        "password": "password123"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    learner_data = res.json()["user"]
    learner_id = learner_data["id"]
    print(f"  ✓ Logged in as: {learner_data['full_name']} (ID: {learner_id})")

    # 2. Test Session Restoration (/auth/me with cookie)
    print("\n[2] Testing Session Restoration via HttpOnly Cookie...")
    res = learner_client.get("/auth/me")
    assert res.status_code == 200, f"/auth/me failed: {res.text}"
    assert res.json()["email"] == "aarav.learner@college.edu"
    print("  ✓ Cookie session restored successfully.")

    # 3. Test Tutor Marketplace & Search
    print("\n[3] Testing Marketplace Search & Subject Filter...")
    res = httpx.get(f"{BASE}/tutors?search=Rohan")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 1
    tutor_rohan = items[0]
    tutor_id = tutor_rohan["id"]
    print(f"  ✓ Found tutor: {tutor_rohan['full_name']}, offerings: {len(tutor_rohan['offerings'])}")

    # 4. Get active offering for booking
    offering = [o for o in tutor_rohan["offerings"] if o["is_active"]][0]
    offering_id = offering["id"]
    print(f"  ✓ Selected offering: '{offering['title']}' (ID: {offering_id}, Rate: ₹{offering['hourly_rate']})")

    # 5. Test Learner Booking Creation
    print("\n[4] Testing Learner Booking Flow (POST /sessions)...")
    # Choose a unique future time
    start_time = datetime.now(timezone.utc) + timedelta(days=14, hours=2)
    start_time_iso = start_time.isoformat()
    booking_res = learner_client.post("/sessions", json={
        "offering_id": offering_id,
        "scheduled_start": start_time_iso,
        "duration_minutes": 60,
        "learner_notes": "Automated verification test booking"
    })
    assert booking_res.status_code == 201, f"Booking failed: {booking_res.text}"
    new_session = booking_res.json()
    new_session_id = new_session["id"]
    print(f"  ✓ Created pending session #{new_session_id} for {new_session['scheduled_start']}")

    # 6. Test Scheduling Conflict Prevention (HTTP 409)
    print("\n[5] Testing Scheduling Conflict Prevention (Double Booking)...")
    conflict_res = learner_client.post("/sessions", json={
        "offering_id": offering_id,
        "scheduled_start": start_time_iso,
        "duration_minutes": 60,
    })
    # Note: Backend check_booking_conflict checks against ACCEPTED sessions.
    # Let's verify tutor acceptance first, then test 409 conflict when accepted.

    # 7. Test Tutor Login & Request Management
    print("\n[6] Testing Tutor Login & Dashboard Requests...")
    tutor_client = httpx.Client(base_url=BASE)
    res = tutor_client.post("/auth/login", json={
        "email": "rohan.tutor@college.edu",
        "password": "password123"
    })
    assert res.status_code == 200, f"Tutor login failed: {res.text}"
    print("  ✓ Tutor Rohan logged in.")

    # Tutor views incoming pending sessions
    res = tutor_client.get("/sessions?role=tutor&status=pending")
    assert res.status_code == 200
    pending_sessions = [s for s in res.json() if s["id"] == new_session_id]
    assert len(pending_sessions) == 1, "New booking not found in pending list"
    print(f"  ✓ Session #{new_session_id} found in tutor's pending requests.")

    # 8. Tutor Accepts the Session
    print("\n[7] Testing Tutor Accepts Session...")
    res = tutor_client.patch(f"/sessions/{new_session_id}/status", json={
        "action": "accept"
    })
    assert res.status_code == 200, f"Accept failed: {res.text}"
    assert res.json()["status"] == "accepted"
    print(f"  ✓ Session #{new_session_id} state changed to 'accepted'.")

    # 9. Now verify Conflict Detection returns 409 when booking overlapping time!
    print("\n[8] Testing Conflict Prevention against Accepted Session (409 Conflict)...")
    res = learner_client.post("/sessions", json={
        "offering_id": offering_id,
        "scheduled_start": start_time_iso,
        "duration_minutes": 60,
    })
    assert res.status_code == 409, f"Expected 409 Conflict, got {res.status_code}: {res.text}"
    print(f"  ✓ Conflict prevention verified: HTTP 409 Conflict returned successfully.")

    # 10. Tutor Completes the Session
    print("\n[9] Testing Session Completion by Tutor...")
    res = tutor_client.patch(f"/sessions/{new_session_id}/status", json={
        "action": "complete"
    })
    assert res.status_code == 200, f"Complete failed: {res.text}"
    assert res.json()["status"] == "completed"
    print(f"  ✓ Session #{new_session_id} marked as 'completed'.")

    # 11. Learner Submits Review for Completed Session
    print("\n[10] Testing Learner Review Submission...")
    review_res = learner_client.post("/reviews", json={
        "session_id": new_session_id,
        "rating": 5,
        "comment": "Super helpful session on graph algorithms! Highly recommend."
    })
    assert review_res.status_code == 201, f"Submit review failed: {review_res.text}"
    print(f"  ✓ 5-star review submitted for session #{new_session_id}.")

    # 12. Test Duplicate Review Prevention
    print("\n[11] Testing Duplicate Review Prevention...")
    dup_res = learner_client.post("/reviews", json={
        "session_id": new_session_id,
        "rating": 4,
        "comment": "Trying to submit again"
    })
    assert dup_res.status_code in [400, 409], f"Expected 400 or 409 for duplicate review, got {dup_res.status_code}"
    print(f"  ✓ Duplicate review prevented: HTTP {dup_res.status_code} returned ('{dup_res.json()['detail']}').")

    # 13. Test Notifications
    print("\n[12] Testing Notifications Lifecycle...")
    res = learner_client.get("/notifications")
    assert res.status_code == 200
    notifs = res.json()["items"]
    assert len(notifs) > 0
    print(f"  ✓ Learner has {len(notifs)} notifications.")

    # Mark first notification as read
    first_notif_id = notifs[0]["id"]
    res = learner_client.patch(f"/notifications/{first_notif_id}/read")
    assert res.status_code == 200
    assert res.json()["is_read"] is True
    print(f"  ✓ Notification #{first_notif_id} marked as read.")

    # Mark all as read
    res = learner_client.post("/notifications/read-all")
    assert res.status_code == 200
    res = learner_client.get("/notifications")
    assert res.json()["unread_count"] == 0
    print(f"  ✓ All notifications marked as read. Unread count: 0.")

    # 14. Test Offering CRUD (Tutor)
    print("\n[13] Testing Tutor Offering CRUD...")
    # Create
    create_offering_res = tutor_client.post("/offerings", json={
        "title": "Machine Learning Lab & Viva Prep",
        "subject": "Computer Science",
        "description": "Prepare for college ML lab exams, decision trees, neural net architectures and viva.",
        "level": "Intermediate",
        "hourly_rate": 600.0,
        "is_active": True
    })
    assert create_offering_res.status_code == 201
    offering_obj = create_offering_res.json()
    test_offering_id = offering_obj["id"]
    print(f"  ✓ Created new offering #{test_offering_id}: '{offering_obj['title']}'")

    # Update
    update_res = tutor_client.put(f"/offerings/{test_offering_id}", json={
        "hourly_rate": 650.0,
        "description": "Updated syllabus with PyTorch and Scikit-Learn labs."
    })
    assert update_res.status_code == 200
    assert float(update_res.json()["hourly_rate"]) == 650.0
    print(f"  ✓ Updated offering #{test_offering_id} rate to ₹650.")

    # Delete
    del_res = tutor_client.delete(f"/offerings/{test_offering_id}")
    assert del_res.status_code == 200
    print(f"  ✓ Deleted test offering #{test_offering_id}.")

    print("\n==================================================")
    print("🎉 ALL 13 CORE INTEGRATION TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    test_full_application()
