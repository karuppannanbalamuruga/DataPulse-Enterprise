
"""add dataset upload metadata

Revision ID: a695e035631b
Revises: 0c67c47ff95f
Create Date: 2026-11-03 18:23:11.980096

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a695e035631b"
down_revision: Union[str, Sequence[str], None] = "0c67c47ff95f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "datasets",
        sa.Column("uploaded_file_path", sa.String(length=500), nullable=True),
    )

    op.add_column(
        "datasets",
        sa.Column("uploaded_filename", sa.String(length=255), nullable=True),
    )

    op.add_column(
        "datasets",
        sa.Column("uploaded_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("datasets", "uploaded_at")
    op.drop_column("datasets", "uploaded_filename")
    op.drop_column("datasets", "uploaded_file_path")
