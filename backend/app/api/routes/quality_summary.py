
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun


router = APIRouter(
    prefix="/api/v1/datasets",
    tags=["Quality Summary"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{dataset_id}/quality-summary")
def get_dataset_quality_summary(
    dataset_id: int,
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

    runs = (
        db.query(ProcessingRun)
        .filter(
            ProcessingRun.dataset_id == dataset_id,
            ProcessingRun.status == "completed",
        )
        .order_by(
            ProcessingRun.started_at.desc(),
            ProcessingRun.id.desc(),
        )
        .all()
    )

    if not runs:
        return {
            "dataset_id": dataset_id,
            "dataset_name": dataset.name,
            "total_processing_runs": 0,
            "total_records_processed": 0,
            "total_rules_executed": 0,
            "total_passed_checks": 0,
            "total_failed_checks": 0,
            "quality_score": 0.0,
            "latest_run": None,
        }

    total_records = sum(
        run.records_processed or 0
        for run in runs
    )

    total_rules = sum(
        run.total_rules_executed or 0
        for run in runs
    )

    total_passed = sum(
        run.passed_checks or 0
        for run in runs
    )

    total_failed = sum(
        run.failed_checks or 0
        for run in runs
    )

    total_checks = total_passed + total_failed

    quality_score = (
        round((total_passed / total_checks) * 100, 2)
        if total_checks > 0
        else 0.0
    )

    latest_run = runs[0]

    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset.name,
        "total_processing_runs": len(runs),
        "total_records_processed": total_records,
        "total_rules_executed": total_rules,
        "total_passed_checks": total_passed,
        "total_failed_checks": total_failed,
        "quality_score": quality_score,
        "latest_run": {
            "processing_run_id": latest_run.id,
            "status": latest_run.status,
            "records_processed": latest_run.records_processed,
            "total_rules_executed": latest_run.total_rules_executed,
            "passed_checks": latest_run.passed_checks,
            "failed_checks": latest_run.failed_checks,
            "quality_score": latest_run.quality_score,
            "started_at": latest_run.started_at,
            "completed_at": latest_run.completed_at,
        },
    }
