
from datetime import datetime

from sqlalchemy import (
    String,
    Integer,
    ForeignKey,
    DateTime,
    Text,
    Boolean,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class ErrorRecord(Base):
    __tablename__ = "error_records"

    __table_args__ = (
        Index("ix_error_records_run_timestamp", "run_id", "timestamp"),
        Index("ix_error_records_category", "category"),
        Index("ix_error_records_severity", "severity"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    run_id: Mapped[int] = mapped_column(
        ForeignKey("processing_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    execution_log_id: Mapped[int | None] = mapped_column(
        ForeignKey("execution_logs.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="MEDIUM",
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    stage: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    is_resolved: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    execution_log = relationship(
        "ExecutionLog",
        back_populates="error",
    )

    processing_run = relationship(
        "ProcessingRun",
        back_populates="error_records",
    )
