
"""add notification unique constraint

Revision ID: eb288c4d8cde
Revises: a695e035631b
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "eb288c4d8cde"
down_revision: Union[str, Sequence[str], None] = "a695e035631b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add unique constraint to prevent duplicate notifications."""

    op.create_unique_constraint(
        "uq_notification_alert_user_type",
        "notifications",
        [
            "alert_id",
            "recipient_user_id",
            "notification_type",
        ],
    )


def downgrade() -> None:
    """Remove notification unique constraint."""

    op.drop_constraint(
        "uq_notification_alert_user_type",
        "notifications",
        type_="unique",
    )
