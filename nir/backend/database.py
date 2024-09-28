# from sqlalchemy import create_engine, MetaData
# from sqlalchemy.orm import sessionmaker
# from config import DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASS

# DATABASE_URL =  "postgresql://postgre:qwerty@localhost:5432/postgre"
# # DATABASE_URL = "postgresql://%(DB_USER)s:%(DB_PASS)s@%(DB_HOST)s:%(DB_PORT)s/%(DB_NAME)s"  # Укажите вашу БД
# engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
# metadata = MetaData()
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


#  # Укажите вашу БД

from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from config import DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASS

# Убедитесь, что ваша строка подключения правильная
DATABASE_URL = "postgresql://{user}:{password}@{host}:{port}/{database}".format(
    user=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)

# Удалите параметр check_same_thread
engine = create_engine(DATABASE_URL)
metadata = MetaData()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

