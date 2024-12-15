from datetime import datetime
from sqlalchemy.orm import Session
import bibtexparser
from bibtexparser.bparser import BibTexParser
from models.models import Examination
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

requiredEntryFields = {
    "article": ["author", "title", "journal", "year", "volume", "number", "pages"],
    "book": ["author", "title", "year", "address", "publisher", "pages"],
    "mvbook": "book",
    "inbook": ["author", "title", "booktitle", "year"],
    "bookinbook": "inbook",
    "suppbook": "inbook",
    "booklet": ["author", "title", "year"],
    "collection": ["editor", "title", "year"],
    "mvcollection": "collection",
    "incollection": ["author", "title", "booktitle", "year"],
    "suppcollection": "incollection",
    "manual": ["organization", "title", "year"],
    "misc": ["author", "title", "urldate", "url"],#это online просто библиотека bibtexrasper не поддерживает online
    "online": ["author", "title", "urldate", "url"],
    "patent": ["author", "title", "number", "year"],
    "periodical": ["editor", "title", "year"],
    "suppperiodical": "article",
    "proceedings": ["title", "year"],
    "mvproceedings": "proceedings",
    "inproceedings": ["author", "title", "booktitle", "year", "pages", "organization"],
    "reference": "collection",
    "mvreference": "collection",
    "inreference": "incollection",
    "report": ["author", "title", "type", "institution", "year"],
    "thesis": ["author", "title", "type", "institution", "year"],
    "unpublished": ["author", "title", "year"],
    # semi aliases (differing fields)
    "mastersthesis": ["author", "title", "institution", "year"],
    "techreport": ["author", "title", "institution", "year"],
    # other aliases
    "conference": "inproceedings",
    "electronic": "online",
    "phdthesis": "mastersthesis",
    "www": "online",
    "school": "mastersthesis",
}

def get_required_fields(entry_type):
    if entry_type in requiredEntryFields:
        fields = requiredEntryFields[entry_type]
        if isinstance(fields, str):
            return get_required_fields(fields)
        return fields
    return []

def get_square_color(total_count, foreign_language_count, articles_after_2010_count, literature_21_century_count):
    if (
        total_count > 30 and foreign_language_count > 6 and articles_after_2010_count > 6 and literature_21_century_count > 20
    ):
        return '5'
    if (
        total_count > 25 and foreign_language_count > 5 and articles_after_2010_count > 6 and literature_21_century_count > 20
    ):
        return '4'
    if (
        total_count > 20 and foreign_language_count > 4 and articles_after_2010_count > 4 and literature_21_century_count > 14
    ):
        return '3'
    if (
        total_count > 15 and foreign_language_count > 3 and articles_after_2010_count > 2 and literature_21_century_count > 9
    ):
        return '2'
    else:
        return '0'

def validate_bibtex_file(file_contents: str, session: Session, user_id: int, file_name: str):
    file_contents = file_contents.replace('@online', '@misc')
    parser = BibTexParser()

    # Разбиваем содержимое файла на строки
    file_lines = file_contents.splitlines()

    logger.info(f"File contents: {file_contents}")

    try:
        bib_data = parser.parse(file_contents)
    except Exception as e:
        logger.error(f"Parser error: {e}")
        return []

    logger.info(f"Parsed entries: {bib_data.entries}")

    errors = []
    entry_line_mapping = {}  # Карта соответствия записей и строк

    # Определяем строки, где начинаются записи BibTeX
    for i, line in enumerate(file_lines):
        if line.strip().startswith("%"):
            continue  # Пропускаем строки, содержащие символ %
        if line.strip().startswith("@"):  # Начало записи (например, @article)
            entry_line_mapping[len(entry_line_mapping)] = i + 1  # Номер строки с 1

    logger.info(f"Entry line mapping: {entry_line_mapping}")

    total_count = 0
    foreign_language_count = 0
    articles_after_2010_count = 0
    literature_21_century_count = 0

    for index, entry in enumerate(bib_data.entries):
        entry_type = entry.get('ENTRYTYPE', '').lower()
        required_fields = get_required_fields(entry_type)

        logger.debug(f"Processing entry: {entry}")
        logger.debug(f"Entry type: {entry_type}")
        logger.debug(f"Required fields: {required_fields}")
        logger.debug(f"Entry fields: {entry.keys()}")

        missing_fields = [field for field in required_fields if field not in entry]
        logger.debug(f"Missing fields for {entry_type}: {missing_fields}")

        if missing_fields:
            line_number = entry_line_mapping.get(index, "Неизвестно")
            error_message = (
                f"Отсутствуют обязательные поля {', '.join(missing_fields)} в записи типа '{entry_type}' "
                f"(строка {line_number})"
            )
            errors.append(error_message)
            logger.debug(f"Added error: {error_message}")

        # Подсчет записей
        total_count += 1
        year = entry.get('year', '')
        language = entry.get('hyphenation', '')

        if year.isdigit():
            year = int(year)
            if year > 2010:
                articles_after_2010_count += 1
            if year >= 2000:
                literature_21_century_count += 1

        if language and language.lower() != 'russian':
            foreign_language_count += 1

        logger.debug(f"Current errors: {errors}")

    logger.info(f"Errors before saving: {errors}")

    # Вывод данных в консоль
    logger.info(f"Total count: {total_count}")
    logger.info(f"Foreign language count: {foreign_language_count}")
    logger.info(f"Articles after 2010 count: {articles_after_2010_count}")
    logger.info(f"Literature 21st century count: {literature_21_century_count}")

    course_compliance = get_square_color(total_count, foreign_language_count, articles_after_2010_count, literature_21_century_count)

    loading_at = datetime.now()
    new_exam = Examination(
        id_user=user_id,
        name_file=file_name,
        loading_at=loading_at,
        number_of_errors=len(errors),
        course_compliance=course_compliance,
        download_link_source="ссылка_на_исходный_файл",
        download_link_edited="ссылка_на_отредактированный_файл",
        errors="\n".join(errors) if errors else "Нет ошибок"
    )
    logger.info(f"Errors after creating Examination object: {new_exam.errors}")

    try:
        session.add(new_exam)
        session.commit()
        logger.info(f"Examination object saved successfully with errors: {new_exam.errors}")

        saved_exam = session.query(Examination).filter_by(id_user=user_id, name_file=file_name).first()
        logger.info(f"Errors after querying from database: {saved_exam.errors}")
    except Exception as e:
        session.rollback()
        raise e

    return errors
