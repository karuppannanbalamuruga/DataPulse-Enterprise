
from datetime import datetime
from math import ceil
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun


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


RunStatus = Literal["pending", "processing", "completed", "failed"]


class ProcessingRunCreate(BaseModel):
    dataset_id: int = Field(gt=0)


class ProcessingRunPatch(BaseModel):
    status: RunStatus | None = None
    records_processed: int | None = Field(default=None, ge=0)
    error_message: str | None = None
    completed_at: datetime | None = None

    model_config = ConfigDict(extra="forbid")


class ProcessingRunResponse(BaseModel):
    id: int
    dataset_id: int
    status: str
    records_processed: int = Field(ge=0)
    error_message: str | None = None
    started_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProcessingRunListResponse(BaseModel):
    items: list[ProcessingRunResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# GET all processing runs with search, filters and pagination
@router.get("", response_model=ProcessingRunListResponse)
def get_processing_runs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    dataset_id: int | None = Query(default=None, ge=1),
    status: RunStatus | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(ProcessingRun)

    if dataset_id is not None:
        query = query.filter(
            ProcessingRun.dataset_id == dataset_id
        )

    if status is not None:
        query = query.filter(
            ProcessingRun.status == status
        )

    if search and search.strip():
        term = f"%{search.strip()}%"

        query = query.join(
            Dataset,
            ProcessingRun.dataset_id == Dataset.id,
        ).filter(
            or_(
                Dataset.name.ilike(term),
                ProcessingRun.status.ilike(term),
                ProcessingRun.error_message.ilike(term),
            )
        )

    total = query.count()
    total_pages = ceil(total / page_size) if total else 0

    runs = (
        query.order_by(
            ProcessingRun.started_at.desc(),
            ProcessingRun.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": runs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# GET failed processing runs ONLY
# Keep this route before /{run_id}
@router.get("/failed", response_model=ProcessingRunListResponse)
def get_failed_processing_runs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(ProcessingRun).filter(
        ProcessingRun.status == "failed"
    )

    total = query.count()
    total_pages = ceil(total / page_size) if total else 0

    runs = (
        query.order_by(
            ProcessingRun.started_at.desc(),
            ProcessingRun.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": runs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# GET one processing run by ID
@router.get("/{run_id}", response_model=ProcessingRunResponse)
def get_processing_run(
    run_id: int,
    db: Session = Depends(get_db),
):
    run = (
        db.query(ProcessingRun)
        .filter(ProcessingRun.id == run_id)
        .first()
    )

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Processing run not found",
        )

    return run


# CREATE processing run
@router.post("", status_code=201, response_model=ProcessingRunResponse)
def create_processing_run(
    dataset_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if dataset is None:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    run = ProcessingRun(
        dataset_id=dataset_id,
        status="pending",
        records_processed=0,
    )

    try:
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not create processing run",
        )


# UPDATE processing run
@router.patch("/{run_id}", response_model=ProcessingRunResponse)
def patch_processing_run(
    run_id: int,
    payload: ProcessingRunPatch,
    db: Session = Depends(get_db),
):
    run = (
        db.query(ProcessingRun)
        .filter(ProcessingRun.id == run_id)
        .first()
    )

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Processing run not found",
        )

    if run.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="A completed processing run cannot be updated",
        )

    updates = payload.model_dump(exclude_unset=True)

    if "status" in updates and updates["status"] is None:
        raise HTTPException(
            status_code=400,
            detail="status cannot be null",
        )

    if (
        "records_processed" in updates
        and updates["records_processed"] is None
    ):
        raise HTTPException(
            status_code=400,
            detail="records_processed cannot be null",
        )

    for field, value in updates.items():
        setattr(run, field, value)

    if run.status == "completed" and "completed_at" not in updates:
        run.completed_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(run)
        return run

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not update processing run",
        )
