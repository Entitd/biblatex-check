from datetime import datetime
from sqlalchemy.orm import Session
import bibtexparser
from bibtexparser.bparser import BibTexParser
from models.models import Examination  # Убедитесь, что пути к моделям правильные

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
    "misc": ["author", "title", "year"],
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

def validate_bibtex_file(file_contents: str, session: Session, user_id: int, file_name: str):
    parser = BibTexParser()

    print(f"File contents: {file_contents}")

    try:
        bib_data = parser.parse(file_contents)
    except Exception as e:
        print(f"Parser error: {e}")
        return []

    print(f"Parsed entries: {bib_data.entries}")

    errors = []

    for entry in bib_data.entries:
        entry_type = entry.get('ENTRYTYPE', '').lower()
        required_fields = get_required_fields(entry_type)

        print(f"Processing entry: {entry}")
        print(f"Entry type: {entry_type}")
        print(f"Required fields: {required_fields}")
        print(f"Entry fields: {entry.keys()}")

        missing_fields = [field for field in required_fields if field not in entry]
        print(f"Missing fields for {entry_type}: {missing_fields}")

        if missing_fields:
            error_message = f"Missing required fields {', '.join(missing_fields)} in entry of type '{entry_type}'"
            errors.append(error_message)
            print(f"Added error: {error_message}")

        print(f"Current errors: {errors}")

    # Добавляем явные ошибки для проверки
    # errors.append("Тестовая ошибка для проверки")
    # errors.append("хуй")

    print(f"Errors before saving: {errors}")

    loading_at = datetime.now()
    course_compliance = 2
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
    print(f"Errors after creating Examination object: {new_exam.errors}")

    try:
        session.add(new_exam)
        session.commit()
        print(f"Examination object saved successfully with errors: {new_exam.errors}")

        saved_exam = session.query(Examination).filter_by(id_user=user_id, name_file=file_name).first()
        print(f"Errors after querying from database: {saved_exam.errors}")
    except Exception as e:
        session.rollback()
        raise e

    return errors

