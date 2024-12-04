from datetime import datetime
from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel

from sqlalchemy import MetaData

metadata = MetaData()


Base = declarative_base()  # Создаем базовый класс для моделей

class UserCreate(BaseModel):
    username: str
    password: str  # Добавьте другие необходимые поля

class User(Base):
    __tablename__ = 'users'  # Указываем имя таблицы

    id_user = Column(Integer, primary_key=True)  # Поле для идентификатора пользователя
    email = Column(String, nullable=False)  # Поле для email
    username = Column(String, nullable=False)  # Поле для имени пользователя
    password = Column(String, nullable=False)  # Поле для пароля

class Examination(Base):
    __tablename__ = 'examinations'  # Указываем имя таблицы

    id_examination = Column(Integer, primary_key=True)
    id_user = Column(Integer)
    name_file = Column(String)
    loading_at = Column(TIMESTAMP, server_default=func.now())  # Исправлено: TIMESTAMP вместо String
    number_of_errors = Column(Integer)
    course_compliance = Column(Integer)  # Исправлено на Integer
    download_link_source = Column(String)
    download_link_edited = Column(String)
    errors = Column(String)  # Добавляем новый столбец
