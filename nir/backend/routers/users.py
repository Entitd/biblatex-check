from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.models import User
from database import get_db
from hashing import hash_password

router = APIRouter()

# Модель для данных с фронтенда
class UserCreate(BaseModel):
    username: str
    password: str

# Регистрация пользователя
@router.post("/api/register")
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует.")

    hashed_password = hash_password(user.password)

    new_user = User(
        username=user.username,
        password=hashed_password,
        email=user.username,  # Здесь можно изменить на реальный email, если у вас есть поле для этого
    )
    db.add(new_user)
    db.commit()

    return {"message": "Пользователь успешно зарегистрирован."}
