from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.review import Review
from app.models.tutor_profile import TutorProfile


def recalculate_tutor_ratings(db: Session, tutor_id: int) -> None:
    """
    Recalculate the average rating and review count for a tutor after review mutations.
    """
    tutor_profile = db.query(TutorProfile).filter(TutorProfile.user_id == tutor_id).first()
    if not tutor_profile:
        return

    reviews = db.query(Review).filter(Review.tutor_id == tutor_id).all()
    count = len(reviews)

    if count == 0:
        tutor_profile.average_rating = Decimal("0.00")
        tutor_profile.total_reviews = 0
    else:
        avg = sum(r.rating for r in reviews) / count
        tutor_profile.average_rating = Decimal(str(round(avg, 2)))
        tutor_profile.total_reviews = count
