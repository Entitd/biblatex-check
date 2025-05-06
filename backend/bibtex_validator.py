from datetime import datetime
from sqlalchemy.orm import Session
import bibtexparser
from bibtexparser.bparser import BibTexParser
from models.models import Examination
import logging
import re
from pathlib import Path


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#Словарь полей записи
requiredEntryFields = {
    "article": ["author", "title", "journal", "year", "volume", "number", "pages"],
    "book": ["author", "title", "year", "address", "publisher", "pages"],
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

#Возвращает список обязательных полей для переданного типа
def get_required_fields(entry_type):
    if entry_type in requiredEntryFields:
        fields = requiredEntryFields[entry_type]
        if isinstance(fields, str):
            return get_required_fields(fields)
        return fields
    return []

#Проверка англоязычная литература или русскоязычная
def detect_language(text):
    for char in text:
        if 'а' <= char <= 'я' or 'А' <= char <= 'Я':
            return 'russian'
    return 'english'

#Выдает соответствие курсу
def get_course(total_count, foreign_language_count, articles_after_2010_count, literature_21_century_count):
    if total_count > 30 and foreign_language_count > 6 and articles_after_2010_count > 6 and literature_21_century_count > 20:
        return '6'
    if total_count > 25 and foreign_language_count > 5 and articles_after_2010_count > 6 and literature_21_century_count > 20:
        return '4'
    if total_count > 20 and foreign_language_count > 4 and articles_after_2010_count > 4 and literature_21_century_count > 14:
        return '3'
    if total_count > 15 and foreign_language_count > 3 and articles_after_2010_count > 2 and literature_21_century_count > 9:
        return '2'
    return '0'

#Получает строку и возвращает список записей 
def parse_bibtex(file_contents: str):
    entries = []
    current_entry = None
    current_fields = {}
    file_lines = file_contents.splitlines()

    for i, line in enumerate(file_lines):
        line = line.strip()
        if not line or line.startswith("%"):
            continue

        if line.startswith("@"):
            if current_entry is not None and current_fields:
                current_entry["fields"] = current_fields
                entries.append(current_entry)
            entry_type = line.split("{")[0].strip("@").lower()
            entry_id = line.split("{")[1].rstrip(",\n").strip()
            current_entry = {"ENTRYTYPE": entry_type, "ID": entry_id, "fields": {}, "line_number": i + 1}
            current_fields = {}
        elif line.startswith("}"):
            if current_entry is not None and current_fields:
                current_entry["fields"] = current_fields
                entries.append(current_entry)
                current_entry = None
                current_fields = {}
        elif "=" in line and current_entry is not None:
            field_name, field_value = line.split("=", 1)
            field_name = field_name.strip().lower()
            field_value = re.sub(r"[{}]", "", field_value.strip().rstrip(",").strip())
            current_fields[field_name] = field_value

    return entries

#Проверяет весь файл, на основе функций сверху
def validate_bibtex_file(file_contents: str):
    logger.debug(f"Input file contents:\n{file_contents}")
    entries = parse_bibtex(file_contents)
    logger.info(f"Parsed {len(entries)} entries")
    for entry in entries:
        logger.info(f"Parsed entry: ID={entry['ID']}, Type={entry['ENTRYTYPE']}")

    errors = []
    seen_ids = set() #Для проверки оригинальности ключей
    total_count = 0
    foreign_language_count = 0
    articles_after_2010_count = 0
    literature_21_century_count = 0
    current_year = datetime.now().year 

    for entry in entries:
        entry_id = entry["ID"]
        if entry_id in seen_ids:
            errors.append(f"Дублирующийся ID '{entry_id}' (строка {entry['line_number']})")
        seen_ids.add(entry_id)

        entry_type = entry["ENTRYTYPE"]
        if entry_type == "online":
            entry_type = "misc"
            
        required_fields = get_required_fields(entry_type)
        entry_fields = [field.lower() for field in entry["fields"].keys()]
        line_number = entry["line_number"]

        # Изменено: каждая ошибка для каждого пропущенного поля добавляется отдельно
        for field in required_fields:
            if field not in entry_fields:
                errors.append(f"Отсутствует обязательное поле '{field}' в записи '{entry['ID']}' типа '{entry_type}' (строка {line_number})")

        #Проверка года, больше ли он текущего
        year_str = entry["fields"].get("year", "")
        if year_str.isdigit():
            year = int(year_str)
            if year > current_year:
                errors.append(f"Год публикации {year} в будущем для записи '{entry['ID']}' (строка {line_number})")
        
        total_count += 1
        title = entry["fields"].get("title", "")
        year = entry["fields"].get("year", "")
        hyphenation = entry["fields"].get("hyphenation", "").lower()

        language = 'english' if hyphenation == 'english' else 'russian'

        if year.isdigit():
            year = int(year)
            if entry_type == "article" and year > 2010:
                articles_after_2010_count += 1
            if year >= 2000:
                literature_21_century_count += 1

        if language == 'english':
            foreign_language_count += 1

    logger.info(f"Total: {total_count}, Foreign: {foreign_language_count}, After 2010: {articles_after_2010_count}, 21st: {literature_21_century_count}")
    course_compliance = get_course(total_count, foreign_language_count, articles_after_2010_count, literature_21_century_count)
    logger.info(f"Course compliance: {course_compliance}")

    return {
        "errors": errors,
        "course_compliance": course_compliance
    }