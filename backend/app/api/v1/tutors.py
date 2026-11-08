import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import distinct, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db.session import get_db
from app.models.offering import Offering
from app.models.review import Review
from app.models.tutor_profile import TutorProfile
from app.models.user import User
from app.schemas.offering import OfferingResponse
from app.schemas.tutor import (
    PaginatedTutorsResponse,
    ReviewResponse,
    TutorDetailResponse,
    TutorMarketplaceCard,
)

router = APIRouter(prefix="/tutors", tags=["Tutor Marketplace"])


def build_offering_dto(offering: Offering) -> OfferingResponse:
    return OfferingResponse(
        id=offering.id,
        tutor_id=offering.tutor_id,
        title=offering.title,
        subject=offering.subject,
        description=offering.description,
        level=offering.level,
        hourly_rate=offering.hourly_rate,
        is_active=offering.is_active,
        created_at=offering.created_at,
        updated_at=offering.updated_at,
        tutor_name=offering.tutor.full_name if offering.tutor else None,
        tutor_avatar=offering.tutor.avatar_url if offering.tutor else None,
    )


def build_review_dto(review: Review) -> ReviewResponse:
    return ReviewResponse(
        id=review.id,
        session_id=review.session_id,
        learner_id=review.learner_id,
        learner_name=review.learner.full_name if review.learner else "Anonymous Student",
        learner_avatar=review.learner.avatar_url if review.learner else None,
        tutor_id=review.tutor_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


@router.get(
    "",
    response_model=PaginatedTutorsResponse,
    summary="Search & filter the tutor marketplace with pagination",
)
def search_marketplace(
    search: Optional[str] = Query(None, description="Search by tutor name, bio, subject, or keywords"),
    subject: Optional[str] = Query(None, description="Filter by academic subject"),
    department: Optional[str] = Query(None, description="Filter by college department/branch"),
    min_rating: Optional[float] = Query(None, ge=0.0, le=5.0, description="Minimum average rating"),
    max_rate: Optional[float] = Query(None, ge=0.0, description="Maximum hourly rate"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=50, description="Page size"),
    db: Session = Depends(get_db),
) -> PaginatedTutorsResponse:
    """
    Public marketplace query returning active tutors, their ratings, review counts,
    and active course offerings.
    """
    query = (
        db.query(User)
        .join(TutorProfile, User.id == TutorProfile.user_id)
        .outerjoin(Offering, (Offering.tutor_id == User.id) & (Offering.is_active == True))
        .filter(User.role == "tutor", User.is_active == True)
    )

    # Filter: Department
    if department:
        query = query.filter(User.department.ilike(f"%{department.strip()}%"))

    # Filter: Minimum Rating
    if min_rating is not None:
        query = query.filter(TutorProfile.average_rating >= min_rating)

    # Filter: Maximum Hourly Rate
    if max_rate is not None:
        query = query.filter(
            or_(
                TutorProfile.hourly_rate <= max_rate,
                Offering.hourly_rate <= max_rate,
            )
        )

    # Filter: Subject
    if subject:
        clean_subj = f"%{subject.strip()}%"
        query = query.filter(
            or_(
                TutorProfile.teaching_subjects.ilike(clean_subj),
                Offering.subject.ilike(clean_subj),
            )
        )

    # Search keyword: tutor name, bio, subjects, offering title/desc
    if search:
        search_kw = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_kw),
                User.bio.ilike(search_kw),
                TutorProfile.teaching_subjects.ilike(search_kw),
                Offering.title.ilike(search_kw),
                Offering.description.ilike(search_kw),
                Offering.subject.ilike(search_kw),
            )
        )

    # Unique tutor users (PostgreSQL & SQLite compatible)
    total_count = query.with_entities(func.count(distinct(User.id))).scalar() or 0

    offset = (page - 1) * size
    tutor_rows = (
        query.with_entities(User.id, TutorProfile.average_rating, User.full_name)
        .distinct()
        .order_by(TutorProfile.average_rating.desc(), User.full_name.asc())
        .offset(offset)
        .limit(size)
        .all()
    )

    tutor_ids = [row[0] for row in tutor_rows]
    if tutor_ids:
        user_list = (
            db.query(User)
            .options(joinedload(User.tutor_profile), selectinload(User.offerings))
            .filter(User.id.in_(tutor_ids))
            .all()
        )
        user_map = {u.id: u for u in user_list}
        tutors = [user_map[tid] for tid in tutor_ids if tid in user_map]
    else:
        tutors = []

    items: List[TutorMarketplaceCard] = []
    for tutor in tutors:
        tp = tutor.tutor_profile
        active_offerings = [
            build_offering_dto(o) for o in tutor.offerings if o.is_active
        ]
        items.append(
            TutorMarketplaceCard(
                id=tutor.id,
                full_name=tutor.full_name,
                email=tutor.email,
                avatar_url=tutor.avatar_url,
                bio=tutor.bio,
                college=tutor.college,
                department=tutor.department,
                year_of_study=tutor.year_of_study,
                hourly_rate=tp.hourly_rate if tp else 0.00,
                teaching_subjects=tp.teaching_subjects if tp else None,
                experience_years=tp.experience_years if tp else 0,
                experience_description=tp.experience_description if tp else None,
                average_rating=tp.average_rating if tp else 0.00,
                total_reviews=tp.total_reviews if tp else 0,
                total_sessions_completed=tp.total_sessions_completed if tp else 0,
                active_offerings_count=len(active_offerings),
                offerings=active_offerings,
            )
        )

    pages = math.ceil(total_count / size) if total_count > 0 else 1

    return PaginatedTutorsResponse(
        items=items,
        total=total_count,
        page=page,
        size=size,
        pages=pages,
    )


@router.get(
    "/{id}",
    response_model=TutorDetailResponse,
    summary="Get complete tutor profile, offerings, and student reviews",
)
def get_tutor_details(
    id: int,
    db: Session = Depends(get_db),
) -> TutorDetailResponse:
    """Public read endpoint retrieving full tutor credentials, active offerings, and past reviews."""
    tutor = db.query(User).filter(User.id == id, User.role == "tutor", User.is_active == True).first()
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tutor with ID {id} not found.",
        )

    tp = tutor.tutor_profile
    active_offerings = [
        build_offering_dto(o) for o in tutor.offerings if o.is_active
    ]

    # Student reviews sorted newest first
    reviews_list = [
        build_review_dto(r)
        for r in sorted(tutor.tutor_reviews, key=lambda x: x.created_at, reverse=True)
    ]

    return TutorDetailResponse(
        id=tutor.id,
        full_name=tutor.full_name,
        email=tutor.email,
        avatar_url=tutor.avatar_url,
        bio=tutor.bio,
        college=tutor.college,
        department=tutor.department,
        year_of_study=tutor.year_of_study,
        hourly_rate=tp.hourly_rate if tp else 0.00,
        teaching_subjects=tp.teaching_subjects if tp else None,
        experience_years=tp.experience_years if tp else 0,
        experience_description=tp.experience_description if tp else None,
        average_rating=tp.average_rating if tp else 0.00,
        total_reviews=tp.total_reviews if tp else 0,
        total_sessions_completed=tp.total_sessions_completed if tp else 0,
        offerings=active_offerings,
        reviews=reviews_list,
    )
