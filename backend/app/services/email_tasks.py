
from app.db.database import SessionLocal
from app.services.notification_service import (
    send_email_notifications_for_alert,
)


async def send_alert_emails_in_background(alert_id: int):
    """
    Create an independent database session and send
    email notifications for the specified alert.
    """

    db = SessionLocal()

    try:
        from app.models.alert import Alert

        alert = (
            db.query(Alert)
            .filter(Alert.id == alert_id)
            .first()
        )

        if alert is None:
            print(f"Alert {alert_id} not found for email delivery.")
            return

        await send_email_notifications_for_alert(
            db=db,
            alert=alert,
        )

        db.commit()

    except Exception as exc:
        db.rollback()
        print(
            f"Background email delivery failed "
            f"for alert {alert_id}: {exc}"
        )

    finally:
        db.close()
