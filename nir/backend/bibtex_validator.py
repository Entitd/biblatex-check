# import bibtexparser
# from bibtexparser.bparser import BibTexParser

# def validate_bibtex_file(file_contents):
#     parser = BibTexParser()
#     bib_data = parser.parse(file_contents)
#     errors = []

#     for entry in bib_data.entries:
#         required_fields = ['author', 'title', 'year']
#         for field in required_fields:
#             if field not in entry:
#                 errors.append(f"Запись {entry['ID']} не содержит обязательное поле: {field}")

#         if 'year' in entry and not entry['year'].isdigit():
#             errors.append(f"Запись {entry['ID']} содержит неверный год: {entry['year']}")

#     return errors

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


import bibtexparser
from bibtexparser.bparser import BibTexParser


# Импортируем модели из твоей базы данных
from models.models import User, Examination  # Убедись, что пути к моделям правильные

def validate_bibtex_file(file_contents, session: Session, user_id: int):
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
    new_exam = Examination(
        id_user=user_id,  # Используем id пользователя из сессии
        name_file="имя_вашего_файла.bib",  # Укажите имя файла
        loading_at=loading_at,
        number_of_errors=len(errors),
        course_compliance=123,  # Статичное значение для курса
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