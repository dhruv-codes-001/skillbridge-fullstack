from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.offering import OfferingResponse


class ReviewResponse(BaseModel):
    id: int
    session_id: int
    learner_id: int
    learner_name: str
    learner_avatar: Optional[str] = None
    tutor_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TutorMarketplaceCard(BaseModel):
    id: int  # user id of the tutor
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    hourly_rate: Decimal
    teaching_subjects: Optional[str] = None
    experience_years: int
    experience_description: Optional[str] = None
    average_rating: Decimal
    total_reviews: int
    total_sessions_completed: int
    active_offerings_count: int
    offerings: List[OfferingResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TutorDetailResponse(BaseModel):
    id: int  # user id
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    hourly_rate: Decimal
    teaching_subjects: Optional[str] = None
    experience_years: int
    experience_description: Optional[str] = None
    average_rating: Decimal
    total_reviews: int
    total_sessions_completed: int
    offerings: List[OfferingResponse] = []
    reviews: List[ReviewResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedTutorsResponse(BaseModel):
    items: List[TutorMarketplaceCard]
    total: int
    page: int
    size: int
    pages: int
