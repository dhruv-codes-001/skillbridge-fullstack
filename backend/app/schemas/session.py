from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.tutor import ReviewResponse


class SessionCreate(BaseModel):
    offering_id: int
    scheduled_start: datetime
    duration_minutes: int = 60
    learner_notes: Optional[str] = None

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v not in [30, 45, 60, 90, 120]:
            raise ValueError("Duration must be 30, 45, 60, 90, or 120 minutes.")
        return v

    @field_validator("scheduled_start")
    @classmethod
    def validate_start_time(cls, v: datetime) -> datetime:
        # Note: timezone aware or naive handled cleanly
        return v


class SessionStatusUpdate(BaseModel):
    action: Literal["accept", "reject", "complete", "cancel"]
    reason: Optional[str] = None


class SessionDetailResponse(BaseModel):
    id: int
    offering_id: int
    offering_title: str
    subject: str
    hourly_rate: Decimal
    learner_id: int
    learner_name: str
    learner_avatar: Optional[str] = None
    tutor_id: int
    tutor_name: str
    tutor_avatar: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    duration_minutes: int
    status: str
    learner_notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    review: Optional[ReviewResponse] = None

    model_config = ConfigDict(from_attributes=True)
