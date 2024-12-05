from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.models import User
from hashing import verify_password
from database import get_db
from datetime import datetime, timedelta
from jwt import encode, decode
import os
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Извлечение секретного ключа из переменной окружения
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")  # Используйте свою переменную окружения
ALGORITHM = "HS256"

router = APIRouter()

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/api/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль.")

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(db_user.id_user)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Создаем зависимость для получения текущего пользователя
def get_current_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id_user == user_id).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Пользователь не найден.")
    return user
