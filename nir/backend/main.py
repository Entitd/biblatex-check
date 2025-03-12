import os
import uuid
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pathlib import Path
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from models.models import User, Examination
from database import get_db
from routers import users, auth, files
from bibtex_validator import validate_bibtex_file
from sqlalchemy import desc
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from jwt import PyJWTError, decode
import logging

load_dotenv()

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

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(files.router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
ALGORITHM = "HS256"

# Обновлённая функция get_current_user
def get_current_user(request: Request, db: Session = Depends(get_db)):
    access_token = request.cookies.get("access_token")
    logger.debug(f"Received access_token from cookie: {access_token}")
    if not access_token:
        return None  # Возвращаем None, если токена нет (гость)
    
    try:
        payload = decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            logger.error("No sub in access_token payload")
            return None
        user = db.query(User).filter(User.id_user == user_id).first()
        if not user:
            logger.error(f"User not found for ID: {user_id}")
            return None
        return user
    except PyJWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        return None

# Эндпоинты для авторизованных пользователей
@app.get("/api/files")
async def get_user_files(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user or current_user.id_user != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
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

@app.post("/api/upload-bib")
async def upload_bib(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
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
        loading_at=datetime.now(),
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

@app.get("/api/get-bib-content")
async def get_bib_content(file_id: int = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
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
      loading_at=datetime.now(),
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
# Гостевые эндпоинты
@app.get("/api/guest/files")
async def get_guest_files(sessionId: str, db: Session = Depends(get_db)):
    guest_files = db.query(Examination).filter(Examination.session_id == sessionId).order_by(desc(Examination.loading_at)).all()
    if not guest_files:
        return []
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
    } for file in guest_files]

@app.post("/api/guest/upload-bib")
async def upload_guest_bib(file: UploadFile = File(...), sessionId: str = Form(...), db: Session = Depends(get_db)):
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
        id_user=None,
        session_id=sessionId,
        name_file=original_name,
        loading_at=datetime.now(),
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

@app.get("/api/guest/get-bib-content")
async def get_guest_bib_content(file_id: int = Query(...), sessionId: str = Query(...), db: Session = Depends(get_db)):
    exam = db.query(Examination).filter(Examination.id_examination == file_id, Examination.session_id == sessionId).first()
    if not exam:
        raise HTTPException(status_code=404, detail="File not found or access denied")
    
    file_path = Path(exam.download_link_edited or exam.download_link_source)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File content not found on disk")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return {"content": content}

@app.post("/api/guest/save-bib")
async def save_guest_bib(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    session_id = data.get("sessionId")  # Берем sessionId из тела JSON
    if not session_id:
        raise HTTPException(status_code=422, detail="sessionId is required")

    # Если переданы content и file_id, это редактирование существующего файла
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
    
    # Если переданы files, это создание нового файла
    files = data.get("files")
    if files and isinstance(files, list):
        source_folder = Path('uploads/source')
        source_folder.mkdir(exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}_generated.bib"
        source_file_path = source_folder / unique_name

        # Преобразуем переданные источники в BibTeX формат
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
            loading_at=datetime.now(),
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

@app.get("/download/{file_path:path}")
async def download_file(file_path: str, sessionId: str = Query(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    full_path = Path(file_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if current_user:
        exam = db.query(Examination).filter(
            (Examination.download_link_source == str(full_path)) | (Examination.download_link_edited == str(full_path)),
            Examination.id_user == current_user.id_user
        ).first()
    else:
        if not sessionId:
            raise HTTPException(status_code=401, detail="Session ID required for guest access")
        exam = db.query(Examination).filter(
            (Examination.download_link_source == str(full_path)) | (Examination.download_link_edited == str(full_path)),
            Examination.session_id == sessionId
        ).first()

    if not exam:
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        full_path,
        filename=full_path.name,
        headers={"Content-Disposition": f"attachment; filename={full_path.name}"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"Произошла ошибка: {str(exc)}"}
    )