import re
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, field_validator

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


class UserBase(BaseModel):
    email: str
    full_name: str
    role: Literal["learner", "tutor"]
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    learning_interests: Optional[str] = None


class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: Literal["learner", "tutor"]

    # Optional extended college profile info
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    learning_interests: Optional[str] = None

    # Optional tutor profile info (used if role == "tutor")
    hourly_rate: Optional[Decimal] = Decimal("0.00")
    teaching_subjects: Optional[str] = None
    experience_years: Optional[int] = 0
    experience_description: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean_email = v.strip().lower()
        if not re.match(EMAIL_REGEX, clean_email):
            raise ValueError("Invalid email address format.")
        return clean_email

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if v.strip() == "":
            raise ValueError("Password cannot be blank.")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean_name = v.strip()
        if len(clean_name) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return clean_name


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TutorProfileResponse(BaseModel):
    id: int
    user_id: int
    hourly_rate: Decimal
    teaching_subjects: Optional[str] = None
    experience_years: int
    experience_description: Optional[str] = None
    average_rating: Decimal
    total_reviews: int
    total_sessions_completed: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    learning_interests: Optional[str] = None
    is_active: bool
    created_at: datetime
    tutor_profile: Optional[TutorProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    learning_interests: Optional[str] = None

    # Tutor specific fields
    hourly_rate: Optional[Decimal] = None
    teaching_subjects: Optional[str] = None
    experience_years: Optional[int] = None
    experience_description: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_update_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if len(clean) < 2:
                raise ValueError("Full name must be at least 2 characters long.")
            return clean
        return v


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
