from datetime import datetime
from sqlalchemy.orm import Session
import bibtexparser
from bibtexparser.bparser import BibTexParser
from models.models import Examination  # Убедитесь, что пути к моделям правильные

def validate_bibtex_file(file_contents: str, session: Session, user_id: int, file_name: str):
    parser = BibTexParser()
    bib_data = parser.parse(file_contents)
    errors = []

    for entry in bib_data.entries:
        required_fields = ['author', 'title', 'year']
        for field in required_fields:
            if field not in entry:
                errors.append(f"Запись {entry['ID']} не содержит обязательное поле: {field}")

        if 'year' in entry and not entry['year'].isdigit():
            errors.append(f"Запись {entry['ID']} содержит неверный год: {entry['year']}")

    # Запись в базу данных
    loading_at = datetime.now()  # Получаем текущее время загрузки
    course_compliance = 123  # Установите соответствующее значение для курса
    new_exam = Examination(
        id_user=user_id,  # Используем id пользователя из сессии
        name_file=file_name,  # Укажите имя файла
        loading_at=loading_at,
        number_of_errors=len(errors),
        course_compliance=course_compliance,
        download_link_source="ссылка_на_исходный_файл",  # Укажите исходную ссылку
        download_link_edited="ссылка_на_отредактированный_файл",  # Укажите ссылку на отредактированный файл
        errors="\n".join(errors) if errors else "Нет ошибок"  # Преобразуем ошибки в строку
    )

    try:
        session.add(new_exam)
        session.commit()  # Сохраняем изменения в базе данных
    except Exception as e:
        session.rollback()  # Откатываем изменения в случае ошибки
        raise e  # Обработка ошибок при добавлении записи в базу данных

    return errors
