
from math import ceil

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.processing_run import ProcessingRun
from app.models.validation_result import ValidationResult
from app.models.validation_issue import ValidationIssue


router = APIRouter(
    prefix="/api/v1/processing-runs",
    tags=["Validation Results"],
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
# RESPONSE SCHEMAS
# ==================================================

class ValidationResultResponse(BaseModel):
    id: int
    processing_run_id: int
    validation_rule_id: int
    column_name: str
    total_checked: int
    passed_count: int
    failed_count: int
    status: str
    executed_at: object

    model_config = ConfigDict(from_attributes=True)


class ValidationIssueResponse(BaseModel):
    id: int
    processing_run_id: int
    validation_rule_id: int
    row_number: int
    column_name: str
    invalid_value: str | None = None
    error_description: str
    severity: str
    created_at: object

    model_config = ConfigDict(from_attributes=True)


class ValidationResultListResponse(BaseModel):
    items: list[ValidationResultResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ValidationIssueListResponse(BaseModel):
    items: list[ValidationIssueResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================================================
# HELPER FUNCTION
# ==================================================

def check_processing_run(
    run_id: int,
    db: Session,
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
# GET VALIDATION RESULTS
# ==================================================

@router.get(
    "/{run_id}/results",
    response_model=ValidationResultListResponse,
)
def get_validation_results(
    run_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    check_processing_run(run_id, db)

    query = db.query(ValidationResult).filter(
        ValidationResult.processing_run_id == run_id
    )

    if status:
        query = query.filter(
            ValidationResult.status == status
        )

    total = query.count()

    total_pages = (
        ceil(total / page_size)
        if total
        else 0
    )

    results = (
        query
        .order_by(ValidationResult.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ==================================================
# GET VALIDATION ISSUES
# ==================================================

@router.get(
    "/{run_id}/issues",
    response_model=ValidationIssueListResponse,
)
def get_validation_issues(
    run_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    severity: str | None = Query(None),
    db: Session = Depends(get_db),
):
    check_processing_run(run_id, db)

    query = db.query(ValidationIssue).filter(
        ValidationIssue.processing_run_id == run_id
    )

    if severity:
        query = query.filter(
            ValidationIssue.severity == severity
        )

    total = query.count()

    total_pages = (
        ceil(total / page_size)
        if total
        else 0
    )

    issues = (
        query
        .order_by(
            ValidationIssue.row_number.asc(),
            ValidationIssue.id.asc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": issues,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
