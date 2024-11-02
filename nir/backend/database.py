from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASS

# Убедитесь, что ваша строка подключения правильная
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Создание движка базы данных
engine = create_engine(DATABASE_URL)

# Создание метаданных
metadata = MetaData()

# Создание базового класса для моделей
Base = declarative_base()

# Создание класса сессии
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Функция для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
