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
from models.models import User, Examination, Base
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
# SQLALCHEMY_DATABASE_URL = "postgresql://postgres:qwerty@db:5432/postgres"

SQLALCHEMY_DATABASE_URL = "postgresql://user:password@db:5432/bibtexcheck"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()
scheduler = AsyncIOScheduler()

origins = [
    "http://bibcheck.ru",
    "https://bibcheck.ru",
    "http://www.bibcheck.ru",
    "https://www.bibcheck.ru",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(files.router)

# Монтирование статических файлов
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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


# Глобальный обработчик исключений
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"Произошла ошибка: {str(exc)}"}
    )
