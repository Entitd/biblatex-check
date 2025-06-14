from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.models import User
from hashing import hash_password
from database import get_db

router = APIRouter()


class UserCreate(BaseModel):
    username: str
    password: str


@router.post("/api/register")
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Проверка, существует ли уже пользователь с таким логином
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует.")

    # Хеширование пароля перед сохранением
    hashed_password = hash_password(user.password)

    # Создание нового пользователя
    new_user = User(
        username=user.username,
        hashed_password=hashed_password,
        email=user.username,  # Используем username вместо email(думал делать связку по email, потом решил не делать)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "Пользователь успешно зарегистрирован."}
