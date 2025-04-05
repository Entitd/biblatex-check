from sqlalchemy import select
from sqlalchemy.orm import Session
from models.models import Examination  # Убедитесь, что импортируете ваши модели
from datetime import datetime  # Импортируем datetime для конвертации

def get_user_examinations(db: Session, user_id: int):
    stmt = select(Examination).where(Examination.id_user == user_id)
    result = db.execute(stmt).scalars().all()  # Получаем только объекты Examination
    # Преобразуем результат в нужный формат
    return [
        {
            "id_examination": exam.id_examination,
            "id_user": exam.id_user,
            "name_file": exam.name_file,
            "loading_at": exam.loading_at.isoformat() if isinstance(exam.loading_at, datetime) else exam.loading_at,
            "number_of_errors": exam.number_of_errors,
            "course_compliance": exam.course_compliance,
            "download_link_source": exam.download_link_source,
            "download_link_edited": exam.download_link_edited,
        }
        for exam in result
    ]
