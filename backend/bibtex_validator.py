from datetime import datetime
from sqlalchemy.orm import Session
import bibtexparser
from bibtexparser.bparser import BibTexParser
from models.models import Examination
import logging
import re
from pathlib import Path

logging.basicConfig(level=logging.DEBUG)  # Устанавливаем DEBUG для диагностики
logger = logging.getLogger(__name__)

# Словарь обязательных полей для каждого типа записи
requiredEntryFields = {
    "article": ["author", "title", "journal", "year", "pages"],
    "book": ["author", "title", "year", "address", "publisher", "pagetotal"],
    "manual": ["organization", "title", "year"],
    "misc": ["author", "title", "urldate", "url"],
    "online": ["author", "title", "urldate", "url"],
    "mvbook": "book",
    "inbook": ["author", "title", "booktitle", "year"],
    "bookinbook": "inbook",
    "suppbook": "inbook",
    "booklet": ["author", "title", "year"],
    "collection": ["editor", "title", "year"],
    "mvcollection": "collection",
    "incollection": ["author", "title", "booktitle", "year"],
    "suppcollection": "incollection",
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
    "mastersthesis": ["author", "title", "institution", "year"],
    "techreport": ["author", "title", "institution", "year"],
    "conference": "inproceedings",
    "electronic": "online",
    "phdthesis": "mastersthesis",
    "www": "online",
    "school": "mastersthesis",
}

# Возвращает список обязательных полей для переданного типа
def get_required_fields(entry_type):
    if entry_type in requiredEntryFields:
        fields = requiredEntryFields[entry_type]
        if isinstance(fields, str):
            return get_required_fields(fields)
        return fields
    return []

# Проверяет, есть ли в тексте кириллические символы
def has_cyrillic(text):
    return any('\u0400' <= char <= '\u04FF' for char in text)

# Проверка формата поля author
def validate_author_format(author, entry_id, line_number):
    logger.debug(f"Validating author: '{author}' for entry '{entry_id}' (line {line_number})")
    if not author or author.strip() == "":
        logger.warning(f"Empty author field in entry '{entry_id}' (line {line_number})")
        return f"Поле 'author' пустое в записи '{entry_id}' (строка {line_number})"
    # Регулярное выражение для одного автора: surname, name [patronymic]
    single_author_pattern = r'^[^{}]+,\s*[^{}]+$'
    # Регулярное выражение для нескольких авторов: surname, name [patronymic] and surname, name [patronymic]
    multi_author_pattern = r'^[^{}]+,\s*[^{}]+(\s*and\s*[^{}]+,\s*[^{}]+)*$'
    if not (re.match(single_author_pattern, author) or re.match(multi_author_pattern, author)):
        logger.warning(f"Invalid author format: '{author}' in entry '{entry_id}' (line {line_number})")
        return f"Неверный формат поля 'author' в записи '{entry_id}' (строка {line_number}): ожидается 'surname, name [patronymic]' или 'surname, name [patronymic] and surname, name [patronymic]'"
    # Проверяем каждого автора отдельно
    authors = [a.strip() for a in author.split(" and ")]
    for a in authors:
        parts = [p.strip() for p in a.split(",", 1)]  # Разделяем только по первой запятой
        if len(parts) != 2 or not parts[0] or not parts[1]:
            logger.warning(f"Invalid author component: '{a}' in entry '{entry_id}' (line {line_number})")
            return f"Неверный формат автора '{a}' в записи '{entry_id}' (строка {line_number}): ожидается 'surname, name [patronymic]'"
    logger.debug(f"Author field '{author}' is valid")
    return None

