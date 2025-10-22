"""Add hashed_password column

Revision ID: 483921e98e7a
Revises: 846de6e60f33
Create Date: 2025-10-22 07:16:38.296319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '483921e98e7a'
down_revision: Union[str, None] = '846de6e60f33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
