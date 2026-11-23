
from datetime import datetime

from sqlalchemy import (
    String,
    ForeignKey,
    DateTime,
    Text,
    JSON,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

json_type = JSON().with_variant(JSONB, "postgresql")


class Alert(Base):
    __tablename__ = "alerts"

    __table_args__ = (
        UniqueConstraint("event_key", name="uq_alerts_event_key"),
        Index("ix_alerts_dataset_status", "dataset_id", "status"),
        Index("ix_alerts_severity_triggered", "severity", "triggered_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    alert_rule_id: Mapped[int] = mapped_column(
        ForeignKey("alert_rules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    dataset_id: Mapped[int] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    processing_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("processing_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    event_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="warning",
    )

    observed_value: Mapped[dict] = mapped_column(
        json_type,
        nullable=False,
        default=dict,
    )

    configured_threshold: Mapped[dict] = mapped_column(
        json_type,
        nullable=False,
        default=dict,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="open",
        index=True,
    )

    triggered_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    alert_rule = relationship("AlertRule", back_populates="alerts")
    dataset = relationship("Dataset")
    processing_run = relationship("ProcessingRun")

    notifications = relationship(
        "Notification",
        back_populates="alert",
        cascade="all, delete-orphan",
    )
