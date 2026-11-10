
from datetime import datetime
from math import ceil
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal

from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun
from app.models.execution_log import ExecutionLog
from app.models.error_record import ErrorRecord
from app.models.validation_issue import ValidationIssue
from app.models.validation_rule import ValidationRule


router = APIRouter(
    prefix="/api/v1/processing-runs",
    tags=["Processing Runs"],
)


# ==================================================
# DATABASE DEPENDENCY
# ==================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ==================================================
# STATUS AND LOG LEVEL
# ==================================================

RunStatus = Literal[
    "pending",
    "processing",
    "completed",
    "failed",
]

LogLevel = Literal[
    "INFO",
    "WARNING",
    "ERROR",
    "DEBUG",
]


# ==================================================
# REQUEST SCHEMAS
# ==================================================

class ProcessingRunCreate(BaseModel):
    dataset_id: int = Field(gt=0)


class ProcessingRunPatch(BaseModel):
    status: RunStatus | None = None

    records_processed: int | None = Field(
        default=None,
        ge=0,
    )

    error_message: str | None = None
    completed_at: datetime | None = None

    model_config = ConfigDict(
        extra="forbid"
    )


# ==================================================
# RESPONSE SCHEMAS
# ==================================================

class ProcessingRunResponse(BaseModel):
    id: int
    dataset_id: int
    status: str

    records_processed: int = Field(ge=0)

    total_rules_executed: int = Field(ge=0)
    passed_checks: int = Field(ge=0)
    failed_checks: int = Field(ge=0)

    quality_score: float = Field(
        ge=0,
        le=100,
    )

    error_message: str | None = None

    started_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class ProcessingRunListResponse(BaseModel):
    items: list[ProcessingRunResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================================================
# EXECUTION LOG RESPONSE SCHEMAS
# ==================================================

class ExecutionLogResponse(BaseModel):
    id: int
    run_id: int
    dataset_id: int
    level: str
    stage: str
    message: str
    timestamp: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ExecutionLogListResponse(BaseModel):
    items: list[ExecutionLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================================================
# PROCESSING RUNS SUMMARY
# ERROR MONITORING DASHBOARD
# ==================================================

@router.get("/summary")
def get_processing_runs_summary(
    db: Session = Depends(get_db),
):
    # ----------------------------------------------
    # 1. Processing Run Statistics
    # ----------------------------------------------

    total_runs = (
        db.query(func.count(ProcessingRun.id))
        .scalar()
        or 0
    )

    completed_runs = (
        db.query(func.count(ProcessingRun.id))
        .filter(ProcessingRun.status == "completed")
        .scalar()
        or 0
    )

    failed_runs = (
        db.query(func.count(ProcessingRun.id))
        .filter(ProcessingRun.status == "failed")
        .scalar()
        or 0
    )

    pending_runs = (
        db.query(func.count(ProcessingRun.id))
        .filter(ProcessingRun.status == "pending")
        .scalar()
        or 0
    )

    processing_runs = (
        db.query(func.count(ProcessingRun.id))
        .filter(ProcessingRun.status == "processing")
        .scalar()
        or 0
    )

    # ----------------------------------------------
    # 2. Validation Failure Statistics
    # ----------------------------------------------

    total_validation_failures = (
        db.query(func.count(ValidationIssue.id))
        .scalar()
        or 0
    )

    # ----------------------------------------------
    # 3. Error Severity Distribution
    # ----------------------------------------------

    severity_results = (
        db.query(
            ErrorRecord.severity,
            func.count(ErrorRecord.id),
        )
        .group_by(ErrorRecord.severity)
        .all()
    )

    severity_distribution = {
        "LOW": 0,
        "MEDIUM": 0,
        "HIGH": 0,
        "CRITICAL": 0,
    }

    for severity, count in severity_results:
        severity_key = severity.upper()

        severity_distribution[severity_key] = count

    # ----------------------------------------------
    # 4. Frequent Failing Rules
    # ----------------------------------------------

    rule_results = (
        db.query(
            ValidationRule.id,
            ValidationRule.name,
            func.count(ValidationIssue.id).label(
                "failure_count"
            ),
        )
        .join(
            ValidationIssue,
            ValidationIssue.validation_rule_id
            == ValidationRule.id,
        )
        .group_by(
            ValidationRule.id,
            ValidationRule.name,
        )
        .order_by(
            func.count(ValidationIssue.id).desc()
        )
        .limit(5)
        .all()
    )

    frequent_failing_rules = [
        {
            "rule_id": rule_id,
            "rule_name": rule_name,
            "failure_count": failure_count,
        }
        for rule_id, rule_name, failure_count in rule_results
    ]

    # ----------------------------------------------
    # 5. Recurring Error Datasets
    # ----------------------------------------------

    dataset_results = (
        db.query(
            Dataset.id,
            Dataset.name,
            func.count(ErrorRecord.id).label(
                "error_count"
            ),
        )
        .join(
            ProcessingRun,
            ProcessingRun.dataset_id == Dataset.id,
        )
        .join(
            ErrorRecord,
            ErrorRecord.run_id == ProcessingRun.id,
        )
        .group_by(
            Dataset.id,
            Dataset.name,
        )
        .order_by(
            func.count(ErrorRecord.id).desc()
        )
        .limit(5)
        .all()
    )

    recurring_error_datasets = [
        {
            "dataset_id": dataset_id,
            "dataset_name": dataset_name,
            "error_count": error_count,
        }
        for dataset_id, dataset_name, error_count in dataset_results
    ]

    # ----------------------------------------------
    # 6. Unresolved Errors
    # ----------------------------------------------

    unresolved_errors = (
        db.query(func.count(ErrorRecord.id))
        .filter(
            ErrorRecord.is_resolved.is_(False)
        )
        .scalar()
        or 0
    )

    # ----------------------------------------------
    # 7. Final Response
    # ----------------------------------------------

    return {
        "processing_runs": {
            "total": total_runs,
            "completed": completed_runs,
            "failed": failed_runs,
            "pending": pending_runs,
            "processing": processing_runs,
        },

        "validation": {
            "total_failures": total_validation_failures,
        },

        "error_monitoring": {
            "severity_distribution": severity_distribution,
            "unresolved_errors": unresolved_errors,
            "recurring_error_datasets": recurring_error_datasets,
        },

        "frequent_failing_rules": frequent_failing_rules,
    }


# ==================================================
# GET ALL PROCESSING RUNS
# SEARCH, FILTER AND PAGINATION
# ==================================================

@router.get(
    "",
    response_model=ProcessingRunListResponse,
)
def get_processing_runs(
    page: int = Query(1, ge=1),

    page_size: int = Query(
        10,
        ge=1,
        le=100,
    ),

    search: str | None = Query(
        default=None,
        max_length=200,
    ),

    dataset_id: int | None = Query(
        default=None,
        ge=1,
    ),

    status: RunStatus | None = Query(
        default=None,
    ),

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

    total_pages = (
        ceil(total / page_size)
        if total
        else 0
    )

    runs = (
        query
        .order_by(
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


# ==================================================
# GET FAILED PROCESSING RUNS
# ==================================================

@router.get(
    "/failed",
    response_model=ProcessingRunListResponse,
)
def get_failed_processing_runs(
    page: int = Query(1, ge=1),

    page_size: int = Query(
        10,
        ge=1,
        le=100,
    ),

    db: Session = Depends(get_db),
):
    query = db.query(ProcessingRun).filter(
        ProcessingRun.status == "failed"
    )

    total = query.count()

    total_pages = (
        ceil(total / page_size)
        if total
        else 0
    )

    runs = (
        query
        .order_by(
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


# ==================================================
# GET EXECUTION LOGS BY RUN ID
# SEARCH, FILTER AND PAGINATION
# ==================================================

@router.get(
    "/{run_id}/logs",
    response_model=ExecutionLogListResponse,
)
def get_processing_run_logs(
    run_id: int,

    page: int = Query(1, ge=1),

    page_size: int = Query(
        20,
        ge=1,
        le=100,
    ),

    level: LogLevel | None = Query(
        default=None,
    ),

    search: str | None = Query(
        default=None,
        max_length=200,
    ),

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

    query = db.query(ExecutionLog).filter(
        ExecutionLog.run_id == run_id
    )

    if level is not None:
        query = query.filter(
            ExecutionLog.level == level
        )

    if search and search.strip():
        term = f"%{search.strip()}%"

        query = query.filter(
            or_(
                ExecutionLog.message.ilike(term),
                ExecutionLog.stage.ilike(term),
            )
        )

    total = query.count()

    total_pages = (
        ceil(total / page_size)
        if total
        else 0
    )

    logs = (
        query
        .order_by(
            ExecutionLog.timestamp.desc(),
            ExecutionLog.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ==================================================
# GET PROCESSING RUN BY ID
# ==================================================

@router.get(
    "/{run_id}",
    response_model=ProcessingRunResponse,
)
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


# ==================================================
# CREATE PROCESSING RUN
# ==================================================

@router.post(
    "",
    status_code=201,
    response_model=ProcessingRunResponse,
)
def create_processing_run(
    dataset_id: int = Query(
        ...,
        ge=1,
    ),

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
        total_rules_executed=0,
        passed_checks=0,
        failed_checks=0,
        quality_score=0.0,
    )

    try:
        db.add(run)
        db.commit()
        db.refresh(run)

        return run

    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Could not create processing run",
        )


# ==================================================
# UPDATE PROCESSING RUN
# ==================================================

@router.patch(
    "/{run_id}",
    response_model=ProcessingRunResponse,
)
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

    updates = payload.model_dump(
        exclude_unset=True
    )

    if (
        "status" in updates
        and updates["status"] is None
    ):
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

    if (
        run.status == "completed"
        and "completed_at" not in updates
    ):
        run.completed_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(run)

        return run

    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Could not update processing run",
        )


# ==================================================
# DELETE PROCESSING RUN
# ==================================================

@router.delete(
    "/{run_id}",
    status_code=204,
)
def delete_processing_run(
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

    try:
        db.delete(run)
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Processing run cannot be deleted because related records "
                "or a database constraint prevents deletion."
            ),
        )

    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "A database error occurred while deleting "
                "the processing run."
            ),
        )

    return Response(status_code=204)
