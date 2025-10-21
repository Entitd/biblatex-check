"""писание изменений

Revision ID: 8aaff62a30d0
Revises: 222d0d07d0ab
Create Date: 2025-04-08 19:45:14.438262

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector # <-- Убедитесь, что этот импорт есть

# ... (revision, down_revision, etc.)
revision: str = '8aaff62a30d0'
down_revision: Union[str, None] = '222d0d07d0ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # ===== ЭТО ДОЛЖНО БЫТЬ САМЫМ ПЕРВЫМ =====
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    # 1. ПРОВЕРКА И СОЗДАНИЕ ТАБЛИЦЫ 'blacklisted_tokens'
    if 'blacklisted_tokens' not in inspector.get_table_names():
        op.create_table('blacklisted_tokens',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('token', sa.String(), nullable=False, unique=True),
            sa.Column('blacklisted_on', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id') 
        )
        print("INFO: Таблица 'blacklisted_tokens' была создана, так как она отсутствовала.")
    # ========================================

    # 2. ИЗМЕНЕНИЕ КОЛОНОК (Alter Columns)
    # Теперь, когда мы уверены, что таблица существует, мы можем ее изменить.
    
    # Изменение колонки 'id' (Установка nullable=False)
    # Этот блок op.alter_column должен быть здесь!
    op.alter_column('blacklisted_tokens', 'id',
               existing_type=sa.INTEGER(),
               nullable=False,
               autoincrement=True)
    
    # Изменение колонки 'blacklisted_on' (Смена типа)
    op.alter_column('blacklisted_tokens', 'blacklisted_on',
            existing_type=sa.VARCHAR(),
            type_=sa.DateTime(),
            existing_nullable=True,
            postgresql_using='blacklisted_on::timestamp')

    # 3. СОЗДАНИЕ ИНДЕКСОВ
    # Если вы создали таблицу на Шаге 1, индексы, скорее всего, также нужно создать.
    # Этот код теперь безопасен, так как таблица гарантированно существует.
    indexes = inspector.get_indexes('blacklisted_tokens')
    if not any(idx['name'] == 'ix_blacklisted_tokens_id' for idx in indexes):
        op.create_index(op.f('ix_blacklisted_tokens_id'), 'blacklisted_tokens', ['id'], unique=False)
    if not any(idx['name'] == 'ix_blacklisted_tokens_token' for idx in indexes):
        op.create_index(op.f('ix_blacklisted_tokens_token'), 'blacklisted_tokens', ['token'], unique=True)

        
    # 4. Остальные изменения в других таблицах (examinations, users)
    op.alter_column('examinations', 'loading_at',
           existing_type=sa.VARCHAR(),
           type_=sa.DateTime(),
           existing_nullable=True,
           postgresql_using='loading_at::timestamp')
    # Для course_compliance
    op.alter_column('examinations', 'course_compliance',
            existing_type=sa.VARCHAR(),
            type_=sa.Integer(),
            existing_nullable=True,
            postgresql_using='course_compliance::integer')
    # Для last_active


    # Продолжаем использовать bind и inspector, определенные ранее в upgrade()
    columns = inspector.get_columns('examinations')
    column_names = [col['name'] for col in columns]

    if 'session_id' not in column_names:
        op.add_column('examinations', sa.Column('session_id', sa.String(), nullable=True))
        print("INFO: Колонка 'session_id' была добавлена в examinations, так как отсутствовала.")
        
    # 💥 Добавление колонки 'last_active', если она отсутствует
    if 'last_active' not in column_names:
        # Важно: создаем колонку с типом sa.String(), чтобы ее можно было преобразовать
        op.add_column('examinations', sa.Column('last_active', sa.VARCHAR(), nullable=True))
        print("INFO: Колонка 'last_active' была добавлена в examinations, так как отсутствовала.")

    # Теперь можно безопасно менять тип колонки (Ваш исходный код)
    op.alter_column('examinations', 'last_active',
            existing_type=sa.VARCHAR(),
            type_=sa.DateTime(),
            existing_nullable=True,
            postgresql_using='last_active::timestamp')

    # ... и далее следуют остальные alter_column и create_index для других колонок
    
    indexes = inspector.get_indexes('examinations')
    if not any(idx['name'] == 'ix_examinations_id_examination' for idx in indexes):
        op.create_index(op.f('ix_examinations_id_examination'), 'examinations', ['id_examination'], unique=False)
    if not any(idx['name'] == 'ix_examinations_last_active' for idx in indexes):
        op.create_index(op.f('ix_examinations_last_active'), 'examinations', ['last_active'], unique=False)
    
    op.alter_column('users', 'email',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('users', 'username',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    indexes = inspector.get_indexes('users')
    if not any(idx['name'] == 'ix_users_email' for idx in indexes):
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    if not any(idx['name'] == 'ix_users_id_user' for idx in indexes):
        op.create_index(op.f('ix_users_id_user'), 'users', ['id_user'], unique=False)
    if not any(idx['name'] == 'ix_users_username' for idx in indexes):
        op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    
    op.drop_column('users', 'register_at')

def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('register_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True))
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id_user'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.alter_column('users', 'username',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('users', 'email',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.drop_index(op.f('ix_examinations_last_active'), table_name='examinations')
    op.drop_index(op.f('ix_examinations_id_examination'), table_name='examinations')
    op.alter_column('examinations', 'last_active',
               existing_type=sa.DateTime(),
               type_=sa.VARCHAR(),
               existing_nullable=True)
    op.alter_column('examinations', 'course_compliance',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(),
               existing_nullable=True)
    op.alter_column('examinations', 'loading_at',
               existing_type=sa.DateTime(),
               type_=sa.VARCHAR(),
               existing_nullable=True)


    op.drop_index(op.f('ix_blacklisted_tokens_token'), table_name='blacklisted_tokens')
    op.drop_index(op.f('ix_blacklisted_tokens_id'), table_name='blacklisted_tokens')
    op.alter_column('blacklisted_tokens', 'blacklisted_on',
               existing_type=sa.DateTime(),
               type_=sa.VARCHAR(),
               existing_nullable=True)
    op.alter_column('blacklisted_tokens', 'id',
               existing_type=sa.INTEGER(),
               nullable=True,
               autoincrement=True)
    # ### end Alembic commands ###
