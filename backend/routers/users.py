from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.models import User
from hashing import hash_password
from database import get_db
from routers.auth import get_current_user  # Импорт обновленного get_current_user

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id_user: int
    username: str
    email: str

@router.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует")
    hashed_password = hash_password(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password, email=user.username)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Пользователь успешно зарегистрирован"}

@router.get("/api/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return {"id_user": current_user.id_user, "username": current_user.username, "email": current_user.email}