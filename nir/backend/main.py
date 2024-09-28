from fastapi import FastAPI, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import bibtexparser
from bibtexparser.bwriter import BibTexWriter
from pathlib import Path

from database import SessionLocal
from models.models import examinations
from crud import get_user_examinations
from pydantic import BaseModel

app = FastAPI()

# Разрешаем CORS
origins = [
    "http://localhost:5174",  # адрес вашего React приложения
    "http://localhost:5173"    # если вы используете другой порт, добавьте его тоже
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Зависимость для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic модели для ответов
class ExaminationResponse(BaseModel):
    id: int
    user_id: int
    name_file: str
    number_of_errors: int
    course_compliance: int
    download_link_source: str
    download_link_edited: str

@app.get("/api/files", response_model=list[ExaminationResponse])
def get_files(user_id: int, skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    exams_list = get_user_examinations(db, user_id)  # Используем функцию из crud
    return exams_list  # Убедитесь, что exams_list имеет правильный формат


@app.post("/api/save-bib")
async def save_bib(request: Request):
    sources = await request.json()
    print("Полученные источники:", sources)  # Проверка входящих данных

    if not isinstance(sources, list) or not all('type' in source for source in sources):
        raise HTTPException(status_code=400, detail="Не все источники имеют указанный тип")

    bib_entries = []
    for index, source in enumerate(sources):
        entry = {
            'ENTRYTYPE': source['type'],
            'ID': f'source{index + 1}',
        }

        # Добавляем только непустые поля
        if 'author' in source and source['author']:
            entry['author'] = source['author']
        if 'title' in source and source['title']:
            entry['title'] = source['title']
        if 'publisher' in source and source['publisher']:
            entry['publisher'] = source['publisher']
        if 'address' in source and source['address']:
            entry['address'] = source['address']
        if 'url' in source and source['url']:
            entry['url'] = source['url']
        if 'urldate' in source and source['urldate']:
            entry['urldate'] = source['urldate']    
        if 'journal' in source and source['journal']:
            entry['journal'] = source['journal']
        if 'year' in source and source['year']:
            entry['year'] = source['year']
        if 'volume' in source and source['volume']:
            entry['volume'] = source['volume']
        if 'number' in source and source['number']:
            entry['number'] = source['number']
        if 'pages' in source and source['pages']:
            entry['pages'] = source['pages']

        # Убираем пустые поля
        bib_entries.append({k: v for k, v in entry.items() if v})

    print("Сформированные записи BibTeX:", bib_entries)  # Проверка данных

    # Создаем объект BibDatabase и заполняем его данными
    bib_database = bibtexparser.bibdatabase.BibDatabase()
    bib_database.entries = bib_entries

    writer = BibTexWriter()

    # Директория для хранения файлов
    folder_path = Path('bib-files')
    folder_path.mkdir(exist_ok=True)  # Создаем папку, если ее нет

    # Находим максимальный номер файла, чтобы использовать следующий
    existing_files = folder_path.glob('create_file*.bib')
    max_number = 0
    for file in existing_files:
        filename = file.stem  # Получаем имя файла без расширения
        number_part = filename.replace('create_file', '')  # Извлекаем числовую часть
        if number_part.isdigit():
            max_number = max(max_number, int(number_part))

    # Увеличиваем номер для нового файла
    next_number = max_number + 1
    file_name = f'create_file{next_number}.bib'
    file_path = folder_path / file_name

    # Сохраняем файл на сервере
    try:
        with open(file_path, 'w') as bibfile:
            bibfile.write(writer.write(bib_database))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении BibTeX файла: {str(e)}")