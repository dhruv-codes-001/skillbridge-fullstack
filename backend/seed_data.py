import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Ensure UTF-8 encoding on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import (
    Notification,
    Offering,
    Review,
    Session,
    TutorProfile,
    User,
)


def seed_database():
    db = SessionLocal()
    print("[*] Starting SkillBridge database seeding (Indian Colleges)...")

    try:
        # Default shared password for all demo accounts
        default_password = "password123"
        hashed_password = get_password_hash(default_password)

        # ---------------------------------------------------------
        # 1. Seed Users (Learners & Tutors)
        # ---------------------------------------------------------
        users_data = [
            # Learners
            {
                "email": "aarav.learner@college.edu",
                "full_name": "Aarav Sharma",
                "role": "learner",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                "bio": "2nd Year B.Tech CSE student preparing for competitive programming and core engineering subjects.",
                "college": "IIT Delhi",
                "department": "Computer Science & Engineering",
                "year_of_study": "2nd Year",
                "learning_interests": "Data Structures, Algorithms, Discrete Mathematics, Operating Systems",
            },
            {
                "email": "priya.learner@college.edu",
                "full_name": "Priya Nair",
                "role": "learner",
                "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200",
                "bio": "1st Year B.Tech student eager to conquer Engineering Chemistry, Thermodynamics, and Calculus.",
                "college": "BITS Pilani",
                "department": "Chemical Engineering",
                "year_of_study": "1st Year",
                "learning_interests": "Organic Chemistry, Engineering Chemistry, Calculus, Thermodynamics",
            },
            # Tutors
            {
                "email": "rohan.tutor@college.edu",
                "full_name": "Rohan Kulkarni",
                "role": "tutor",
                "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200",
                "bio": "Final year B.Tech CSE student. Mentored 120+ juniors in Data Structures, Algorithms, and Operating Systems for semester exams and technical placements.",
                "college": "IIT Bombay",
                "department": "Computer Science & Engineering",
                "year_of_study": "Final Year",
                "learning_interests": "Systems Architecture, Machine Learning, Compilers",
            },
            {
                "email": "ananya.math@college.edu",
                "full_name": "Ananya Deshmukh",
                "role": "tutor",
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                "bio": "Postgraduate Mathematics scholar specializing in making Vector Calculus, Linear Algebra, and Differential Equations intuitive and scoring.",
                "college": "Delhi University (St. Stephen's)",
                "department": "Mathematics",
                "year_of_study": "Postgraduate",
                "learning_interests": "Applied Topology, Mathematical Modelling, Cryptography",
            },
            {
                "email": "vikram.chem@college.edu",
                "full_name": "Vikram Malhotra",
                "role": "tutor",
                "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200",
                "bio": "3rd Year BS research scholar at IISc. I help students grasp reaction mechanisms and physical chemistry without rote memorization.",
                "college": "IISc Bangalore",
                "department": "Chemical Sciences",
                "year_of_study": "3rd Year",
                "learning_interests": "Organic Synthesis, Structural Biology, Chemical Kinetics",
            },
        ]

        user_records = {}
        for u in users_data:
            existing_user = db.query(User).filter(User.email == u["email"]).first()
            if not existing_user:
                new_user = User(
                    email=u["email"],
                    hashed_password=hashed_password,
                    full_name=u["full_name"],
                    role=u["role"],
                    avatar_url=u["avatar_url"],
                    bio=u["bio"],
                    college=u["college"],
                    department=u["department"],
                    year_of_study=u["year_of_study"],
                    learning_interests=u["learning_interests"],
                    is_active=True,
                )
                db.add(new_user)
                db.flush()
                user_records[u["email"]] = new_user
                print(f"  + Created user: {u['full_name']} ({u['role']})")
            else:
                user_records[u["email"]] = existing_user
                print(f"  ~ Existing user: {u['full_name']}")

        # ---------------------------------------------------------
        # 2. Seed Tutor Profiles
        # ---------------------------------------------------------
        tutor_profiles_data = [
            {
                "email": "rohan.tutor@college.edu",
                "hourly_rate": Decimal("500.00"),
                "teaching_subjects": "Data Structures & Algorithms, Python, Operating Systems, C++",
                "experience_years": 3,
                "experience_description": "Former Teaching Assistant for Data Structures. Conducted lab doubt sessions for 200+ batchmates and 1-on-1 code reviews.",
                "average_rating": Decimal("5.00"),
                "total_reviews": 1,
                "total_sessions_completed": 1,
            },
            {
                "email": "ananya.math@college.edu",
                "hourly_rate": Decimal("400.00"),
                "teaching_subjects": "Engineering Mathematics, Calculus, Linear Algebra, Differential Equations",
                "experience_years": 4,
                "experience_description": "Four years of peer tutoring and university math coaching. Focused on syllabus alignment and past years' question papers.",
                "average_rating": Decimal("4.80"),
                "total_reviews": 1,
                "total_sessions_completed": 1,
            },
            {
                "email": "vikram.chem@college.edu",
                "hourly_rate": Decimal("450.00"),
                "teaching_subjects": "Organic Chemistry, Physical Chemistry, Biochemistry, Reaction Mechanisms",
                "experience_years": 2,
                "experience_description": "Departmental peer tutor for undergraduates. Received Dean's Teaching Commendation in 2025.",
                "average_rating": Decimal("5.00"),
                "total_reviews": 1,
                "total_sessions_completed": 1,
            },
        ]

        for tp in tutor_profiles_data:
            tutor_user = user_records[tp["email"]]
            existing_tp = (
                db.query(TutorProfile).filter(TutorProfile.user_id == tutor_user.id).first()
            )
            if not existing_tp:
                new_tp = TutorProfile(
                    user_id=tutor_user.id,
                    hourly_rate=tp["hourly_rate"],
                    teaching_subjects=tp["teaching_subjects"],
                    experience_years=tp["experience_years"],
                    experience_description=tp["experience_description"],
                    average_rating=tp["average_rating"],
                    total_reviews=tp["total_reviews"],
                    total_sessions_completed=tp["total_sessions_completed"],
                )
                db.add(new_tp)
                print(f"  + Created tutor profile for {tutor_user.full_name}")
            else:
                print(f"  ~ Existing tutor profile for {tutor_user.full_name}")

        # ---------------------------------------------------------
        # 3. Seed Offerings
        # ---------------------------------------------------------
        offerings_data = [
            {
                "tutor_email": "rohan.tutor@college.edu",
                "title": "Data Structures & Algorithms Deep-Dive",
                "subject": "Computer Science",
                "description": "Comprehensive review of trees, graphs, heaps, dynamic programming, and complexity analysis. Includes practice questions for semester mid-sems and placements.",
                "level": "Intermediate",
                "hourly_rate": Decimal("500.00"),
            },
            {
                "tutor_email": "rohan.tutor@college.edu",
                "title": "Python Programming & Problem Solving",
                "subject": "Computer Science",
                "description": "Foundational Python for engineering students: OOP, file handling, modules, and clean coding for lab assignments and projects.",
                "level": "Beginner",
                "hourly_rate": Decimal("400.00"),
            },
            {
                "tutor_email": "ananya.math@college.edu",
                "title": "Engineering Mathematics & Vector Calculus",
                "subject": "Mathematics",
                "description": "Intuitive mastery of partial derivatives, multiple integrals, Green's Theorem, Stokes' Theorem, and Divergence Theorem with university PYQs.",
                "level": "Advanced",
                "hourly_rate": Decimal("400.00"),
            },
            {
                "tutor_email": "ananya.math@college.edu",
                "title": "Linear Algebra: Eigenvalues & Vector Spaces",
                "subject": "Mathematics",
                "description": "Matrix operations, determinants, eigenvalues, eigenvectors, Cayley-Hamilton theorem, and vector spaces simplified for engineering exams.",
                "level": "Intermediate",
                "hourly_rate": Decimal("350.00"),
            },
            {
                "tutor_email": "vikram.chem@college.edu",
                "title": "Organic Chemistry Reaction Mechanism Mastery",
                "subject": "Chemistry",
                "description": "Master SN1/SN2, E1/E2, electrophilic aromatic substitution, and carbonyl reactions through step-by-step electron arrow pushing.",
                "level": "Intermediate",
                "hourly_rate": Decimal("450.00"),
            },
            {
                "tutor_email": "vikram.chem@college.edu",
                "title": "Biochemistry Fundamentals & Metabolic Pathways",
                "subject": "Chemistry",
                "description": "Enzyme kinetics (Michaelis-Menten), glycolysis, Krebs cycle, and metabolic pathways broken down for semester exams.",
                "level": "All Levels",
                "hourly_rate": Decimal("400.00"),
            },
        ]

        offering_records = {}
        for o in offerings_data:
            tutor_user = user_records[o["tutor_email"]]
            existing_offering = (
                db.query(Offering)
                .filter(Offering.tutor_id == tutor_user.id, Offering.title == o["title"])
                .first()
            )
            if not existing_offering:
                new_offering = Offering(
                    tutor_id=tutor_user.id,
                    title=o["title"],
                    subject=o["subject"],
                    description=o["description"],
                    level=o["level"],
                    hourly_rate=o["hourly_rate"],
                    is_active=True,
                )
                db.add(new_offering)
                db.flush()
                offering_records[o["title"]] = new_offering
                print(f"  + Created offering: '{o['title']}' by {tutor_user.full_name}")
            else:
                offering_records[o["title"]] = existing_offering
                print(f"  ~ Existing offering: '{o['title']}'")

        # ---------------------------------------------------------
        # 4. Seed Sessions
        # ---------------------------------------------------------
        now = datetime.now(timezone.utc)

        sessions_data = [
            # 1: Completed Session (Aarav -> Rohan)
            {
                "offering_title": "Data Structures & Algorithms Deep-Dive",
                "learner_email": "aarav.learner@college.edu",
                "tutor_email": "rohan.tutor@college.edu",
                "scheduled_start": now - timedelta(days=7),
                "scheduled_end": now - timedelta(days=7) + timedelta(hours=1),
                "duration_minutes": 60,
                "status": "completed",
                "learner_notes": "Focus on Red-Black Trees balancing rotations and Dijkstra's algorithm proof for mid-sem exam.",
                "cancellation_reason": None,
            },
            # 2: Completed Session (Priya -> Vikram)
            {
                "offering_title": "Organic Chemistry Reaction Mechanism Mastery",
                "learner_email": "priya.learner@college.edu",
                "tutor_email": "vikram.chem@college.edu",
                "scheduled_start": now - timedelta(days=3),
                "scheduled_end": now - timedelta(days=3) + timedelta(hours=1),
                "duration_minutes": 60,
                "status": "completed",
                "learner_notes": "Need help predicting stereochemical products for Diels-Alder cycloadditions for upcoming internals.",
                "cancellation_reason": None,
            },
            # 3: Upcoming Accepted Session (Priya -> Ananya)
            {
                "offering_title": "Engineering Mathematics & Vector Calculus",
                "learner_email": "priya.learner@college.edu",
                "tutor_email": "ananya.math@college.edu",
                "scheduled_start": now + timedelta(days=1, hours=3),
                "scheduled_end": now + timedelta(days=1, hours=4),
                "duration_minutes": 60,
                "status": "accepted",
                "learner_notes": "Preparing for university end-sem review covering line integrals and Green's Theorem.",
                "cancellation_reason": None,
            },
            # 4: Pending Request (Aarav -> Rohan)
            {
                "offering_title": "Python Programming & Problem Solving",
                "learner_email": "aarav.learner@college.edu",
                "tutor_email": "rohan.tutor@college.edu",
                "scheduled_start": now + timedelta(days=3, hours=2),
                "scheduled_end": now + timedelta(days=3, hours=3),
                "duration_minutes": 60,
                "status": "pending",
                "learner_notes": "Would love help with asynchronous asyncio pipelines in Python for my project.",
                "cancellation_reason": None,
            },
            # 5: Rejected Request (Aarav -> Ananya)
            {
                "offering_title": "Linear Algebra: Eigenvalues & Vector Spaces",
                "learner_email": "aarav.learner@college.edu",
                "tutor_email": "ananya.math@college.edu",
                "scheduled_start": now - timedelta(days=10),
                "scheduled_end": now - timedelta(days=10) + timedelta(hours=1),
                "duration_minutes": 60,
                "status": "rejected",
                "learner_notes": "Quick question on matrix Cayley-Hamilton theorem applications.",
                "cancellation_reason": "Tutor had an unavoidable department seminar conflict.",
            },
        ]

        session_records = []
        for s in sessions_data:
            offering = offering_records[s["offering_title"]]
            learner = user_records[s["learner_email"]]
            tutor = user_records[s["tutor_email"]]

            existing_session = (
                db.query(Session)
                .filter(
                    Session.offering_id == offering.id,
                    Session.learner_id == learner.id,
                    Session.tutor_id == tutor.id,
                    Session.status == s["status"],
                )
                .first()
            )

            if not existing_session:
                new_session = Session(
                    offering_id=offering.id,
                    learner_id=learner.id,
                    tutor_id=tutor.id,
                    scheduled_start=s["scheduled_start"],
                    scheduled_end=s["scheduled_end"],
                    duration_minutes=s["duration_minutes"],
                    status=s["status"],
                    learner_notes=s["learner_notes"],
                    cancellation_reason=s["cancellation_reason"],
                )
                db.add(new_session)
                db.flush()
                session_records.append(new_session)
                print(
                    f"  + Created session: {learner.full_name} -> {tutor.full_name} [{s['status']}]"
                )
            else:
                session_records.append(existing_session)
                print(
                    f"  ~ Existing session: {learner.full_name} -> {tutor.full_name} [{s['status']}]"
                )

        # ---------------------------------------------------------
        # 5. Seed Reviews
        # ---------------------------------------------------------
        reviews_data = [
            {
                "session_index": 0,  # Aarav -> Rohan
                "rating": 5,
                "comment": "Rohan is an exceptional peer tutor! He explained red-black tree rotations and dynamic programming memoization in a way that finally clicked right before my mid-sem exam.",
            },
            {
                "session_index": 1,  # Priya -> Vikram
                "rating": 5,
                "comment": "Vikram's stereochemistry mechanism walkthroughs saved my grade in Organic Chemistry. Super patient, very structured, and gave amazing handwritten revision notes!",
            },
        ]

        for r in reviews_data:
            session_obj = session_records[r["session_index"]]
            if session_obj.status == "completed":
                existing_rev = (
                    db.query(Review).filter(Review.session_id == session_obj.id).first()
                )
                if not existing_rev:
                    new_rev = Review(
                        session_id=session_obj.id,
                        learner_id=session_obj.learner_id,
                        tutor_id=session_obj.tutor_id,
                        rating=r["rating"],
                        comment=r["comment"],
                    )
                    db.add(new_rev)
                    print(
                        f"  + Created review: {r['rating']}-star for session #{session_obj.id}"
                    )
                else:
                    print(f"  ~ Existing review for session #{session_obj.id}")

        # ---------------------------------------------------------
        # 6. Seed Notifications
        # ---------------------------------------------------------
        notifications_data = [
            {
                "user_email": "rohan.tutor@college.edu",
                "title": "New Booking Request",
                "message": "Aarav Sharma requested a session for 'Python Programming & Problem Solving'.",
                "notification_type": "booking_request",
                "link_url": "/sessions",
                "is_read": False,
            },
            {
                "user_email": "rohan.tutor@college.edu",
                "title": "New Review Received",
                "message": "Aarav Sharma left a 5-star review for 'Data Structures & Algorithms Deep-Dive'.",
                "notification_type": "new_review",
                "link_url": "/profile",
                "is_read": True,
            },
            {
                "user_email": "priya.learner@college.edu",
                "title": "Session Confirmed",
                "message": "Ananya Deshmukh accepted your booking for 'Engineering Mathematics & Vector Calculus'.",
                "notification_type": "booking_accepted",
                "link_url": "/sessions",
                "is_read": False,
            },
            {
                "user_email": "aarav.learner@college.edu",
                "title": "Session Completed",
                "message": "Your tutoring session with Rohan Kulkarni is complete. Please share your rating and review!",
                "notification_type": "session_completed",
                "link_url": "/sessions",
                "is_read": True,
            },
        ]

        for n in notifications_data:
            target_user = user_records[n["user_email"]]
            existing_notif = (
                db.query(Notification)
                .filter(
                    Notification.user_id == target_user.id,
                    Notification.title == n["title"],
                )
                .first()
            )
            if not existing_notif:
                new_notif = Notification(
                    user_id=target_user.id,
                    title=n["title"],
                    message=n["message"],
                    notification_type=n["notification_type"],
                    link_url=n["link_url"],
                    is_read=n["is_read"],
                )
                db.add(new_notif)
                print(f"  + Created notification for {target_user.full_name}: '{n['title']}'")
            else:
                print(f"  ~ Existing notification for {target_user.full_name}")

        db.commit()
        print("\n[OK] SkillBridge database seeding finished successfully!")
        print("Demo Credentials (all accounts use password: 'password123'):")
        print("  Learner 1: aarav.learner@college.edu (Aarav Sharma, IIT Delhi)")
        print("  Learner 2: priya.learner@college.edu (Priya Nair, BITS Pilani)")
        print("  Tutor 1:   rohan.tutor@college.edu (Rohan Kulkarni, IIT Bombay • ₹500/hr)")
        print("  Tutor 2:   ananya.math@college.edu (Ananya Deshmukh, DU St. Stephen's • ₹400/hr)")
        print("  Tutor 3:   vikram.chem@college.edu (Vikram Malhotra, IISc Bangalore • ₹450/hr)")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
