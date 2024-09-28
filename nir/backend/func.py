from sqlalchemy import insert
from sqlalchemy.orm import Session
from datetime import datetime

# Импортируйте ваши таблицы
from .models.models import users, examinations  # Убедитесь, что путь к моделям правильный

# Функция для добавления нового пользователя
from sqlalchemy import insert
from sqlalchemy.orm import Session

def create_user(db: Session, email: str, username: str, password: str):
    new_user = {
        "email": email,
        "username": username,
        "password": password,
    }
    db.execute(insert(users).values(new_user))
    db.commit()

    # db.refresh(new_user)

    return new_user

# Функция для добавления нового проверенного файла
def create_examination(db: Session, loading_at: str, user_id: int, name_file: str, number_of_errors: int, 
                       course_compliance: int, download_link_source: str, download_link_edited: str):
    new_examination = {
        "loading_at": loading_at,
        "id_user": user_id,
        "name_file": name_file,
        "number_of_errors": number_of_errors,
        "course_compliance": course_compliance,
        "download_link_source": download_link_source,
        "download_link_edited": download_link_edited
    }
    db.execute(insert(examinations).values(new_examination))
    db.commit()

    # db.refresh(new_examination)  # Обновляем объект для получения данных

    return new_examination