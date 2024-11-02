from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from models.models import User
from database import get_db
from hashing import verify_password
from pydantic import BaseModel
from fastapi import FastAPI, Request

router = APIRouter()

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str

@router.post("/api/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    # Проверка существования пользователя
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Неверный логин или пароль.")

    # Проверка пароля
    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль.")

    return {"id_user": db_user.id_user, "username": db_user.username}


# Создаем зависимость для получения текущего пользователя
def get_current_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Пользователь не найден.")
    return user
