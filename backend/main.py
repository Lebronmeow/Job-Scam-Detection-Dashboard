from fastapi import FastAPI, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Optional
from sse_starlette.sse import EventSourceResponse

import models
import schemas
from database import engine, get_db
from notification import manager
from cv_generator import generate_cv

# Try to import the injector script for remote execution
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from inject_real_data import inject
except ImportError:
    inject = None

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShieldDB API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/jobs", response_model=List[schemas.JobOut])
def get_jobs(
    role: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get jobs with eager-loaded scores. Sorted by scam score (safest first)."""
    query = (
        db.query(models.Job)
        .options(joinedload(models.Job.score))  # Eager load scores in 1 query
        .outerjoin(models.Score)                 # JOIN for ORDER BY
    )
    if role:
        query = query.filter(models.Job.role == role)
    if location:
        query = query.filter(models.Job.location == location)
    # Sort in SQL: jobs with no score go last (treated as 100)
    query = query.order_by(
        case((models.Score.final_score == None, 100), else_=models.Score.final_score).asc()
    )
    jobs = query.offset(offset).limit(limit).all()
    return jobs

@app.get("/api/roles")
def get_roles(db: Session = Depends(get_db)):
    """Get all available roles in the database."""
    roles = db.query(models.Job.role).distinct().all()
    return [r[0] for r in roles if r[0]]

@app.get("/api/locations")
def get_locations(db: Session = Depends(get_db)):
    """Get all available locations in the database."""
    locations = db.query(models.Job.location).distinct().all()
    return sorted([loc[0] for loc in locations if loc[0]])

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """Quick stats for the dashboard."""
    total = db.query(models.Job).count()
    safe = db.query(models.Job).join(models.Score).filter(models.Score.final_score < 31).count()
    caution = db.query(models.Job).join(models.Score).filter(models.Score.final_score >= 31, models.Score.final_score < 61).count()
    risky = db.query(models.Job).join(models.Score).filter(models.Score.final_score >= 61).count()
    return {"total": total, "safe": safe, "caution": caution, "risky": risky}

@app.get("/api/seed")
def seed_database():
    """Trigger the real-data injection script remotely."""
    if inject:
        # Run the injection synchronously
        inject()
        return {"status": "success", "message": "Database seeded successfully with 3 real-world jobs."}
    else:
        raise HTTPException(status_code=500, detail="Injection script not found or could not be loaded.")

@app.get("/api/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# --- Global Exception Handler (Error Handling) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Let HTTPExceptions pass through with their proper status codes
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    # Log the actual error for debugging
    import traceback
    traceback.print_exc()
    # Only catch truly unexpected errors
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later.", "type": str(type(exc).__name__)}
    )

# --- Notifications (SSE) ---
@app.get("/api/notifications/stream")
async def notification_stream():
    """Subscribe to events (e.g. new jobs added) via Server-Sent Events."""
    return EventSourceResponse(manager.get_generator())

@app.post("/api/notifications/publish", status_code=202)
def publish_notification(payload: dict, db: Session = Depends(get_db)):
    """Internal endpoint to publish events from scripts."""
    # Could protect this with an internal api key instead
    manager.publish(payload)
    return {"status": "published"}

# --- CV Generation ---
@app.post("/api/cv/generate")
def generate_tailored_cv(payload: dict, db: Session = Depends(get_db)):
    """Generate a tailored CV for a specific job posting."""
    job_id = payload.get("job_id")
    user_profile = payload.get("user_profile", {})
    
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")
    if not user_profile.get("name"):
        raise HTTPException(status_code=400, detail="User name is required")
    
    # Fetch the job from database
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = {
        "title": db_job.title,
        "company": db_job.company,
        "description": db_job.description or "",
        "role": db_job.role or "",
        "location": db_job.location or ""
    }
    
    try:
        cv = generate_cv(user_profile, job_data)
        return {"status": "success", "cv": cv}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"CV generation failed: {str(e)}")

@app.post("/api/cv/parse-pdf")
async def parse_pdf_cv(file: UploadFile = File(...)):
    """Extract text from an uploaded PDF file."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        import io
        from PyPDF2 import PdfReader
        
        contents = await file.read()
        reader = PdfReader(io.BytesIO(contents))
        
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        
        full_text = "\n".join(text_parts).strip()
        
        if not full_text:
            raise HTTPException(status_code=422, detail="Could not extract text from PDF. The file may be image-based or empty.")
        
        return {"status": "success", "text": full_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")
