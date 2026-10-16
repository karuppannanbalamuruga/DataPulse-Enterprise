from datetime import datetime

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


@router.get("")
def get_processing_runs(db: Session = Depends(get_db)):
    return db.query(ProcessingRun).all()


@router.post("", status_code=201)
def create_processing_run(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    new_run = ProcessingRun(
        dataset_id=dataset_id,
        status="pending",
        records_processed=0,
    )

    db.add(new_run)

    try:
        db.commit()
        db.refresh(new_run)
        return new_run
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not create processing run",
        )


@router.put("/{run_id}")
def update_processing_run(
    run_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    processing_run = (
        db.query(ProcessingRun)
        .filter(ProcessingRun.id == run_id)
        .first()
    )

    if not processing_run:
        raise HTTPException(
            status_code=404,
            detail="Processing run not found",
        )

    # Completed runs should not be modified.
    if processing_run.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="A completed processing run cannot be updated",
        )

    if "status" in payload:
        allowed_statuses = {"pending", "processing", "completed", "failed"}
        status = payload["status"]

        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"status must be one of: {', '.join(sorted(allowed_statuses))}",
            )

        processing_run.status = status

    if "records_processed" in payload:
        records_processed = payload["records_processed"]

        if (
            not isinstance(records_processed, int)
            or isinstance(records_processed, bool)
            or records_processed < 0
        ):
            raise HTTPException(
                status_code=400,
                detail="records_processed must be a non-negative integer",
            )

        processing_run.records_processed = records_processed

    if "error_message" in payload:
        processing_run.error_message = payload["error_message"]

    if "completed_at" in payload:
        completed_at = payload["completed_at"]

        if completed_at is None:
            processing_run.completed_at = None
        elif isinstance(completed_at, str):
            try:
                processing_run.completed_at = datetime.fromisoformat(
                    completed_at.replace("Z", "+00:00")
                )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="completed_at must be a valid ISO date-time",
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="completed_at must be a date-time string or null",
            )

    try:
        db.commit()
        db.refresh(processing_run)
        return processing_run
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not update processing run",
        )