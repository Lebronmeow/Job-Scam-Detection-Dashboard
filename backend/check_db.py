from database import SessionLocal
from models import Job
import sys
try:
    db = SessionLocal()
    print("Jobs count:", db.query(Job).count())
except Exception as e:
    print("Error:", e)
