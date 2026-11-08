from typing import Optional
from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    link_url: Optional[str] = None,
) -> Notification:
    """
    Persist an in-app database notification for a user.
    Used by booking lifecycle events, review triggers, and status updates.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        link_url=link_url,
        is_read=False,
    )
    db.add(notification)
    return notification
