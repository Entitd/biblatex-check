from sqlalchemy import select
from sqlalchemy.orm import Session
from models.models import Examination
from datetime import datetime
from pathlib import Path
from bibtex_validator import validate_bibtex_file
import logging

logger = logging.getLogger(__name__)

def get_user_examinations(db: Session, user_id: int):
    stmt = select(Examination).where(Examination.id_user == user_id)
    result = db.execute(stmt).scalars().all()
    examinations = []
    for exam in result:
        # Revalidate file content to get next_course_requirements
        file_path = Path(exam.download_link_edited or exam.download_link_source)
        validation_result = {"errors": [], "course_compliance": exam.course_compliance, "next_course_requirements": {}}
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                validation_result = validate_bibtex_file(content)
            except Exception as e:
                logger.error(f"Error validating file {file_path}: {str(e)}")
        
        examinations.append({
            "id_examination": exam.id_examination,
            "id_user": exam.id_user,
            "name_file": exam.name_file,
            "loading_at": exam.loading_at.isoformat() if isinstance(exam.loading_at, datetime) else exam.loading_at,
            "number_of_errors": exam.number_of_errors,
            "course_compliance": str(exam.course_compliance),
            "download_link_source": exam.download_link_source,
            "download_link_edited": exam.download_link_edited,
            "errors": exam.errors,
            "next_course_requirements": validation_result["next_course_requirements"]
        })
    return examinations