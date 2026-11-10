
from datetime import datetime

from sqlalchemy import (
    String,
    Integer,
    ForeignKey,
    DateTime,
    Text,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    __table_args__ = (
        Index("ix_execution_logs_run_timestamp", "run_id", "timestamp"),
        Index("ix_execution_logs_level", "level"),
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

    dataset_id: Mapped[int] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="INFO",
    )

    stage: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    error = relationship(
        "ErrorRecord",
        back_populates="execution_log",
        uselist=False,
        cascade="all, delete-orphan",
    )

    processing_run = relationship(
        "ProcessingRun",
        back_populates="execution_logs",
    )
    dataset = relationship("Dataset")
