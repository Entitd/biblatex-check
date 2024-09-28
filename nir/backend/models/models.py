from datetime import datetime
from sqlalchemy import MetaData, Table, Column, Integer, String, TIMESTAMP, ForeignKey, func

metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("id_user", Integer, primary_key=True),
    Column("email", String, nullable=False),
    Column("username", String, nullable=False),
    Column("password", String, nullable=False),
    Column("register_at", TIMESTAMP, server_default=func.now()),  # Устанавливает текущее время
)

examinations = Table(
    "examinations",
    metadata,
    Column("id_examination", Integer, primary_key=True),
    Column("id_user", Integer, ForeignKey("users.id_user"), index=True),  # Добавлен индекс
    Column("name_file", String, nullable=False),
    Column("loading_at", TIMESTAMP, server_default=func.now()),  # Устанавливает текущее время
    Column("number_of_errors", Integer, nullable=False),
    Column("course_compliance", Integer, nullable=False),
    Column("download_link_source", String, nullable=False),
    Column("download_link_edited", String, nullable=False)
)
