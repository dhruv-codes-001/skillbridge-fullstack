from typing import Optional
from pydantic import BaseModel, field_validator


class ReviewCreate(BaseModel):
    session_id: int
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be an integer between 1 and 5.")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if len(clean) == 0:
                return None
            return clean
        return v
