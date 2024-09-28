from sqlalchemy import Column, Integer, String, DateTime
from .database import Base

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, index=True)
    upload_date = Column(DateTime)
    errors = Column(Integer)
    course = Column(String)
    download_link = Column(String)
