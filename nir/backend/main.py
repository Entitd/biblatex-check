import os
import uuid
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File, Query
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

from routers.auth import get_current_user

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
async def download_file(file_path: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    full_path = Path(file_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    exam = db.query(Examination).filter(
        (Examination.download_link_source == str(full_path)) | (Examination.download_link_edited == str(full_path)),
        Examination.id_user == current_user.id_user
    ).first()
    if not exam:
        raise HTTPException(status_code=403, detail="Access denied")
    return FileResponse(
        full_path,
        filename=full_path.name,
        headers={"Content-Disposition": f"attachment; filename={full_path.name}"}
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
    data = await request.json()
    updated_content = data.get("content")
    file_id = data.get("file_id")

    if not updated_content or not file_id:
        raise HTTPException(status_code=400, detail="Content and file_id are required")

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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"Произошла ошибка: {str(exc)}"}
    )