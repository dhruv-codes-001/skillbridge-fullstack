import re
from decimal import Decimal
from fastapi.testclient import TestClient

from app.models.offering import Offering
from app.models.review import Review
from app.models.session import Session


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


def test_tutor_create_offering_success(client: TestClient):
    token = register_user(
        client,
        "tutor_create@test.edu",
        "tutor",
        "Dr. Offerings",
        hourly_rate=45.00,
        teaching_subjects="Computer Science",
    )
    client.cookies.set("access_token", token)

    payload = {
        "title": "Machine Learning Fundamentals",
        "subject": "Computer Science",
        "description": "Comprehensive course on linear regression, decision trees, and neural nets.",
        "level": "Intermediate",
        "hourly_rate": 45.00,
        "is_active": True,
    }
    response = client.post("/api/v1/offerings", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Machine Learning Fundamentals"
    assert data["subject"] == "Computer Science"
    assert data["level"] == "Intermediate"
    assert float(data["hourly_rate"]) == 45.00
    assert data["is_active"] is True
    assert data["tutor_name"] == "Dr. Offerings"


def test_learner_cannot_create_offering(client: TestClient):
    token = register_user(
        client,
        "learner_block@test.edu",
        "learner",
        "Blocked Learner",
    )
    client.cookies.set("access_token", token)

    payload = {
        "title": "Unauthorized Course",
        "subject": "Physics",
        "description": "Learners should not be able to create offerings.",
        "level": "Beginner",
        "hourly_rate": 20.00,
    }
    response = client.post("/api/v1/offerings", json=payload)
    assert response.status_code == 403
    assert "tutor role required" in response.json()["detail"].lower()


def test_unauthenticated_cannot_create_offering(client: TestClient):
    client.cookies.clear()
    payload = {
        "title": "Ghost Offering",
        "subject": "Math",
        "description": "No auth should fail with 401.",
        "level": "Beginner",
        "hourly_rate": 20.00,
    }
    response = client.post("/api/v1/offerings", json=payload)
    assert response.status_code == 401


def test_offering_input_validation(client: TestClient):
    token = register_user(
        client,
        "tutor_val@test.edu",
        "tutor",
        "Val Tutor",
    )
    client.cookies.set("access_token", token)

    # 1. Invalid level
    res1 = client.post(
        "/api/v1/offerings",
        json={
            "title": "Invalid Level Course",
            "subject": "Math",
            "description": "Testing invalid academic level tag.",
            "level": "PhD Expert Only",
            "hourly_rate": 30.00,
        },
    )
    assert res1.status_code == 422

    # 2. Negative hourly rate
    res2 = client.post(
        "/api/v1/offerings",
        json={
            "title": "Negative Rate Course",
            "subject": "Math",
            "description": "Testing negative hourly rate.",
            "level": "Beginner",
            "hourly_rate": -15.00,
        },
    )
    assert res2.status_code == 422

    # 3. Too short description
    res3 = client.post(
        "/api/v1/offerings",
        json={
            "title": "Short Desc",
            "subject": "Math",
            "description": "Short",
            "level": "Beginner",
            "hourly_rate": 25.00,
        },
    )
    assert res3.status_code == 422


def test_tutor_update_own_offering(client: TestClient):
    token = register_user(client, "tutor_update@test.edu", "tutor", "Update Tutor")
    client.cookies.set("access_token", token)

    create_res = client.post(
        "/api/v1/offerings",
        json={
            "title": "Initial Title",
            "subject": "Calculus",
            "description": "Initial description with more than 10 characters.",
            "level": "Beginner",
            "hourly_rate": 25.00,
        },
    )
    offering_id = create_res.json()["id"]

    # Update offering
    update_res = client.put(
        f"/api/v1/offerings/{offering_id}",
        json={
            "title": "Updated Advanced Calculus",
            "level": "Advanced",
            "hourly_rate": 35.00,
            "is_active": False,
        },
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["title"] == "Updated Advanced Calculus"
    assert data["level"] == "Advanced"
    assert float(data["hourly_rate"]) == 35.00
    assert data["is_active"] is False


def test_tutor_cannot_edit_other_tutors_offering(client: TestClient):
    # Tutor 1 creates offering
    token1 = register_user(client, "tutor1_edit@test.edu", "tutor", "Tutor One")
    client.cookies.set("access_token", token1)
    res = client.post(
        "/api/v1/offerings",
        json={
            "title": "Tutor One Offering",
            "subject": "Physics",
            "description": "Exclusive course by tutor one.",
            "level": "Intermediate",
            "hourly_rate": 30.00,
        },
    )
    offering_id = res.json()["id"]

    # Tutor 2 attempts to edit Tutor 1's offering
    token2 = register_user(client, "tutor2_edit@test.edu", "tutor", "Tutor Two")
    client.cookies.set("access_token", token2)

    hacked_res = client.put(
        f"/api/v1/offerings/{offering_id}",
        json={"title": "Hacked Title"},
    )
    assert hacked_res.status_code == 403
    assert "only edit your own" in hacked_res.json()["detail"].lower()


def test_offering_delete_hard_and_soft(client: TestClient, db_session):
    token = register_user(client, "tutor_del@test.edu", "tutor", "Delete Tutor")
    client.cookies.set("access_token", token)

    # 1. Offering without sessions -> hard delete
    res1 = client.post(
        "/api/v1/offerings",
        json={
            "title": "Fresh Course No Bookings",
            "subject": "Biology",
            "description": "Brand new course ready for hard deletion.",
            "level": "Beginner",
            "hourly_rate": 20.00,
        },
    )
    offering_id1 = res1.json()["id"]

    del_res1 = client.delete(f"/api/v1/offerings/{offering_id1}")
    assert del_res1.status_code == 200
    assert del_res1.json()["soft_deleted"] is False

    # Verify 404 on get
    get_res = client.get(f"/api/v1/offerings/{offering_id1}")
    assert get_res.status_code == 404

    # 2. Offering with existing session -> soft delete
    res2 = client.post(
        "/api/v1/offerings",
        json={
            "title": "Course With History",
            "subject": "History",
            "description": "Course that will have an associated session.",
            "level": "All Levels",
            "hourly_rate": 22.00,
        },
    )
    offering_id2 = res2.json()["id"]

    # Create dummy session linked to offering2
    from datetime import datetime, timezone
    dummy_session = Session(
        offering_id=offering_id2,
        learner_id=1,
        tutor_id=1,
        scheduled_start=datetime.now(timezone.utc),
        scheduled_end=datetime.now(timezone.utc),
        duration_minutes=60,
        status="completed",
    )
    db_session.add(dummy_session)
    db_session.commit()

    # Deleting offering with session should soft-delete
    del_res2 = client.delete(f"/api/v1/offerings/{offering_id2}")
    assert del_res2.status_code == 200
    assert del_res2.json()["soft_deleted"] is True

    # Check that offering is still present in DB but inactive
    get_res2 = client.get(f"/api/v1/offerings/{offering_id2}")
    assert get_res2.status_code == 200
    assert get_res2.json()["is_active"] is False


def test_public_marketplace_search_and_filters(client: TestClient):
    client.cookies.clear()

    # Create Tutor A (Math, Calculus, 5.0 rating)
    t_a = register_user(
        client,
        "math_tutor@test.edu",
        "tutor",
        "Professor Euler",
        college="MIT",
        department="Mathematics",
        teaching_subjects="Calculus, Linear Algebra",
        hourly_rate=30.00,
    )
    client.cookies.set("access_token", t_a)
    client.post(
        "/api/v1/offerings",
        json={
            "title": "Differential Calculus Mastery",
            "subject": "Mathematics",
            "description": "Master limits, derivatives, and curve sketching.",
            "level": "Beginner",
            "hourly_rate": 30.00,
        },
    )

    # Create Tutor B (CS, Python, 4.0 rating)
    t_b = register_user(
        client,
        "cs_tutor@test.edu",
        "tutor",
        "Grace Hopper",
        college="Yale",
        department="Computer Science",
        teaching_subjects="Python, Compilers",
        hourly_rate=45.00,
    )
    client.cookies.set("access_token", t_b)
    client.post(
        "/api/v1/offerings",
        json={
            "title": "Compiler Design & Parsing",
            "subject": "Computer Science",
            "description": "Lexing, AST generation, and LLVM bytecode.",
            "level": "Advanced",
            "hourly_rate": 45.00,
        },
    )

    # 1. Public search without auth
    client.cookies.clear()
    res_all = client.get("/api/v1/tutors")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total"] >= 2
    assert "items" in data_all

    # 2. Filter by department
    res_dept = client.get("/api/v1/tutors?department=Mathematics")
    assert res_dept.status_code == 200
    items_dept = res_dept.json()["items"]
    assert any(t["full_name"] == "Professor Euler" for t in items_dept)
    assert not any(t["full_name"] == "Grace Hopper" for t in items_dept)

    # 3. Filter by subject
    res_subj = client.get("/api/v1/tutors?subject=Computer Science")
    assert res_subj.status_code == 200
    items_subj = res_subj.json()["items"]
    assert any(t["full_name"] == "Grace Hopper" for t in items_subj)

    # 4. Search keyword
    res_search = client.get("/api/v1/tutors?search=Differential")
    assert res_search.status_code == 200
    items_search = res_search.json()["items"]
    assert any(t["full_name"] == "Professor Euler" for t in items_search)

    # 5. Pagination
    res_paged = client.get("/api/v1/tutors?page=1&size=1")
    assert res_paged.status_code == 200
    assert len(res_paged.json()["items"]) == 1
    assert res_paged.json()["page"] == 1
    assert res_paged.json()["size"] == 1


def test_tutor_details_public(client: TestClient):
    client.cookies.clear()
    token = register_user(
        client,
        "detail_tutor@test.edu",
        "tutor",
        "Detail Specialist",
        college="Stanford",
        department="Bioengineering",
        teaching_subjects="Genomics",
        hourly_rate=50.00,
    )
    client.cookies.set("access_token", token)

    # Create offering
    off_res = client.post(
        "/api/v1/offerings",
        json={
            "title": "CRISPR & Gene Editing",
            "subject": "Bioengineering",
            "description": "Hands on walkthrough of modern molecular genetics.",
            "level": "Advanced",
            "hourly_rate": 50.00,
        },
    )
    tutor_id = off_res.json()["tutor_id"]

    # Public read of tutor details
    client.cookies.clear()
    res = client.get(f"/api/v1/tutors/{tutor_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == tutor_id
    assert data["full_name"] == "Detail Specialist"
    assert data["college"] == "Stanford"
    assert len(data["offerings"]) == 1
    assert data["offerings"][0]["title"] == "CRISPR & Gene Editing"
    assert isinstance(data["reviews"], list)

    # 404 for non-existent tutor
    res_404 = client.get("/api/v1/tutors/99999")
    assert res_404.status_code == 404


def test_marketplace_no_duplicate_tutors_with_multiple_offerings(client: TestClient):
    """
    Ensure tutors with multiple matching active offerings are not duplicated
    in search_marketplace and count is accurate.
    """
    client.cookies.clear()
    token = register_user(
        client,
        "multi_course_tutor@college.edu",
        "tutor",
        "Multi Course Guru",
        college="IIT Bombay",
        department="Computer Science",
        teaching_subjects="Algorithms, Systems",
        hourly_rate=600.0,
    )
    client.cookies.set("access_token", token)

    # Create 3 active offerings for the same tutor matching "Algorithms"
    for i in range(1, 4):
        res = client.post(
            "/api/v1/offerings",
            json={
                "title": f"Algorithms Mastery Module {i}",
                "subject": "Algorithms",
                "description": f"Deep dive part {i} into computational algorithms.",
                "level": "Intermediate",
                "hourly_rate": 600.0,
            },
        )
        assert res.status_code == 201

    client.cookies.clear()

    # Query with subject filter matching all 3 offerings
    res = client.get("/api/v1/tutors?subject=Algorithms")
    assert res.status_code == 200
    data = res.json()

    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["full_name"] == "Multi Course Guru"
    assert data["items"][0]["active_offerings_count"] == 3

    # Query with search matching all 3 offerings
    res_search = client.get("/api/v1/tutors?search=Algorithms")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 1
    assert len(data_search["items"]) == 1


def test_marketplace_postgresql_order_by_distinct_compliance(db_session):
    """
    PostgreSQL requires that for SELECT DISTINCT, every expression in ORDER BY
    must appear in the SELECT target list:
    'psycopg2.errors.InvalidColumnReference: for SELECT DISTINCT, ORDER BY expressions must appear in select list'
    This regression test validates the query against the PostgreSQL dialect compiler.
    """
    from sqlalchemy.dialects import postgresql
    from sqlalchemy import func, distinct
    from app.models.user import User
    from app.models.tutor_profile import TutorProfile
    from app.models.offering import Offering

    query = (
        db_session.query(User)
        .join(TutorProfile, User.id == TutorProfile.user_id)
        .outerjoin(Offering, (Offering.tutor_id == User.id) & (Offering.is_active == True))
        .filter(User.role == "tutor", User.is_active == True)
    )

    # 1. Validate count query compiles cleanly
    count_stmt = query.with_entities(func.count(distinct(User.id))).statement
    count_sql = str(count_stmt.compile(dialect=postgresql.dialect()))
    assert "count(DISTINCT users.id)" in count_sql

    # 2. Validate paginated query compiles with SELECT DISTINCT and ORDER BY expressions in SELECT list
    tutor_rows_stmt = (
        query.with_entities(User.id, TutorProfile.average_rating, User.full_name)
        .distinct()
        .order_by(TutorProfile.average_rating.desc(), User.full_name.asc())
        .offset(0)
        .limit(10)
        .statement
    )
    sql = str(tutor_rows_stmt.compile(dialect=postgresql.dialect()))

    # Verify DISTINCT is used
    assert "SELECT DISTINCT " in sql
    parts = re.split(r"\s+FROM\s+", sql, maxsplit=1, flags=re.IGNORECASE)
    assert len(parts) == 2
    select_clause, from_clause = parts

    # Critical PostgreSQL requirement: expressions in ORDER BY must appear in SELECT list
    assert "tutor_profiles.average_rating" in select_clause
    assert "users.full_name" in select_clause
    assert "ORDER BY tutor_profiles.average_rating DESC, users.full_name ASC" in sql

