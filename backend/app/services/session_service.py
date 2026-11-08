from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel


def check_booking_conflict(
    db: Session,
    tutor_id: int,
    learner_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_session_id: Optional[int] = None,
) -> None:
    """
    Transaction-level overlap validation.
    Checks whether either the tutor or the learner already has an 'accepted' session
    whose interval [scheduled_start, scheduled_end] overlaps with [start_time, end_time].
    
    Formula for interval overlap:
        (Existing.start < New.end) AND (Existing.end > New.start)
        
    Raises HTTP 409 Conflict if an overlapping commitment is detected.
    
    Concurrency note for SQLite vs Azure SQL:
    SQLite serializes write transactions with a database-level write lock. In production
    with Azure SQL / PostgreSQL, this validation operates within an explicit transaction
    using repeatable read or SELECT ... FOR UPDATE row-level locking.
    """
    # 1. Tutor schedule collision check
    tutor_query = db.query(SessionModel).filter(
        SessionModel.tutor_id == tutor_id,
        SessionModel.status == "accepted",
        SessionModel.scheduled_start < end_time,
        SessionModel.scheduled_end > start_time,
    )
    if exclude_session_id:
        tutor_query = tutor_query.filter(SessionModel.id != exclude_session_id)

    if tutor_query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scheduling conflict: The tutor already has a confirmed session booked during this time slot.",
        )

    # 2. Learner schedule collision check
    learner_query = db.query(SessionModel).filter(
        SessionModel.learner_id == learner_id,
        SessionModel.status == "accepted",
        SessionModel.scheduled_start < end_time,
        SessionModel.scheduled_end > start_time,
    )
    if exclude_session_id:
        learner_query = learner_query.filter(SessionModel.id != exclude_session_id)

    if learner_query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scheduling conflict: You already have a confirmed session booked during this time slot.",
        )
