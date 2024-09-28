from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from backend import models
from backend import database


app = FastAPI()

# Создаем базу данных, если она еще не создана
models.Base.metadata.create_all(bind=database.engine)

# Получение сессии для работы с базой данных
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Эндпоинт для получения файлов
@app.get("/api/files")
def read_files(db: Session = Depends(get_db)):
    files = db.query(models.File).all()
    if files is None:
        raise HTTPException(status_code=404, detail="Files not found")
    return files
