import os
import uuid
import jwt
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File, Query
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
from jwt import PyJWTError
from bibtexparser.bibdatabase import BibDatabase
from bibtexparser.bwriter import BibTexWriter
from sqlalchemy import desc
import bibtex_validator  # Импортируем модуль целиком
from bibtex_validator import validate_bibtex_file  # Импортируем функцию

# Отладочный вывод после импорта
print(f"Using bibtex_validator from: {bibtex_validator.__file__}")
print(f"validate_bibtex_file signature at startup: {validate_bibtex_file.__code__.co_varnames}")

# Загрузка переменных окружения
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
ALGORITHM = "HS256"

app = FastAPI()

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
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@app.get("/api/files")
async def get_user_files(user_id: int, db: Session = Depends(get_db)):
    user_files = db.query(Examination).filter(Examination.id_user == user_id).order_by(desc(Examination.loading_at)).all()
    if not user_files:
        raise HTTPException(status_code=404, detail="Записи не найдены.")
    return [{
        "id": file.id_examination,
        "id_user": file.id_user,
        "name_file": file.name_file,
        "loading_at": file.loading_at,
        "number_of_errors": file.number_of_errors,
        "course_compliance": file.course_compliance,
        "download_link_source": file.download_link_source,
        "download_link_edited": file.download_link_edited,
        "errors": file.errors
    } for file in user_files]

@app.get("/api/profile")
def get_profile(user: User = Depends(get_current_user)):
    return {"id_user": user.id_user, "username": user.username}

@app.get("/api/get-bib-content")
async def get_bib_content(file_id: int = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Examination).filter(Examination.id_examination == file_id, Examination.id_user == current_user.id_user).first()
    if not exam:
        raise HTTPException(status_code=404, detail="File not found or access denied")
    
    file_path = Path(exam.download_link_source)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File content not found on disk")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return {"content": content}

@app.post("/api/save-bib")
async def save_bib(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Парсинг тела запроса
    data = await request.json()
    updated_content = data.get("content")
    file_id = data.get("file_id")

    # Проверка обязательных полей
    if not updated_content or not file_id:
        raise HTTPException(status_code=400, detail="Content and file_id are required")

    # Получение записи Examination
    exam = db.query(Examination).filter(Examination.id_examination == file_id, Examination.id_user == current_user.id_user).first()
    if not exam:
        raise HTTPException(status_code=404, detail="File not found or access denied")

    # Сохранение обновлённого содержимого в файл
    file_path = Path(exam.download_link_source)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)

    # Отладочные сообщения
    print(f"validate_bibtex_file signature: {validate_bibtex_file.__code__.co_varnames}")
    print(f"Arguments passed: file_contents={updated_content}, session={db}, user_id={current_user.id_user}, file_name={exam.name_file}, file_path={str(file_path)}")

    # Валидация обновлённого BibTeX файла
    errors = validate_bibtex_file(updated_content, db, current_user.id_user, exam.name_file, str(file_path))
    
    # Обновление записи Examination
    exam.number_of_errors = len(errors)
    exam.errors = "\n".join(errors) if errors else "Нет ошибок"
    db.commit()

    # Возврат ответа
    return {
        "content": updated_content,
        "errors": errors,
        "course_compliance": exam.course_compliance
    }

@app.post("/api/upload-bib")
async def upload_bib(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Чтение содержимого файла
    file_contents = (await file.read()).decode('utf-8')
    
    # Создание директории для загрузки, если её нет
    folder_path = Path('uploads')
    folder_path.mkdir(exist_ok=True)
    
    # Генерация уникального имени файла
    original_name = file.filename
    unique_name = f"{uuid.uuid4().hex}_{original_name}"
    file_path = folder_path / unique_name

    # Сохранение файла на диск
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(file_contents)

    # Отладочные сообщения
    print(f"validate_bibtex_file signature: {validate_bibtex_file.__code__.co_varnames}")
    print(f"Arguments passed: file_contents={file_contents}, session={db}, user_id={current_user.id_user}, file_name={original_name}, file_path={str(file_path)}")

    # Валидация BibTeX файла
    errors = validate_bibtex_file(file_contents, db, current_user.id_user, original_name, str(file_path))
    
    # Получение последней записи Examination
    exam = db.query(Examination).filter(Examination.name_file == original_name, Examination.id_user == current_user.id_user).order_by(desc(Examination.loading_at)).first()
    
    # Возврат ответа
    return {
        "msg": "Файл успешно загружен и проверен",
        "file_path": str(file_path),
        "file_id": exam.id_examination if exam else None,
        "errors": errors
    }

@app.post("/api/logout")
async def logout():
    return {"message": "Вы успешно вышли из системы"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"Произошла ошибка: {str(exc)}"}
    )