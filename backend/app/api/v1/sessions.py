from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_learner, get_current_user
from app.db.session import get_db
from app.models.offering import Offering
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.session import (
    SessionCreate,
    SessionDetailResponse,
    SessionStatusUpdate,
)
from app.schemas.tutor import ReviewResponse
from app.services.notification_service import create_notification
from app.services.session_service import check_booking_conflict

router = APIRouter(prefix="/sessions", tags=["Sessions & Bookings"])


def build_session_dto(session: SessionModel) -> SessionDetailResponse:
    """Helper to transform ORM session model into rich SessionDetailResponse DTO."""
    review_dto = None
    if session.review:
        review_dto = ReviewResponse(
            id=session.review.id,
            session_id=session.review.session_id,
            learner_id=session.review.learner_id,
            learner_name=session.review.learner.full_name if session.review.learner else "Student",
            learner_avatar=session.review.learner.avatar_url if session.review.learner else None,
            tutor_id=session.review.tutor_id,
            rating=session.review.rating,
            comment=session.review.comment,
            created_at=session.review.created_at,
        )

    return SessionDetailResponse(
        id=session.id,
        offering_id=session.offering_id,
        offering_title=session.offering.title if session.offering else "Deleted Offering",
        subject=session.offering.subject if session.offering else "General",
        hourly_rate=session.offering.hourly_rate if session.offering else 0.00,
        learner_id=session.learner_id,
        learner_name=session.learner.full_name if session.learner else "Unknown",
        learner_avatar=session.learner.avatar_url if session.learner else None,
        tutor_id=session.tutor_id,
        tutor_name=session.tutor.full_name if session.tutor else "Unknown",
        tutor_avatar=session.tutor.avatar_url if session.tutor else None,
        scheduled_start=session.scheduled_start,
        scheduled_end=session.scheduled_end,
        duration_minutes=session.duration_minutes,
        status=session.status,
        learner_notes=session.learner_notes,
        cancellation_reason=session.cancellation_reason,
        created_at=session.created_at,
        updated_at=session.updated_at,
        review=review_dto,
    )


@router.post(
    "",
    response_model=SessionDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book a tutoring session (Learners only)",
)
def create_session_booking(
    session_in: SessionCreate,
    current_user: User = Depends(get_current_learner),
    db: Session = Depends(get_db),
) -> SessionDetailResponse:
    """
    Learner books a tutoring session for an offering.
    Validates schedule non-collision and sends in-app notification to the tutor.
    """
    # 1. Fetch offering
    offering = db.query(Offering).filter(Offering.id == session_in.offering_id).first()
    if not offering or not offering.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested course offering was not found or is currently inactive.",
        )

    # 2. Tutors cannot book their own offerings
    if offering.tutor_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot book a tutoring session with yourself.",
        )

    # 3. Calculate interval end time
    start_time = session_in.scheduled_start
    end_time = start_time + timedelta(minutes=session_in.duration_minutes)

    # 4. Check for booking conflicts against accepted commitments
    check_booking_conflict(
        db=db,
        tutor_id=offering.tutor_id,
        learner_id=current_user.id,
        start_time=start_time,
        end_time=end_time,
    )

    # 5. Persist Session
    new_session = SessionModel(
        offering_id=offering.id,
        learner_id=current_user.id,
        tutor_id=offering.tutor_id,
        scheduled_start=start_time,
        scheduled_end=end_time,
        duration_minutes=session_in.duration_minutes,
        status="pending",
        learner_notes=session_in.learner_notes,
    )
    db.add(new_session)
    db.flush()

    # 6. Notify the tutor of incoming request
    create_notification(
        db=db,
        user_id=offering.tutor_id,
        title="New Booking Request",
        message=f"{current_user.full_name} requested a {session_in.duration_minutes}-minute session for '{offering.title}'.",
        notification_type="booking_request",
        link_url="/sessions",
    )

    db.commit()
    db.refresh(new_session)
    return build_session_dto(new_session)


