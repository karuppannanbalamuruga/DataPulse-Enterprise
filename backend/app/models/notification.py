
from datetime import datetime

from sqlalchemy import (
    String,
    ForeignKey,
    DateTime,
    Boolean,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        UniqueConstraint(
            "alert_id",
            "recipient_user_id",
            "notification_type",
            name="uq_notification_alert_user_type",
        ),
        Index(
            "ix_notifications_user_read",
            "recipient_user_id",
            "is_read",
        ),
        Index(
            "ix_notifications_alert_user",
            "alert_id",
            "recipient_user_id",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    alert_id: Mapped[int] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recipient_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    notification_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="in_app",
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    delivery_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    alert = relationship(
        "Alert",
        back_populates="notifications",
    )

    recipient = relationship("User")
