from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_learner
from app.db.session import get_db
from app.models.review import Review
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.review import ReviewCreate
from app.schemas.tutor import ReviewResponse
from app.services.notification_service import create_notification
from app.services.tutor_service import recalculate_tutor_ratings

router = APIRouter(prefix="/reviews", tags=["Reviews & Ratings"])


def build_review_response(review: Review) -> ReviewResponse:
    return ReviewResponse(
        id=review.id,
        session_id=review.session_id,
        learner_id=review.learner_id,
        learner_name=review.learner.full_name if review.learner else "Student",
        learner_avatar=review.learner.avatar_url if review.learner else None,
        tutor_id=review.tutor_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


@router.post(
    "",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a review and rating for a completed session",
)
def create_review(
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_learner),
    db: Session = Depends(get_db),
) -> ReviewResponse:
    """
    Learner submits a 1-5 star review for a completed session.
    Enforces participant ownership, ensures single review per session,
    and dynamically recalculates the tutor's average rating.
    """
    # 1. Fetch session
    session = db.query(SessionModel).filter(SessionModel.id == review_in.session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session #{review_in.session_id} not found.",
        )

    # 2. Only the participating learner can review
    if session.learner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only the learner who participated in this session can review it.",
        )

    # 3. Only completed sessions can be reviewed
    if session.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review session with status '{session.status}'. Only 'completed' sessions can be reviewed.",
        )

    # 4. Check for existing review (one review per session)
    existing_review = db.query(Review).filter(Review.session_id == session.id).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A review has already been submitted for this session.",
        )

    # 5. Persist review
    new_review = Review(
        session_id=session.id,
        learner_id=current_user.id,
        tutor_id=session.tutor_id,
        rating=review_in.rating,
        comment=review_in.comment,
    )
    db.add(new_review)
    db.flush()

    # 6. Recalculate tutor's average rating and total reviews
    recalculate_tutor_ratings(db=db, tutor_id=session.tutor_id)

    # 7. Notify tutor of review submission
    create_notification(
        db=db,
        user_id=session.tutor_id,
        title="New Review Received",
        message=f"{current_user.full_name} gave you a {review_in.rating}-star review for '{session.offering.title}'.",
        notification_type="new_review",
        link_url="/profile",
    )

    db.commit()
    db.refresh(new_review)
    return build_review_response(new_review)


@router.get(
    "/tutor/{tutor_id}",
    response_model=List[ReviewResponse],
    summary="Get all reviews submitted for a specific tutor",
)
def get_tutor_reviews(
    tutor_id: int,
    db: Session = Depends(get_db),
) -> List[ReviewResponse]:
    """Public read endpoint to view verified reviews received by a tutor."""
    reviews = (
        db.query(Review)
        .filter(Review.tutor_id == tutor_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [build_review_response(r) for r in reviews]
