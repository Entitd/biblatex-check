import os
import uuid
import jwt
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pathlib import Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.models import User, Examination
from database import SessionLocal, get_db
from routers import users, register, auth, files
from bibtex_validator import validate_bibtex_file
from routers.auth import get_current_user
from jwt import PyJWTError
from bibtexparser.bibdatabase import BibDatabase
from bibtexparser.bwriter import BibTexWriter
from sqlalchemy import asc  # Добавлен импорт для сортировки

# Загрузка переменных окружения
load_dotenv()

# Извлечение секретного ключа из переменной окружения
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")  # Используйте свою переменную окружения
ALGORITHM = "HS256"

# Инициализация FastAPI
app = FastAPI()

# Разрешение CORS для работы с фронтендом
origins = [
    "http://localhost:5173",
    "http://26.38.58.120:5173",
    "http://10.0.85.2:5173",
    "http://192.168.0.108:5173",
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

class UserResponse(BaseModel):
    id_user: int
    email: str
    username: str

# Роутеры
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(register.router)
app.include_router(files.router)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Путь для получения файлов по user_id
@app.get("/api/files")
async def get_user_files(user_id: int, db: Session = Depends(get_db)):
    # Выполняем запрос с сортировкой по дате загрузки в порядке убывания
    user_files = db.query(Examination).filter(Examination.id_user == user_id).order_by(asc(Examination.loading_at)).all()
    if not user_files:
        raise HTTPException(status_code=404, detail="Записи не найдены.")
    return user_files

# OAuth2 схема для получения текущего пользователя
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(User).filter(User.id_user == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Профиль пользователя
@app.get("/api/profile")
def get_profile(user: User = Depends(get_current_user)):
    return {"id_user": user.id_user, "username": user.username}

# Сохранение BibTeX файла
@app.post("/api/save-bib")
async def save_bib(request: Request):
    sources = await request.json()
    if not isinstance(sources, list) or not all('type' in source for source in sources):
        raise HTTPException(status_code=400, detail="Не все источники имеют указанный тип")

    bib_entries = []
    for index, source in enumerate(sources):
        entry = {'ENTRYTYPE': source['type'], 'ID': f'source{index + 1}'}
        for key in ['author', 'title', 'publisher', 'address', 'url', 'urldate', 'journal', 'year', 'volume', 'number', 'pages']:
            if key in source and source[key]:
                entry[key] = source[key]
        bib_entries.append({k: v for k, v in entry.items() if v})

    bib_database = BibDatabase()
    bib_database.entries = bib_entries
    writer = BibTexWriter()

    folder_path = Path('bib-files')
    folder_path.mkdir(exist_ok=True)

    # Генерация уникального имени файла с использованием UUID
    file_name = f"bib_file_{uuid.uuid4().hex}.bib"
    file_path = folder_path / file_name

    try:
        with open(file_path, 'w') as bibfile:
            bibfile.write(writer.write(bib_database))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении BibTeX файла: {str(e)}")

    return {"msg": "Файл успешно сохранен", "file_path": str(file_path)}

# Маршрут для logout
@app.post("/api/logout")
async def logout():
    return {"message": "Вы успешно вышли из системы"}

# Обработчик глобальных исключений
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"Произошла ошибка: {str(exc)}"}
    )
