from sqlalchemy import insert
from sqlalchemy.orm import Session
from datetime import datetime
from .models.models import User, Examination

# Функция для добавления нового пользователя
def create_user(db: Session, email: str, username: str, password: str):
    new_user = {
        "email": email,
        "username": username,
        "password": password,
    }
    db.execute(insert(User).values(new_user))
    db.commit()

    return new_user

def create_examination(db: Session, user_id: int, name_file: str, number_of_errors: int, 
                       course_compliance: int, download_link_source: str, download_link_edited: str):
    new_examination = {
        "loading_at": datetime.now(),  # Используем текущее время
        "id_user": user_id,
        "name_file": name_file,
        "number_of_errors": number_of_errors,
        "course_compliance": course_compliance,
        "download_link_source": download_link_source,
        "download_link_edited": download_link_edited
    }
    db.execute(insert(Examination).values(new_examination))
    db.commit()

    return new_examination
