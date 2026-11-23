
from math import ceil
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.notification import Notification


router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notifications"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_notification_or_404(
    db: Session,
    notification_id: int,
    recipient_user_id: int,
) -> Notification:

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.recipient_user_id == recipient_user_id,
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    return notification


@router.get("")
def get_notifications(
    recipient_user_id: int = Query(..., gt=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    is_read: bool | None = Query(default=None),
    notification_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Get paginated notifications for a recipient.
    Supports read/unread and notification type filters.
    """

    query = db.query(Notification).filter(
        Notification.recipient_user_id == recipient_user_id
    )

    if is_read is not None:
        query = query.filter(
            Notification.is_read == is_read
        )

    if notification_type:
        query = query.filter(
            Notification.notification_type == notification_type
        )

    total = query.count()

    total_pages = (
        ceil(total / page_size)
        if total
        else 0
    )

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    unread_count = (
        db.query(Notification)
        .filter(
            Notification.recipient_user_id == recipient_user_id,
            Notification.is_read.is_(False),
        )
        .count()
    )

    return {
        "items": notifications,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "unread_count": unread_count,
    }


@router.get("/unread-count")
def get_unread_notification_count(
    recipient_user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
):
    """
    Get unread notification count for a recipient.
    """

    count = (
        db.query(Notification)
        .filter(
            Notification.recipient_user_id == recipient_user_id,
            Notification.is_read.is_(False),
        )
        .count()
    )

    return {
        "recipient_user_id": recipient_user_id,
        "unread_count": count,
    }


@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    recipient_user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
):
    """
    Mark one notification as read.
    """

    notification = get_notification_or_404(
        db,
        notification_id,
        recipient_user_id,
    )

    if notification.is_read:
        return {
            "message": "Notification is already read.",
            "notification_id": notification.id,
            "is_read": True,
            "read_at": notification.read_at,
        }

    notification.is_read = True
    notification.read_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(notification)

        return {
            "message": "Notification marked as read.",
            "notification_id": notification.id,
            "is_read": notification.is_read,
            "read_at": notification.read_at,
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while updating notification.",
        )


@router.patch("/read-all")
def mark_all_notifications_as_read(
    recipient_user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
):
    """
    Mark all unread notifications of a recipient as read.
    """

    current_time = datetime.utcnow()

    try:
        updated_count = (
            db.query(Notification)
            .filter(
                Notification.recipient_user_id == recipient_user_id,
                Notification.is_read.is_(False),
            )
            .update(
                {
                    Notification.is_read: True,
                    Notification.read_at: current_time,
                },
                synchronize_session=False,
            )
        )

        db.commit()

        return {
            "message": "All notifications marked as read.",
            "recipient_user_id": recipient_user_id,
            "updated_count": updated_count,
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while updating notifications.",
        )
