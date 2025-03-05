from datetime import datetime
from sqlalchemy.orm import Session
import bibtexparser
from bibtexparser.bparser import BibTexParser
from models.models import Examination
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

requiredEntryFields = {
    "article": ["author", "title", "journal", "year", "volume", "number", "pages"],
    "book": ["author", "title", "year", "address", "publisher", "pages"],
    "manual": ["organization", "title", "year"],
    "misc": ["author", "title", "urldate", "url"],
    "online": ["author", "title", "urldate", "url"],
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
    "misc": ["author", "title", "urldate", "url"],  # замена для online
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
    "mastersthesis": ["author", "title", "institution", "year"],
    "techreport": ["author", "title", "institution", "year"],
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

def detect_language(text):
    for char in text:
        if 'а' <= char <= 'я' or 'А' <= char <= 'Я':
            return 'russian'
    return 'english'

def get_square_color(total_count, foreign_language_count, articles_after_2010_count, literature_21_century_count):
    if total_count > 30 and foreign_language_count > 6 and articles_after_2010_count > 6 and literature_21_century_count > 20:
        return '5'
    if total_count >= 25 and foreign_language_count > 5 and articles_after_2010_count > 6 and literature_21_century_count > 20:
        return '4'
    if total_count > 20 and foreign_language_count > 4 and articles_after_2010_count > 4 and literature_21_century_count > 14:
        return '3'
    if total_count > 15 and foreign_language_count > 3 and articles_after_2010_count > 2 and literature_21_century_count > 9:
        return '2'
    return '0'

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

def validate_bibtex_file(file_contents: str, session: Session, user_id: int, file_name: str):
    logger.debug(f"Input file contents:\n{file_contents}")
    entries = parse_bibtex(file_contents)
    logger.info(f"Parsed {len(entries)} entries")
    for entry in entries:
        logger.info(f"Parsed entry: ID={entry['ID']}, Type={entry['ENTRYTYPE']}")

    errors = []
    total_count = 0
    foreign_language_count = 0
    articles_after_2010_count = 0
    literature_21_century_count = 0

    for entry in entries:
        entry_type = entry["ENTRYTYPE"]
        if entry_type == "online":
            entry_type = "misc"
        required_fields = get_required_fields(entry_type)
        entry_fields = [field.lower() for field in entry["fields"].keys()]
        line_number = entry["line_number"]

        missing_fields = [field for field in required_fields if field not in entry_fields]
        if missing_fields:
            errors.append(f"Отсутствуют обязательные поля {', '.join(missing_fields)} в записи '{entry['ID']}' типа '{entry_type}' (строка {line_number})")

        total_count += 1
        title = entry["fields"].get("title", "")
        year = entry["fields"].get("year", "")
        hyphenation = entry["fields"].get("hyphenation", "").lower()

        # Явно проверяем язык только по hyphenation, иначе считаем русской
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
    course_compliance = get_square_color(total_count, foreign_language_count, articles_after_2010_count, literature_21_century_count)
    logger.info(f"Course compliance: {course_compliance}")

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

    try:
        session.add(new_exam)
        session.commit()
        logger.info(f"Examination saved with {len(errors)} errors")
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to save examination: {e}")
        raise e

    return errors