# Получает строку и возвращает список записей 
def parse_bibtex(file_contents: str):
    entries = []
    current_entry = None
    current_fields = {}
    file_lines = file_contents.splitlines()
    inside_entry = False  # Флаг для отслеживания, находимся ли внутри записи
    errors = []  # Список синтаксических ошибок
    for i, line in enumerate(file_lines):
        line = line.strip()
        logger.debug(f"Processing line {i+1}: '{line}'")
        if not line or line.startswith("%"):
            continue
        if line.startswith("@"):
            if current_entry is not None:
                # Добавляем предыдущую запись
                current_entry["fields"] = current_fields
                entries.append(current_entry)
                logger.debug(f"Appended entry on new entry start: ID={current_entry['ID']}, Type={current_entry['ENTRYTYPE']}")
                if inside_entry and not any(l.strip() == "}" for l in file_lines[:i]):
                    errors.append(f"Запись '{current_entry['ID']}' не завершена закрывающей скобкой (строка {current_entry['line_number']})")
            try:
                parts = line.split("{", 1)
                if len(parts) < 2:
                    logger.error(f"Invalid entry format at line {i+1}: '{line}'")
                    errors.append(f"Неверный формат записи в строке {i+1}: ожидается '@type{{id,'")
                    continue
                entry_type = parts[0].strip("@").lower()
                entry_id = parts[1].rstrip(",").strip()
                if not entry_id:
                    logger.error(f"Empty entry ID at line {i+1}: '{line}'")
                    errors.append(f"Пустой ID записи в строке {i+1}")
                    continue
                current_entry = {"ENTRYTYPE": entry_type, "ID": entry_id, "fields": {}, "line_number": i + 1}
                current_fields = {}
                inside_entry = True
                logger.debug(f"Started new entry: ID={entry_id}, Type={entry_type}")
            except Exception as e:
                logger.error(f"Error parsing entry at line {i+1}: '{line}', error: {str(e)}")
                errors.append(f"Ошибка парсинга записи в строке {i+1}: {str(e)}")
                continue
        elif line.startswith("}") and inside_entry:
            if current_entry is not None:
                current_entry["fields"] = current_fields
                entries.append(current_entry)
                logger.debug(f"Appended entry on closing brace: ID={current_entry['ID']}, Type={current_entry['ENTRYTYPE']}")
                current_entry = None
                current_fields = {}
                inside_entry = False
        elif "=" in line and current_entry is not None and inside_entry:
            try:
                field_name, field_value = line.split("=", 1)
                field_name = field_name.strip().lower()
                field_value = re.sub(r"[{}]", "", field_value.strip().rstrip(",").strip())
                if field_name and field_value:
                    current_fields[field_name] = field_value
                    logger.debug(f"Added field: {field_name} = {field_value}")
                else:
                    logger.warning(f"Empty field name or value at line {i+1}: '{line}'")
                    errors.append(f"Пустое имя или значение поля в строке {i+1}: '{line}'")
            except ValueError:
                logger.error(f"Invalid field format at line {i+1}: '{line}'")
                errors.append(f"Неверный формат поля в строке {i+1}: '{line}'")
                continue
    # Добавляем последнюю запись
    if current_entry is not None:
        current_entry["fields"] = current_fields
        entries.append(current_entry)
        logger.debug(f"Appended final entry: ID={current_entry['ID']}, Type={current_entry['ENTRYTYPE']}")
        if inside_entry:
            errors.append(f"Запись '{current_entry['ID']}' не завершена закрывающей скобкой (строка {current_entry['line_number']})")
    logger.debug(f"Total entries parsed: {len(entries)}")
    if errors:
        logger.warning(f"Syntax errors found: {errors}")
    return entries, errors


# Выдает соответствие курсу
def get_course(total_count, foreign_language_count, articles_after_2015_count, literature_21_century_count):
    if total_count > 35 and foreign_language_count > 7 and articles_after_2015_count > 7 and literature_21_century_count > 20:
        return '6'
    if total_count > 30 and foreign_language_count > 6 and articles_after_2015_count > 6 and literature_21_century_count > 20:
        return '5'
    if total_count > 25 and foreign_language_count > 5 and articles_after_2015_count > 6 and literature_21_century_count > 20:
        return '4'
    if total_count > 20 and foreign_language_count > 4 and articles_after_2015_count > 4 and literature_21_century_count > 14:
        return '3'
    if total_count > 15 and foreign_language_count > 3 and articles_after_2015_count > 2 and literature_21_century_count > 9:
        return '2'
    return '0'


