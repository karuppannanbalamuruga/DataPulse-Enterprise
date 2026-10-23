
from datetime import datetime

from sqlalchemy import (
    String,
    ForeignKey,
    DateTime,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "name",
            name="uq_datasets_organization_name",
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

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="file",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
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
        back_populates="datasets",
    )

    validation_rules = relationship(
        "ValidationRule",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )

    processing_runs = relationship(
        "ProcessingRun",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )
