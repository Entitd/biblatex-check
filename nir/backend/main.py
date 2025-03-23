import os
import uuid
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path
from fastapi.responses import JSONResponse, FileResponse
from dotenv import load_dotenv
from models.models import User, Examination
from database import get_db
from routers import users, auth, files
from bibtex_validator import validate_bibtex_file
from sqlalchemy import desc
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import logging
import urllib.parse

# Загрузка переменных окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Настройка базы данных
SQLALCHEMY_DATABASE_URL = "sqlite:///./bibtexcheck.db"  # Замени на свою БД, если нужно
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Инициализация FastAPI и планировщика
app = FastAPI()
scheduler = AsyncIOScheduler()

# CORS
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

# Подключение маршрутов
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(files.router)

# Монтирование статических файлов
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Импорт зависимостей из auth
from routers.auth import get_current_user

# Функция очистки устаревших гостевых сессий
def cleanup_old_guest_sessions(db: Session):
    expiration_time = datetime.utcnow() - timedelta(hours=1)  # Удаляем сессии старше 1 часа
    old_sessions = db.query(Examination).filter(
        Examination.session_id.isnot(None),
        Examination.last_active < expiration_time
    ).all()

    for exam in old_sessions:
        if exam.download_link_source and Path(exam.download_link_source).exists():
            Path(exam.download_link_source).unlink()
        if exam.download_link_edited and Path(exam.download_link_edited).exists():
            Path(exam.download_link_edited).unlink()
        db.delete(exam)
    
    db.commit()
    if old_sessions:
        logger.info(f"Deleted {len(old_sessions)} expired guest sessions")

# Запуск фоновой задачи при старте приложения
@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    scheduler.add_job(
        lambda: cleanup_old_guest_sessions(db),
        'interval',
        minutes=10  # Очистка каждые 10 минут
    )
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    SessionLocal().close()

# Эндпоинты для авторизованных пользователей
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

@app.get("/download/{file_path:path}")
async def download_file(file_path: str):
    full_path = Path(file_path)  # Предполагается, что file_path — это путь к файлу
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Кодируем имя файла для заголовка Content-Disposition
    encoded_filename = urllib.parse.quote(full_path.name)
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
    }

    return FileResponse(
        full_path,
        headers=headers,
        media_type="application/octet-stream"
    )

@app.get("/api/get-bib-content")
async def get_bib_content(file_id: int = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Examination).filter(Examination.id_examination == file_id, Examination.id_user == current_user.id_user).first()
    if not exam:
        raise HTTPException(status_code=404, detail="File not found or access denied")
    
    file_path = Path(exam.download_link_edited or exam.download_link_source)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File content not found on disk")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return {"content": content}

@app.post("/api/save-bib")
async def save_bib(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    data = await request.json()

    # Редактирование существующего файла
    updated_content = data.get("content")
    file_id = data.get("file_id")
    if updated_content and file_id:
        exam = db.query(Examination).filter(Examination.id_examination == file_id, Examination.id_user == current_user.id_user).first()
        if not exam:
            raise HTTPException(status_code=404, detail="File not found or access denied")

        edited_folder = Path('uploads/edited')
        edited_folder.mkdir(exist_ok=True)
        edited_file_name = f"{exam.id_examination}_{uuid.uuid4().hex}_{exam.name_file}"
        edited_file_path = edited_folder / edited_file_name

        if exam.download_link_edited and Path(exam.download_link_edited).exists():
            Path(exam.download_link_edited).unlink()
        with open(edited_file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        validation_result = validate_bibtex_file(updated_content)
        errors = validation_result["errors"]
        course_compliance = validation_result["course_compliance"]

        exam.number_of_errors = len(errors)
        exam.errors = "\n".join(errors) if errors else "Нет ошибок"
        exam.course_compliance = course_compliance
        exam.download_link_edited = str(edited_file_path)
        db.commit()

        return {
            "content": updated_content,
            "errors": errors,
            "course_compliance": exam.course_compliance
        }

    # Создание нового файла
    files = data.get("files")
    if files and isinstance(files, list):
        source_folder = Path('uploads/source')
        source_folder.mkdir(exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}_generated.bib"
        source_file_path = source_folder / unique_name

        bib_content = ""
        for source in files:
            bib_type = source.get("type")
            bib_id = source.get("ID")
            if not bib_type or not bib_id:
                raise HTTPException(status_code=422, detail="Each file must have a type and ID")
            bib_content += f"@{bib_type}{{{bib_id},\n"
            for key, value in source.items():
                if key not in ["type", "ID"] and value:
                    bib_content += f"  {key} = {{{value}}},\n"
            bib_content = bib_content.rstrip(",\n") + "\n}\n"

        with open(source_file_path, 'w', encoding='utf-8') as f:
            f.write(bib_content)

        validation_result = validate_bibtex_file(bib_content)
        errors = validation_result["errors"]
        course_compliance = validation_result["course_compliance"]

        new_exam = Examination(
            id_user=current_user.id_user,
            session_id=None,
            name_file=unique_name,
            loading_at=datetime.utcnow(),
            number_of_errors=len(errors),
            course_compliance=course_compliance,
            download_link_source=str(source_file_path),
            download_link_edited=None,
            errors="\n".join(errors) if errors else "Нет ошибок"
        )
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)

        return {
            "msg": "Файл успешно создан и сохранён",
            "file_path": str(source_file_path),
            "file_id": new_exam.id_examination,
            "errors": errors
        }

    raise HTTPException(status_code=422, detail="Invalid request: must provide either 'content' and 'file_id' or 'files'")

@app.post("/api/upload-bib")
async def upload_bib(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_contents = (await file.read()).decode('utf-8')
    
    source_folder = Path('uploads/source')
    source_folder.mkdir(exist_ok=True)
    original_name = file.filename
    unique_name = f"{uuid.uuid4().hex}_{original_name}"
    source_file_path = source_folder / unique_name

    with open(source_file_path, 'w', encoding='utf-8') as f:
        f.write(file_contents)

    validation_result = validate_bibtex_file(file_contents)
    errors = validation_result["errors"]
    course_compliance = validation_result["course_compliance"]

    new_exam = Examination(
        id_user=current_user.id_user,
        name_file=original_name,
        loading_at=datetime.utcnow(),
        number_of_errors=len(errors),
        course_compliance=course_compliance,
        download_link_source=str(source_file_path),
        download_link_edited=None,
        errors="\n".join(errors) if errors else "Нет ошибок"
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)

    return {
        "msg": "Файл успешно загружен и проверен",
        "file_path": str(source_file_path),
        "file_id": new_exam.id_examination,
        "errors": errors
    }

# Эндпоинты для гостевых сессий
@app.post("/api/guest/save-bib")
async def save_guest_bib(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    session_id = data.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=422, detail="sessionId is required")

    # Обновляем last_active, если прошло более 5 минут
    exam = db.query(Examination).filter(Examination.session_id == session_id).first()
    if exam:
        # Проверяем тип last_active и преобразуем, если это строка
        last_active = exam.last_active
        if isinstance(last_active, str):
            try:
                last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S.%f")
            except ValueError:
                last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S")
            logger.warning(f"last_active was a string for session {session_id}, converted to datetime: {last_active}")
        if (datetime.utcnow() - last_active) > timedelta(minutes=5):
            db.query(Examination).filter(Examination.session_id == session_id).update(
                {Examination.last_active: datetime.utcnow()}
            )
            db.commit()

    # Редактирование существующего файла
    updated_content = data.get("content")
    file_id = data.get("file_id")
    if updated_content and file_id:
        exam = db.query(Examination).filter(Examination.id_examination == file_id, Examination.session_id == session_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="File not found or access denied")

        edited_folder = Path('uploads/edited')
        edited_folder.mkdir(exist_ok=True)
        edited_file_name = f"{exam.id_examination}_{uuid.uuid4().hex}_{exam.name_file}"
        edited_file_path = edited_folder / edited_file_name

        if exam.download_link_edited and Path(exam.download_link_edited).exists():
            Path(exam.download_link_edited).unlink()
        with open(edited_file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        validation_result = validate_bibtex_file(updated_content)
        errors = validation_result["errors"]
        course_compliance = validation_result["course_compliance"]

        exam.number_of_errors = len(errors)
        exam.errors = "\n".join(errors) if errors else "Нет ошибок"
        exam.course_compliance = course_compliance
        exam.download_link_edited = str(edited_file_path)
        db.commit()

        return {
            "content": updated_content,
            "errors": errors,
            "course_compliance": exam.course_compliance
        }
    
    # Создание нового файла
    files = data.get("files")
    if files and isinstance(files, list):
        source_folder = Path('uploads/source')
        source_folder.mkdir(exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}_generated.bib"
        source_file_path = source_folder / unique_name

        bib_content = ""
        for source in files:
            bib_type = source.get("type")
            bib_id = source.get("ID")
            if not bib_type or not bib_id:
                raise HTTPException(status_code=422, detail="Each file must have a type and ID")
            bib_content += f"@{bib_type}{{{bib_id},\n"
            for key, value in source.items():
                if key not in ["type", "ID"] and value:
                    bib_content += f"  {key} = {{{value}}},\n"
            bib_content = bib_content.rstrip(",\n") + "\n}\n"

        with open(source_file_path, 'w', encoding='utf-8') as f:
            f.write(bib_content)

        validation_result = validate_bibtex_file(bib_content)
        errors = validation_result["errors"]
        course_compliance = validation_result["course_compliance"]

        new_exam = Examination(
            id_user=None,
            session_id=session_id,
            name_file=unique_name,
            loading_at=datetime.utcnow(),
            number_of_errors=len(errors),
            course_compliance=course_compliance,
            download_link_source=str(source_file_path),
            download_link_edited=None,
            errors="\n".join(errors) if errors else "Нет ошибок",
            last_active=datetime.utcnow()
        )
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)

        return {
            "msg": "Файл успешно создан и сохранён",
            "file_path": str(source_file_path),
            "file_id": new_exam.id_examination,
            "errors": errors
        }

    raise HTTPException(status_code=422, detail="Invalid request: must provide either 'content' and 'file_id' or 'files'")

@app.get("/api/guest/files")
async def get_guest_files(sessionId: str, db: Session = Depends(get_db)):
    exam = db.query(Examination).filter(Examination.session_id == sessionId).first()
    if exam:
        last_active = exam.last_active
        if isinstance(last_active, str):
            try:
                last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S.%f")
            except ValueError:
                last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S")
            logger.warning(f"last_active was a string for session {sessionId}, converted to datetime: {last_active}")
        if (datetime.utcnow() - last_active) > timedelta(minutes=5):
            db.query(Examination).filter(Examination.session_id == sessionId).update(
                {Examination.last_active: datetime.utcnow()}
            )
            db.commit()

    files = db.query(Examination).filter(Examination.session_id == sessionId).all()
    return [{
        "id": file.id_examination,
        "name_file": file.name_file,
        "loading_at": file.loading_at,
        "number_of_errors": file.number_of_errors,
        "course_compliance": file.course_compliance,
        "download_link_source": file.download_link_source,
        "download_link_edited": file.download_link_edited,
        "errors": file.errors
    } for file in files]

@app.post("/api/guest/upload-bib")
async def upload_guest_bib(file: UploadFile = File(...), sessionId: str = Form(...), db: Session = Depends(get_db)):
    exam = db.query(Examination).filter(Examination.session_id == sessionId).first()
    if exam:
        last_active = exam.last_active
        if isinstance(last_active, str):
            try:
                last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S.%f")
            except ValueError:
                last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S")
            logger.warning(f"last_active was a string for session {sessionId}, converted to datetime: {last_active}")
        if (datetime.utcnow() - last_active) > timedelta(minutes=5):
            db.query(Examination).filter(Examination.session_id == sessionId).update(
                {Examination.last_active: datetime.utcnow()}
            )
            db.commit()

    source_folder = Path('uploads/source')
    source_folder.mkdir(exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    source_file_path = source_folder / unique_name

    content = await file.read()
    with open(source_file_path, 'wb') as f:
        f.write(content)

    validation_result = validate_bibtex_file(content.decode('utf-8'))
    errors = validation_result["errors"]
    course_compliance = validation_result["course_compliance"]

    new_exam = Examination(
        id_user=None,
        session_id=sessionId,
        name_file=file.filename,
        loading_at=datetime.utcnow(),
        number_of_errors=len(errors),
        course_compliance=course_compliance,
        download_link_source=str(source_file_path),
        download_link_edited=None,
        errors="\n".join(errors) if errors else "Нет ошибок",
        last_active=datetime.utcnow()
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)

    return {"filename": file.filename}

@app.get("/download/{file_path:path}", name="download_guest_file")
async def download_guest_file(file_path: str, sessionId: str = Query(...), db: Session = Depends(get_db)):
    full_path = Path(file_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    exam = db.query(Examination).filter(
        (Examination.download_link_source == str(full_path)) | (Examination.download_link_edited == str(full_path)),
        Examination.session_id == sessionId
    ).first()
    if not exam:
        raise HTTPException(status_code=403, detail="Access denied")
    last_active = exam.last_active
    if isinstance(last_active, str):
        try:
            last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S.%f")
        except ValueError:
            last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S")
        logger.warning(f"last_active was a string for session {sessionId}, converted to datetime: {last_active}")
    if (datetime.utcnow() - last_active) > timedelta(minutes=5):
        db.query(Examination).filter(Examination.session_id == sessionId).update(
            {Examination.last_active: datetime.utcnow()}
        )
        db.commit()
    return FileResponse(
        full_path,
        filename=full_path.name,
        headers={"Content-Disposition": f"attachment; filename={full_path.name}"}
    )

@app.get("/api/guest/get-bib-content")
async def get_guest_bib_content(file_id: int = Query(...), sessionId: str = Query(...), db: Session = Depends(get_db)):
    exam = db.query(Examination).filter(Examination.id_examination == file_id, Examination.session_id == sessionId).first()
    if not exam:
        raise HTTPException(status_code=404, detail="File not found or access denied")
    
    last_active = exam.last_active
    if isinstance(last_active, str):
        try:
            last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S.%f")
        except ValueError:
            last_active = datetime.strptime(last_active, "%Y-%m-%d %H:%M:%S")
        logger.warning(f"last_active was a string for session {sessionId}, converted to datetime: {last_active}")
    if (datetime.utcnow() - last_active) > timedelta(minutes=5):
        db.query(Examination).filter(Examination.session_id == sessionId).update(
            {Examination.last_active: datetime.utcnow()}
        )
        db.commit()

    file_path = Path(exam.download_link_edited or exam.download_link_source)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File content not found on disk")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return {"content": content}

# Глобальный обработчик исключений
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"Произошла ошибка: {str(exc)}"}
    )