from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    delete_auth_cookie,
    get_password_hash,
    set_auth_cookie,
    verify_password,
)
from app.db.session import get_db
from app.models.tutor_profile import TutorProfile
from app.models.user import User
from app.schemas.user import AuthResponse, UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new learner or tutor account",
)
def register(
    user_in: UserRegister,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    # 1. Reject duplicate email addresses
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # 2. Hash password securely using bcrypt
    hashed_pw = get_password_hash(user_in.password)

    # 3. Create User record
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=user_in.full_name,
        role=user_in.role,
        avatar_url=user_in.avatar_url,
        bio=user_in.bio,
        college=user_in.college,
        department=user_in.department,
        year_of_study=user_in.year_of_study,
        learning_interests=user_in.learning_interests,
        is_active=True,
    )
    db.add(new_user)
    db.flush()  # Obtain new_user.id

    # 4. Automatically create TutorProfile when user registers as a tutor
    if user_in.role == "tutor":
        tutor_profile = TutorProfile(
            user_id=new_user.id,
            hourly_rate=user_in.hourly_rate or 0.00,
            teaching_subjects=user_in.teaching_subjects,
            experience_years=user_in.experience_years or 0,
            experience_description=user_in.experience_description,
        )
        db.add(tutor_profile)

    db.commit()
    db.refresh(new_user)

    # 5. Issue JWT and set HttpOnly access_token cookie
    access_token = create_access_token(new_user.id)
    set_auth_cookie(response, access_token)

    return AuthResponse(access_token=access_token, user=new_user)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate with email & password and receive HttpOnly cookie",
)
def login(
    credentials: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    # 1. Find user by normalized email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify password with bcrypt
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Verify account active state
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This user account is inactive or disabled.",
        )

    # 4. Issue JWT and set HttpOnly access_token cookie
    access_token = create_access_token(user.id)
    set_auth_cookie(response, access_token)

    return AuthResponse(access_token=access_token, user=user)


@router.post(
    "/logout",
    summary="Log out and clear the authentication cookie",
)
def logout(response: Response) -> dict:
    delete_auth_cookie(response)
    return {"message": "Logged out successfully."}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Fetch profile information for current authenticated user",
)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return current_user
