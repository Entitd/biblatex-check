from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from sqlalchemy import MetaData

Base = declarative_base()

metadata = MetaData()

class User(Base):
    __tablename__ = 'users'
    id_user = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Examination(Base):
    __tablename__ = 'examinations'
    id_examination = Column(Integer, primary_key=True, index=True)
    id_user = Column(Integer, index=True)
    name_file = Column(String)
    loading_at = Column(DateTime, default=datetime.utcnow)
    number_of_errors = Column(Integer)
    course_compliance = Column(Integer)
    download_link_source = Column(String)
    download_link_edited = Column(String)
    errors = Column(String)

class BlacklistedToken(Base):
    __tablename__ = 'blacklisted_tokens'
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    blacklisted_on = Column(DateTime, default=datetime.utcnow)
