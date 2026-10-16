
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.processing_run import ProcessingRun
from app.models.dataset import Dataset

router = APIRouter(
    prefix="/api/v1/processing-runs",
    tags=["Processing Runs"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# GET: Retrieve all processing runs
@router.get("")
def get_processing_runs(db: Session = Depends(get_db)):
    return db.query(ProcessingRun).all()


# POST: Create a new processing run
@router.post("")
def create_processing_run(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    # Check whether the dataset exists
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    # New Processing Run
    new_run = ProcessingRun(
        dataset_id=dataset_id,
        status="pending",
        records_processed=0,
    )

    db.add(new_run)
    db.commit()
    db.refresh(new_run)

    return new_run
