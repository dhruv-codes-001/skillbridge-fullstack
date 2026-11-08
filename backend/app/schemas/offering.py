from datetime import datetime
from decimal import Decimal
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, field_validator

VALID_LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"]


class OfferingBase(BaseModel):
    title: str
    subject: str
    description: str
    level: str = "All Levels"
    hourly_rate: Decimal
    is_active: bool = True

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 3:
            raise ValueError("Title must be at least 3 characters long.")
        if len(clean) > 200:
            raise ValueError("Title cannot exceed 200 characters.")
        return clean

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Subject must be at least 2 characters long.")
        return clean

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 10:
            raise ValueError("Description must be at least 10 characters long.")
        return clean

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        if v not in VALID_LEVELS:
            raise ValueError(f"Level must be one of: {', '.join(VALID_LEVELS)}")
        return v

    @field_validator("hourly_rate")
    @classmethod
    def validate_rate(cls, v: Decimal) -> Decimal:
        if v < Decimal("0.00"):
            raise ValueError("Hourly rate cannot be negative.")
        if v > Decimal("1000.00"):
            raise ValueError("Hourly rate cannot exceed $1,000.00.")
        return v


class OfferingCreate(OfferingBase):
    pass


class OfferingUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    is_active: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if len(clean) < 3 or len(clean) > 200:
                raise ValueError("Title must be between 3 and 200 characters.")
            return clean
        return v

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if len(clean) < 2:
                raise ValueError("Subject must be at least 2 characters.")
            return clean
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if len(clean) < 10:
                raise ValueError("Description must be at least 10 characters.")
            return clean
        return v

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_LEVELS:
            raise ValueError(f"Level must be one of: {', '.join(VALID_LEVELS)}")
        return v

    @field_validator("hourly_rate")
    @classmethod
    def validate_rate(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v < Decimal("0.00") or v > Decimal("1000.00"):
                raise ValueError("Hourly rate must be between $0.00 and $1,000.00.")
        return v


class OfferingResponse(BaseModel):
    id: int
    tutor_id: int
    title: str
    subject: str
    description: str
    level: str
    hourly_rate: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Additional contextual fields for UI cards
    tutor_name: Optional[str] = None
    tutor_avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
