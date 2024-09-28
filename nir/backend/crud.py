from sqlalchemy import select
from sqlalchemy.orm import Session
from models.models import examinations  # Убедитесь, что импортируете ваши модели

def get_user_examinations(db: Session, user_id: int):
    stmt = select(examinations).where(examinations.c.id_user == user_id)
    result = db.execute(stmt).fetchall()
    # Преобразуем результат в нужный формат
    return [
        {
            "id": exam.id_examination,
            "user_id": exam.id_user,
            "name_file": exam.name_file,
            "loading_at": exam.loading_at,
            "number_of_errors": exam.number_of_errors,
            "course_compliance": exam.course_compliance,
            "download_link_source": exam.download_link_source,
            "download_link_edited": exam.download_link_edited,
        }
        for exam in result
    ]