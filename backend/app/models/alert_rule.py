
from datetime import datetime

from sqlalchemy import (
    String,
    ForeignKey,
    DateTime,
    Boolean,
    JSON,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


json_type = JSON().with_variant(JSONB, "postgresql")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    __table_args__ = (
        Index(
            "ix_alert_rules_org_enabled",
            "organization_id",
            "is_enabled",
        ),
        Index(
            "ix_alert_rules_dataset_condition",
            "dataset_id",
            "condition_type",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    dataset_id: Mapped[int | None] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    condition_type: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        index=True,
    )

    configuration: Mapped[dict] = mapped_column(
        json_type,
        nullable=False,
        default=dict,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="warning",
    )

    notification_preferences: Mapped[dict] = mapped_column(
        json_type,
        nullable=False,
        default=dict,
    )

    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    organization = relationship(
        "Organization",
        back_populates="alert_rules",
    )

    dataset = relationship(
        "Dataset",
    )

    alerts = relationship(
        "Alert",
        back_populates="alert_rule",
        cascade="all, delete-orphan",
    )
