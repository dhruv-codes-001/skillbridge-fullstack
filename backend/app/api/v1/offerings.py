from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_tutor
from app.db.session import get_db
from app.models.offering import Offering
from app.models.user import User
from app.schemas.offering import OfferingCreate, OfferingResponse, OfferingUpdate

router = APIRouter(prefix="/offerings", tags=["Offerings"])


def build_offering_response(offering: Offering) -> OfferingResponse:
    """Helper to enrich offering DTO with tutor's public name and avatar."""
    tutor_name = offering.tutor.full_name if offering.tutor else None
    tutor_avatar = offering.tutor.avatar_url if offering.tutor else None
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
        tutor_name=tutor_name,
        tutor_avatar=tutor_avatar,
    )


@router.get(
    "",
    response_model=List[OfferingResponse],
    summary="List course offerings with optional filters",
)
def list_offerings(
    tutor_id: Optional[int] = Query(None, description="Filter by tutor user ID"),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    level: Optional[str] = Query(None, description="Filter by academic level"),
    search: Optional[str] = Query(None, description="Search keyword in title or description"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[OfferingResponse]:
    """Public read endpoint to browse tutoring offerings."""
    query = db.query(Offering)

    if tutor_id is not None:
        query = query.filter(Offering.tutor_id == tutor_id)

    if is_active is not None:
        query = query.filter(Offering.is_active == is_active)

    if subject:
        query = query.filter(Offering.subject.ilike(f"%{subject.strip()}%"))

    if level:
        query = query.filter(Offering.level == level)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Offering.title.ilike(search_term),
                Offering.description.ilike(search_term),
                Offering.subject.ilike(search_term),
            )
        )

    offerings = query.order_by(Offering.created_at.desc()).offset(skip).limit(limit).all()
    return [build_offering_response(o) for o in offerings]


@router.get(
    "/{id}",
    response_model=OfferingResponse,
    summary="Retrieve details of a specific course offering",
)
def get_offering(
    id: int,
    db: Session = Depends(get_db),
) -> OfferingResponse:
    """Public read endpoint to view single offering details."""
    offering = db.query(Offering).filter(Offering.id == id).first()
    if not offering:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offering with ID {id} not found.",
        )
    return build_offering_response(offering)


@router.post(
    "",
    response_model=OfferingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course offering (Tutor only)",
)
def create_offering(
    offering_in: OfferingCreate,
    current_user: User = Depends(get_current_tutor),
    db: Session = Depends(get_db),
) -> OfferingResponse:
    """Restricted to authenticated tutors."""
    new_offering = Offering(
        tutor_id=current_user.id,
        title=offering_in.title,
        subject=offering_in.subject,
        description=offering_in.description,
        level=offering_in.level,
        hourly_rate=offering_in.hourly_rate,
        is_active=offering_in.is_active,
    )
    db.add(new_offering)
    db.commit()
    db.refresh(new_offering)
    return build_offering_response(new_offering)


@router.put(
    "/{id}",
    response_model=OfferingResponse,
    summary="Update an existing course offering (Owner Tutor only)",
)
def update_offering(
    id: int,
    offering_in: OfferingUpdate,
    current_user: User = Depends(get_current_tutor),
    db: Session = Depends(get_db),
) -> OfferingResponse:
    """Restricted to the owner of the offering."""
    offering = db.query(Offering).filter(Offering.id == id).first()
    if not offering:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offering with ID {id} not found.",
        )

    # Ownership enforcement
    if offering.tutor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only edit your own offerings.",
        )

    if offering_in.title is not None:
        offering.title = offering_in.title
    if offering_in.subject is not None:
        offering.subject = offering_in.subject
    if offering_in.description is not None:
        offering.description = offering_in.description
    if offering_in.level is not None:
        offering.level = offering_in.level
    if offering_in.hourly_rate is not None:
        offering.hourly_rate = offering_in.hourly_rate
    if offering_in.is_active is not None:
        offering.is_active = offering_in.is_active

    db.commit()
    db.refresh(offering)
    return build_offering_response(offering)


@router.delete(
    "/{id}",
    summary="Delete or deactivate an offering (Owner Tutor only)",
)
def delete_offering(
    id: int,
    current_user: User = Depends(get_current_tutor),
    db: Session = Depends(get_db),
) -> dict:
    """
    Safely delete an offering.
    If the offering has existing session bookings, soft-delete (is_active=False)
    to protect booking history integrity. Otherwise, remove permanently.
    """
    offering = db.query(Offering).filter(Offering.id == id).first()
    if not offering:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offering with ID {id} not found.",
        )

    # Ownership enforcement
    if offering.tutor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only delete your own offerings.",
        )

    has_sessions = len(offering.sessions) > 0
    if has_sessions:
        # Soft-delete to preserve relationship integrity with existing bookings
        offering.is_active = False
        db.commit()
        return {
            "message": "Offering has existing booking history and has been deactivated.",
            "id": id,
            "soft_deleted": True,
        }
    else:
        # Hard delete if no sessions are linked
        db.delete(offering)
        db.commit()
        return {
            "message": "Offering permanently deleted.",
            "id": id,
            "soft_deleted": False,
        }
