from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.models import User
from hashing import hash_password, verify_password
from database import get_db
from datetime import datetime, timedelta
import jwt
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
ALGORITHM = "HS256"

router = APIRouter()

class UserLogin(BaseModel):
    username: str
    password: str

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # ← jwt.encode
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # ← jwt.encode
    return encoded_jwt


# Извлечение access_token из cookie
def get_current_user(request: Request, db: Session = Depends(get_db), optional: bool = False):
    access_token = request.cookies.get("access_token")
    logger.debug(f"Received access_token from cookie: {access_token}")
    if not access_token and optional:
        return None
    if not access_token:
        logger.error("No access_token in cookies")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            logger.error("No sub in access_token payload")
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id_user == user_id).first()
        if not user:
            logger.error(f"User not found for ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except jwt.PyJWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.post("/api/login")
def login_user(response: Response, user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль")

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(data={"sub": str(db_user.id_user)}, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(data={"sub": str(db_user.id_user)})

    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=1800)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800)
    logger.info(f"User {user.username} logged in successfully")
    return {"message": "Успешный вход"}

@router.post("/api/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    logger.info("User logged out")
    return {"message": "Успешный выход"}

@router.post("/api/refresh-token")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token отсутствует")
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])  # ← jwt.decode
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Недействительный refresh token")
    except jwt.PyJWTError:  # ← Обработка ошибок JWT
        raise HTTPException(status_code=401, detail="Недействительный refresh token")
    access_token_expires = timedelta(minutes=30)
    new_access_token = create_access_token(data={"sub": user_id}, expires_delta=access_token_expires)
    response.set_cookie(key="access_token", value=new_access_token, httponly=True, secure=False, samesite="lax", max_age=1800)
    return {"message": "Токен обновлен"}