from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pathlib import Path

from fastapi.responses import JSONResponse

from database import SessionLocal, get_db  # Исправлено: добавлен импорт get_db
from models.models import User, Examination
from routers import users, register, auth
from pydantic import BaseModel
from hashing import hash_password
from routers.users import router as users_router
from bibtex_validator import validate_bibtex_file
from crud import get_user_examinations  # Добавлен импорт get_user_examinations
from datetime import datetime
import bibtexparser
from bibtexparser.bwriter import BibTexWriter
from bibtexparser.bibdatabase import BibDatabase


from database import get_db  # Импортируйте функцию get_db
from models.models import Examination  # Импортируйте вашу модель Examination
from bibtex_validator import validate_bibtex_file  # Импортируйте вашу функцию валидации

from routers.auth import get_current_user
app = FastAPI()

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(users_router)
app.include_router(register.router)

# Разрешаем CORS для взаимодействия с фронтендом
origins = [
    "http://localhost:5174",
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic модели для ответов
class ExaminationResponse(BaseModel):
    id_examination: int
    id_user: int
    name_file: str
    loading_at: str
    number_of_errors: int
    course_compliance: int
    download_link_source: str
    download_link_edited: str

# Вывод файлов в зависимости от user_id 
@app.get("/api/files") 
async def get_user_files(user_id: int, db: Session = Depends(get_db)):
    # Получение записей только для указанного user_id
    user_files = db.query(Examination).filter(Examination.id_user == user_id).all()
    
    if not user_files:
        raise HTTPException(status_code=404, detail="Записи не найдены.")
    
    return user_files

# Сохранение BibTeX-файла
@app.post("/api/save-bib")
async def save_bib(request: Request):
    sources = await request.json()
    print("Полученные источники:", sources)

    if not isinstance(sources, list) or not all('type' in source for source in sources):
        raise HTTPException(status_code=400, detail="Не все источники имеют указанный тип")

    bib_entries = []
    for index, source in enumerate(sources):
        entry = {'ENTRYTYPE': source['type'], 'ID': f'source{index + 1}'}
        for key in ['author', 'title', 'publisher', 'address', 'url', 'urldate', 'journal', 'year', 'volume', 'number', 'pages']:
            if key in source and source[key]:
                entry[key] = source[key]
        bib_entries.append({k: v for k, v in entry.items() if v})

    print("Сформированные записи BibTeX:", bib_entries)

    bib_database = BibDatabase()
    bib_database.entries = bib_entries
    writer = BibTexWriter()

    folder_path = Path('bib-files')
    folder_path.mkdir(exist_ok=True)

    existing_files = folder_path.glob('create_file*.bib')
    max_number = max((int(file.stem.replace('create_file', '')) for file in existing_files), default=0)
    next_number = max_number + 1
    file_name = f'create_file{next_number}.bib'
    file_path = folder_path / file_name

    try:
        with open(file_path, 'w') as bibfile:
            bibfile.write(writer.write(bib_database))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении BibTeX файла: {str(e)}")

    return {"msg": "Файл успешно сохранен", "file_path": str(file_path)}

# загрузка bib-файлов
# @app.post("/api/upload-bib")
# async def upload_bib(file: UploadFile = File(...), db: Session = Depends(get_db)):
#     try:
#         contents = await file.read()
        
#         if not file.filename.endswith('.bib'):
#             return JSONResponse(status_code=400, content={"message": "Неверный формат файла"})
        
#         # Проверка содержимого файла
#         validation_errors = validate_bibtex_file(contents.decode('utf-8'))
        
#         # Создание пути и папки для сохранения файла
#         upload_path = Path('uploads')
#         upload_path.mkdir(exist_ok=True)

#         file_path = upload_path / file.filename
#         with open(file_path, 'wb') as f:
#             f.write(contents)

#         # Сохранение информации в базу данных
#         new_exam = Examination(
#             id_user=1,  # Здесь вам нужно установить реальный ID пользователя
#             name_file=file.filename,
#             loading_at=datetime.now(),
#             number_of_errors=len(validation_errors),
#             course_compliance=0,
#             download_link_source=str(file_path),
#             download_link_edited="",
#             errors="; ".join(validation_errors) if validation_errors else None
#         )
#         db.add(new_exam)
#         db.commit()

#         return {"filename": file.filename, "message": "Файл успешно загружен", "errors": validation_errors}
    
#     except Exception as e:
#         # Выводим ошибку в логи и возвращаем ответ с деталями ошибки
#         print(f"Ошибка при загрузке файла: {str(e)}")
#         return JSONResponse(status_code=500, content={"message": f"Ошибка при загрузке файла: {str(e)}"})


@app.post("/api/upload-bib")
async def upload_bib(file: UploadFile, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Здесь current_user уже содержит информацию о текущем пользователе
    if not file.filename.endswith(".bib"):
        raise HTTPException(status_code=400, detail="Неверный формат файла, ожидается .bib")

    content = await file.read()

    try:
        upload_path = Path('uploads')
        upload_path.mkdir(exist_ok=True)

        file_path = upload_path / file.filename
        with open(file_path, 'wb') as f:
            f.write(content)

        loading_at = datetime.now()
        new_exam = Examination(
            id_user=current_user.id,  # Используем id текущего пользователя
            name_file=file.filename,
            loading_at=loading_at,
            number_of_errors=0,
            course_compliance=2,
            download_link_source=str(file_path),
            download_link_edited="",
            errors="Нет ошибок"
        )

        db.add(new_exam)
        db.commit()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обработке файла: {str(e)}")

    return {"msg": "Файл успешно загружен", "file_path": str(file_path)}