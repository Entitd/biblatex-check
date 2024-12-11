from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
from fastapi.responses import JSONResponse
from models.models import User, Examination
from database import get_db
from routers.auth import get_current_user
from bibtex_validator import validate_bibtex_file

router = APIRouter()

# Загрузка BibTeX файла
@router.post("/api/upload-bib")
async def upload_bib(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        contents = await file.read()

        if not file.filename.endswith('.bib'):
            return JSONResponse(status_code=415, content={"message": "Неверный формат файла. Ожидается .bib"})

        # Проверка содержимого файла
        validation_errors = validate_bibtex_file(contents.decode('utf-8'), db, current_user.id_user, file.filename)

        # Путь для загрузки файла
        upload_path = Path('uploads')
        upload_path.mkdir(exist_ok=True)

        file_path = upload_path / file.filename
        with open(file_path, 'wb') as f:
            f.write(contents)

        return {"filename": file.filename, "message": "Файл успешно загружен", "errors": validation_errors}

    except Exception as e:
        print(f"Ошибка при загрузке файла: {str(e)}")
        return JSONResponse(status_code=500, content={"message": f"Ошибка при загрузке файла: {str(e)}"})