# Проверяет весь файл, на основе функций сверху
def validate_bibtex_file(file_contents: str):
    logger.debug(f"Input file contents:\n{file_contents}")
    entries, syntax_errors = parse_bibtex(file_contents)
    logger.info(f"Parsed {len(entries)} entries")
    for entry in entries:
        logger.info(f"Parsed entry: ID={entry['ID']}, Type={entry['ENTRYTYPE']}")

    errors = syntax_errors.copy()  # Добавляем синтаксические ошибки
    seen_ids = set()  # Для проверки оригинальности ключей

    total_count = 0
    foreign_language_count = 0
    articles_after_2015_count = 0
    literature_21_century_count = 0
    current_year = datetime.now().year 

    for entry in entries:
        entry_id = entry["ID"]
        if entry_id in seen_ids:
            errors.append(f"Дублирующийся ID '{entry_id}' (строка {entry['line_number']})")
        seen_ids.add(entry_id)

        entry_type = entry["ENTRYTYPE"]
        original_entry_type = entry_type  # сохраним оригинал
        if entry_type == "online":
            entry_type = "misc"

        required_fields = get_required_fields(entry_type)
        entry_fields = [field.lower() for field in entry["fields"].keys()]
        line_number = entry["line_number"]

        # Проверка обязательных полей
        for field in required_fields:
            if field not in entry_fields:
                errors.append(f"Отсутствует обязательное поле '{field}' в записи '{entry['ID']}' типа '{original_entry_type}' (строка {line_number})")

        # Дополнительная проверка для article: должно быть хотя бы одно из volume, number, issue
        if original_entry_type == "article":
            journal_fields = ["volume", "number", "issue"]
            if not any(field in entry_fields for field in journal_fields):
                errors.append(f"Для статьи '{entry_id}' должно быть указано хотя бы одно из полей: volume, number или issue (строка {line_number})")

        # Проверка формата поля author, если оно есть и требуется
        if "author" in required_fields and "author" in entry["fields"]:
            author_error = validate_author_format(entry["fields"]["author"], entry_id, line_number)
            if author_error:
                errors.append(author_error)

        # Проверка года, больше ли он текущего
        year_str = entry["fields"].get("year", "")
        if year_str.isdigit():
            year = int(year_str)
            if year > current_year:
                errors.append(f"Год публикации {year} в будущем для записи '{entry['ID']}' (строка {line_number})")

        # Исключаем online/mis из подсчёта статистики
        if original_entry_type not in ["online"]:
            total_count += 1

        title = entry["fields"].get("title", "")

        # Проверка наличия hyphenation для английских заголовков без кириллицы
        if not has_cyrillic(title):
            if "hyphenation" not in entry_fields:
                errors.append(f"Для записи '{entry_id}' отсутствует поле 'hyphenation', хотя заголовок на английском языке (строка {line_number})")

        year = entry["fields"].get("year", "")
        hyphenation = entry["fields"].get("hyphenation", "").lower()
        language = 'english' if hyphenation == 'english' else 'russian'

        if year.isdigit():
            year = int(year)
            if original_entry_type == "article" and year > 2015:
                articles_after_2015_count += 1
            if year >= 2000:
                literature_21_century_count += 1

        if language == 'english' and original_entry_type not in ["online", "misc"]:
            foreign_language_count += 1

    logger.info(f"Total: {total_count}, Foreign: {foreign_language_count}, After 2015: {articles_after_2015_count}, 21st: {literature_21_century_count}")
    course_compliance = get_course(total_count, foreign_language_count, articles_after_2015_count, literature_21_century_count)
    logger.info(f"Course compliance: {course_compliance}")

    # Calculate requirements for the next course level
    next_course_requirements = {}
    course_levels = [
        (2, 16, 4, 3, 10),    # Требования для 2-го курса
        (3, 21, 5, 5, 15),   # Требования для 3-го курса
        (4, 26, 6, 7, 21),   # Требования для 4-го курса
        (5, 31, 7, 7, 21),   # Требования для 5-го курса
        (6, 36, 8, 8, 21),   # Требования для 6-го курса
    ]
    current_course = int(course_compliance)
    next_course = 6 if current_course == 6 else 2 if current_course == 0 else current_course + 1

    # Находим требования для следующего курса
    for level, total_req, foreign_req, after_2015_req, century_21_req in course_levels:
        if level == next_course:
            next_course_requirements = {
                "next_course": str(level),
                "additional_total": max(0, total_req - total_count),
                "additional_foreign": max(0, foreign_req - foreign_language_count),
                "additional_articles_after_2015": max(0, after_2015_req - articles_after_2015_count),
                "additional_21st_century": max(0, century_21_req - literature_21_century_count)
            }
            break

    # Если текущий курс 6, возвращаем сообщение о максимальном уровне
    if current_course == 6:
        next_course_requirements = {
            "next_course": "6",
            "additional_total": 0,
            "additional_foreign": 0,
            "additional_articles_after_2015": 0,
            "additional_21st_century": 0,
            "message": "Вы достигли максимального уровня соответствия (курс 6)"
        }

    logger.info(f"Next course requirements: {next_course_requirements}")
    return {
        "errors": errors,
        "course_compliance": course_compliance,
        "next_course_requirements": next_course_requirements
    }