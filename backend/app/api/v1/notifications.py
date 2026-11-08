from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notifications for current user with unread counter (polling endpoint)",
)
def list_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    """
    Polled periodically (every 30s) by frontend navigation bar.
    Returns notifications and total unread count for badge indicators.
    """
    base_query = db.query(Notification).filter(Notification.user_id == current_user.id)

    unread_count = base_query.filter(Notification.is_read == False).count()

    query = base_query
    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()

    items = [
        NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            link_url=n.link_url,
            is_read=n.is_read,
            created_at=n.created_at,
        )
        for n in notifications
    ]

    return NotificationListResponse(items=items, unread_count=unread_count)


@router.patch(
    "/{id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read",
)
def mark_notification_as_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    """Mark a specific notification as read. Enforces user ownership."""
    notification = db.query(Notification).filter(Notification.id == id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification #{id} not found.",
        )

    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only update your own notifications.",
        )

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        title=notification.title,
        message=notification.message,
        notification_type=notification.notification_type,
        link_url=notification.link_url,
        is_read=notification.is_read,
        created_at=notification.created_at,
    )


@router.post(
    "/read-all",
    summary="Mark all user's notifications as read",
)
@router.patch(
    "/read-all",
    summary="Mark all user's notifications as read (PATCH alias)",
)
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Bulk mark all unread notifications for the user as read."""
    unread_notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .all()
    )
    count = len(unread_notifications)

    for n in unread_notifications:
        n.is_read = True

    db.commit()
    return {"message": "All notifications marked as read.", "count": count}
