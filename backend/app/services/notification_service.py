
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.alert_rule import AlertRule
from app.models.notification import Notification
from app.models.user import User
from app.services.email_service import send_email


def create_in_app_notifications_for_alert(
    db: Session,
    alert: Alert,
) -> list[Notification]:
    """Create in-app notifications for active organization users."""

    rule = (
        db.query(AlertRule)
        .filter(AlertRule.id == alert.alert_rule_id)
        .first()
    )

    if rule is None:
        return []

    preferences = rule.notification_preferences or {}

    if not preferences.get("in_app", True):
        return []

    users = (
        db.query(User)
        .filter(
            User.organization_id == rule.organization_id,
            User.is_active.is_(True),
        )
        .all()
    )

    created_notifications = []

    for user in users:
        existing = (
            db.query(Notification)
            .filter(
                Notification.alert_id == alert.id,
                Notification.recipient_user_id == user.id,
                Notification.notification_type == "in_app",
            )
            .first()
        )

        if existing:
            continue

        notification = Notification(
            alert_id=alert.id,
            recipient_user_id=user.id,
            notification_type="in_app",
            is_read=False,
            delivery_status="pending",
            created_at=datetime.utcnow(),
        )

        db.add(notification)
        created_notifications.append(notification)

    if created_notifications:
        db.flush()

    return created_notifications


async def send_email_notifications_for_alert(
    db: Session,
    alert: Alert,
) -> int:
    """Send email notifications to active users when enabled."""

    rule = (
        db.query(AlertRule)
        .filter(AlertRule.id == alert.alert_rule_id)
        .first()
    )

    if rule is None:
        return 0

    preferences = rule.notification_preferences or {}

    if not preferences.get("email", False):
        return 0

    users = (
        db.query(User)
        .filter(
            User.organization_id == rule.organization_id,
            User.is_active.is_(True),
        )
        .all()
    )

    sent_count = 0

    for user in users:
        if not user.email:
            continue

        existing = (
            db.query(Notification)
            .filter(
                Notification.alert_id == alert.id,
                Notification.recipient_user_id == user.id,
                Notification.notification_type == "email",
            )
            .first()
        )

        if existing and existing.delivery_status == "sent":
            continue

        if existing is None:
            notification = Notification(
                alert_id=alert.id,
                recipient_user_id=user.id,
                notification_type="email",
                is_read=True,
                delivery_status="pending",
                created_at=datetime.utcnow(),
            )
            db.add(notification)
            db.flush()
        else:
            notification = existing

        try:
            success = await send_email(
                recipient=user.email,
                subject=f"[DataPulse Alert] {alert.title}",
                body=(
                    f"Hello {user.name},\n\n"
                    f"A new alert has been generated.\n\n"
                    f"Alert: {alert.title}\n"
                    f"Description: {alert.description or 'N/A'}\n"
                    f"Severity: {alert.severity}\n"
                    f"Status: {alert.status}\n\n"
                    "Please review this alert in DataPulse Enterprise."
                ),
            )

            notification.delivery_status = (
                "sent" if success else "failed"
            )

            if success:
                sent_count += 1

        except Exception:
            notification.delivery_status = "failed"

    db.flush()
    return sent_count


def mark_notification_as_read(
    db: Session,
    notification: Notification,
) -> Notification:
    """Mark a notification as read."""

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.flush()

    return notification


def mark_all_notifications_as_read(
    db: Session,
    recipient_user_id: int,
) -> int:
    """Mark all unread notifications of a user as read."""

    notifications = (
        db.query(Notification)
        .filter(
            Notification.recipient_user_id == recipient_user_id,
            Notification.is_read.is_(False),
            Notification.notification_type == "in_app",
        )
        .all()
    )

    current_time = datetime.utcnow()

    for notification in notifications:
        notification.is_read = True
        notification.read_at = current_time

    if notifications:
        db.flush()

    return len(notifications)
