"""Add next_course_requirements to examinations

Revision ID: 846de6e60f33
Revises: 8aaff62a30d0
Create Date: 2025-05-31 23:30:40.490039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '846de6e60f33'
down_revision: Union[str, None] = '8aaff62a30d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('examinations', sa.Column('next_course_requirements', sa.JSON, nullable=True))


def downgrade() -> None:
    op.drop_column('examinations', 'next_course_requirements')
