
import csv
from io import StringIO
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset

from app.services.analytics_service import (
    get_analytics_overview,
    get_quality_trends,
    get_dataset_comparison,
    get_validation_performance,
    get_processing_trends,
    get_analytics_export,
)


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# 1. ANALYTICS OVERVIEW
# ============================================================

@router.get("/overview")
def analytics_overview(
    db: Session = Depends(get_db),
):

    return get_analytics_overview(db)


# ============================================================
# 2. QUALITY TRENDS
# ============================================================

@router.get("/quality-trends")
def quality_trends(
    dataset_id: int | None = Query(default=None, gt=0),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    group_by: Literal["daily", "weekly", "monthly"] = Query(
        default="daily"
    ),
    db: Session = Depends(get_db),
):

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    if dataset_id is not None:

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

    return get_quality_trends(
        db=db,
        dataset_id=dataset_id,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )


# ============================================================
# 3. DATASET COMPARISON
# ============================================================

@router.get("/dataset-comparison")
def dataset_comparison(
    dataset_ids: list[int] = Query(..., min_length=2),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
):

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    if len(dataset_ids) != len(set(dataset_ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate dataset IDs are not allowed",
        )

    existing_ids = {
        item[0]
        for item in (
            db.query(Dataset.id)
            .filter(Dataset.id.in_(dataset_ids))
            .all()
        )
    }

    missing_ids = sorted(set(dataset_ids) - existing_ids)

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "One or more datasets were not found",
                "missing_dataset_ids": missing_ids,
            },
        )

    items = get_dataset_comparison(
        db=db,
        dataset_ids=dataset_ids,
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "dataset_count": len(items),
        "start_date": start_date,
        "end_date": end_date,
        "items": items,
    }


# ============================================================
# 4. VALIDATION PERFORMANCE
# ============================================================

@router.get("/validation-performance")
def validation_performance(
    dataset_id: int | None = Query(default=None, gt=0),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    rule_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    if dataset_id is not None:

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

    return get_validation_performance(
        db=db,
        dataset_id=dataset_id,
        start_date=start_date,
        end_date=end_date,
        rule_type=rule_type,
    )


# ============================================================
# 5. PROCESSING TRENDS
# ============================================================

@router.get("/processing-trends")
def processing_trends(
    dataset_id: int | None = Query(default=None, gt=0),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    group_by: Literal["daily", "weekly", "monthly"] = Query(
        default="daily"
    ),
    db: Session = Depends(get_db),
):

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    if dataset_id is not None:

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

    return get_processing_trends(
        db=db,
        dataset_id=dataset_id,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )


# ============================================================
# 6. ANALYTICS CSV EXPORT
# ============================================================

@router.get("/export")
def analytics_export(
    dataset_id: int | None = Query(default=None, gt=0),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    status: Literal["completed", "failed"] | None = Query(
        default=None
    ),
    db: Session = Depends(get_db),
):

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    if dataset_id is not None:

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

    export_data = get_analytics_export(
        db=db,
        dataset_id=dataset_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )

    output = StringIO()

    fieldnames = [
        "run_id",
        "dataset_id",
        "dataset_name",
        "status",
        "records_processed",
        "total_rules_executed",
        "passed_checks",
        "failed_checks",
        "quality_score",
        "error_message",
        "started_at",
        "completed_at",
    ]

    writer = csv.DictWriter(
        output,
        fieldnames=fieldnames,
    )

    writer.writeheader()
    writer.writerows(export_data)

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                'attachment; filename="datapulse_analytics.csv"'
        },
    )
