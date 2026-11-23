
from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings


async def send_email(
    recipient: str,
    subject: str,
    body: str,
) -> bool:
    """
    Send an email notification using the configured SMTP server.
    """

    if not settings.EMAIL_NOTIFICATIONS_ENABLED:
        print("Email notifications are disabled.")
        return False

    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        print("SMTP credentials are not configured.")
        return False

    message = EmailMessage()
    message["From"] = (
        f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    )
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=settings.SMTP_USE_TLS,
        )

        print(f"Email sent successfully to {recipient}")
        return True

    except Exception as exc:
        print(f"Email delivery failed: {exc}")
        return False