@router.get(
    "",
    response_model=List[SessionDetailResponse],
    summary="List sessions for current authenticated user",
)
def list_sessions(
    role: Optional[str] = Query(None, description="Filter by role context: 'learner' or 'tutor'"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by session status"),
    upcoming: Optional[bool] = Query(None, description="Filter for upcoming accepted sessions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[SessionDetailResponse]:
    """Retrieve all sessions where the current user is either the learner or the tutor."""
    query = db.query(SessionModel)

    if role == "learner":
        query = query.filter(SessionModel.learner_id == current_user.id)
    elif role == "tutor":
        query = query.filter(SessionModel.tutor_id == current_user.id)
    else:
        query = query.filter(
            or_(
                SessionModel.learner_id == current_user.id,
                SessionModel.tutor_id == current_user.id,
            )
        )

    if status_filter:
        query = query.filter(SessionModel.status == status_filter.strip().lower())

    if upcoming is True:
        now = datetime.now(timezone.utc)
        query = query.filter(
            SessionModel.status == "accepted",
            SessionModel.scheduled_end >= now,
        )

    sessions = query.order_by(SessionModel.scheduled_start.desc()).all()
    return [build_session_dto(s) for s in sessions]


@router.get(
    "/{id}",
    response_model=SessionDetailResponse,
    summary="Retrieve session details by ID",
)
def get_session(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailResponse:
    """Retrieve details for a single session. Restricted to participating learner and tutor."""
    session = db.query(SessionModel).filter(SessionModel.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session #{id} not found.",
        )

    if current_user.id not in [session.learner_id, session.tutor_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not a participant in this session.",
        )

    return build_session_dto(session)


@router.patch(
    "/{id}/status",
    response_model=SessionDetailResponse,
    summary="Update session status (accept, reject, complete, cancel)",
)
def update_session_status(
    id: int,
    status_update: SessionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailResponse:
    """
    Perform authorized state transitions on a session:
      - accept: pending -> accepted (Tutor only, conflict check)
      - reject: pending -> rejected (Tutor only)
      - complete: accepted -> completed (Tutor only, increments total completed)
      - cancel: (pending -> cancelled by learner) OR (accepted -> cancelled by either party)
    """
    session = db.query(SessionModel).filter(SessionModel.id == id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session #{id} not found.",
        )

    if current_user.id not in [session.learner_id, session.tutor_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not a participant in this session.",
        )

    action = status_update.action
    current_status = session.status

    # =========================================================================
    # 1. ACTION: ACCEPT
    # =========================================================================
    if action == "accept":
        if current_status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot accept session: Current status is '{current_status}', expected 'pending'.",
            )
        if current_user.id != session.tutor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only the assigned tutor can accept this session request.",
            )

        # Transaction-level conflict re-check before accepting
        check_booking_conflict(
            db=db,
            tutor_id=session.tutor_id,
            learner_id=session.learner_id,
            start_time=session.scheduled_start,
            end_time=session.scheduled_end,
            exclude_session_id=session.id,
        )

        session.status = "accepted"
        create_notification(
            db=db,
            user_id=session.learner_id,
            title="Session Confirmed",
            message=f"{session.tutor.full_name} accepted your tutoring booking for '{session.offering.title}'.",
            notification_type="booking_accepted",
            link_url="/sessions",
        )

    # =========================================================================
    # 2. ACTION: REJECT
    # =========================================================================
    elif action == "reject":
        if current_status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject session: Current status is '{current_status}', expected 'pending'.",
            )
        if current_user.id != session.tutor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only the assigned tutor can reject this session request.",
            )

        session.status = "rejected"
        session.cancellation_reason = status_update.reason
        create_notification(
            db=db,
            user_id=session.learner_id,
            title="Session Request Declined",
            message=f"{session.tutor.full_name} was unable to accept your request for '{session.offering.title}'.",
            notification_type="booking_rejected",
            link_url="/sessions",
        )

    # =========================================================================
    # 3. ACTION: COMPLETE
    # =========================================================================
    elif action == "complete":
        if current_status != "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete session: Current status is '{current_status}', expected 'accepted'.",
            )
        if current_user.id != session.tutor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only the assigned tutor can mark this session completed.",
            )

        session.status = "completed"

        # Increment tutor total completed sessions
        if session.tutor and session.tutor.tutor_profile:
            session.tutor.tutor_profile.total_sessions_completed += 1

        create_notification(
            db=db,
            user_id=session.learner_id,
            title="Session Completed",
            message=f"Your tutoring session with {session.tutor.full_name} is complete. Please share your rating and review!",
            notification_type="session_completed",
            link_url="/sessions",
        )

    # =========================================================================
    # 4. ACTION: CANCEL
    # =========================================================================
    elif action == "cancel":
        if current_status not in ["pending", "accepted"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel session with status '{current_status}'.",
            )

        if current_status == "pending" and current_user.id != session.learner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only the requesting learner can cancel a pending request.",
            )

        session.status = "cancelled"
        session.cancellation_reason = status_update.reason

        # Notify the other participant
        other_user_id = session.tutor_id if current_user.id == session.learner_id else session.learner_id
        cancelled_by_name = current_user.full_name
        create_notification(
            db=db,
            user_id=other_user_id,
            title="Session Cancelled",
            message=f"Tutoring session for '{session.offering.title}' was cancelled by {cancelled_by_name}.",
            notification_type="booking_cancelled",
            link_url="/sessions",
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported action '{action}'.",
        )

    db.commit()
    db.refresh(session)
    return build_session_dto(session)
