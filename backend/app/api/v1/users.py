from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.tutor_profile import TutorProfile
from app.models.user import User
from app.schemas.user import UserProfileUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["Users & Profiles"])


@router.get(
    "/profile",
    response_model=UserResponse,
    summary="Get profile details for currently authenticated user",
)
def get_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the authenticated user's complete profile, including tutor credentials if tutor."""
    return current_user


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Update profile details for currently authenticated user",
)
def update_user_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Update personal bio, college details, and tutor expertise.
    Guarantees that users can only edit their own profile.
    """
    # 1. Update general user fields if provided
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url
    if profile_in.bio is not None:
        current_user.bio = profile_in.bio
    if profile_in.college is not None:
        current_user.college = profile_in.college
    if profile_in.department is not None:
        current_user.department = profile_in.department
    if profile_in.year_of_study is not None:
        current_user.year_of_study = profile_in.year_of_study
    if profile_in.learning_interests is not None:
        current_user.learning_interests = profile_in.learning_interests

    # 2. Update tutor-specific fields if user is a tutor
    if current_user.role == "tutor":
        tutor_profile = (
            db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
        )
        if not tutor_profile:
            tutor_profile = TutorProfile(user_id=current_user.id)
            db.add(tutor_profile)
            db.flush()

        if profile_in.hourly_rate is not None:
            tutor_profile.hourly_rate = profile_in.hourly_rate
        if profile_in.teaching_subjects is not None:
            tutor_profile.teaching_subjects = profile_in.teaching_subjects
        if profile_in.experience_years is not None:
            tutor_profile.experience_years = profile_in.experience_years
        if profile_in.experience_description is not None:
            tutor_profile.experience_description = profile_in.experience_description

    db.commit()
    db.refresh(current_user)
    return current_user
