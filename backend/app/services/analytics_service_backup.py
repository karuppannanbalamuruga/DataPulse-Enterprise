
from datetime import date, datetime, time, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun
from app.models.validation_issue import ValidationIssue


# --------------------------------------------------
# 1. ANALYTICS OVERVIEW
# --------------------------------------------------

def get_analytics_overview(db: Session):

    total_datasets = (
        db.query(func.count(Dataset.id)).scalar() or 0
    )

    run_stats = db.query(
        func.count(ProcessingRun.id).label("total_runs"),

        func.sum(
            case(
                (ProcessingRun.status == "completed", 1),
                else_=0,
            )
        ).label("successful_runs"),

        func.sum(
            case(
                (ProcessingRun.status == "failed", 1),
                else_=0,
            )
        ).label("failed_runs"),

        func.avg(
            case(
                (
                    ProcessingRun.status == "completed",
                    ProcessingRun.quality_score,
                ),
                else_=None,
            )
        ).label("overall_quality_score"),

    ).one()

    total_validation_failures = (
        db.query(func.count(ValidationIssue.id)).scalar() or 0
    )

    return {
        "overall_quality_score": round(
            float(run_stats.overall_quality_score or 0), 2
        ),
        "total_datasets": total_datasets,
        "total_processing_runs": run_stats.total_runs or 0,
        "successful_processing_runs": run_stats.successful_runs or 0,
        "failed_processing_runs": run_stats.failed_runs or 0,
        "total_validation_failures": total_validation_failures,
    }


# --------------------------------------------------
# 2. QUALITY TRENDS
# --------------------------------------------------

def get_quality_trends(
    db: Session,
    dataset_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    group_by: str = "daily",
):

    if group_by == "daily":

        period = func.date(
            ProcessingRun.started_at
        )

    elif group_by == "weekly":

        period = func.date_trunc(
            "week",
            ProcessingRun.started_at,
        )

    elif group_by == "monthly":

        period = func.date_trunc(
            "month",
            ProcessingRun.started_at,
        )

    else:

        raise ValueError("Invalid group_by value")

    query = db.query(
        period.label("period"),

        func.avg(
            ProcessingRun.quality_score
        ).label("average_quality_score"),

        func.count(
            ProcessingRun.id
        ).label("total_runs"),

    ).filter(
        ProcessingRun.status == "completed"
    )

    # Dataset filter
    if dataset_id is not None:

        query = query.filter(
            ProcessingRun.dataset_id == dataset_id
        )

    # Start date filter
    if start_date is not None:

        query = query.filter(
            ProcessingRun.started_at
            >= datetime.combine(start_date, time.min)
        )

    # End date filter
    if end_date is not None:

        query = query.filter(
            ProcessingRun.started_at
            < datetime.combine(
                end_date + timedelta(days=1),
                time.min,
            )
        )

    results = (
        query
        .group_by(period)
        .order_by(period.asc())
        .all()
    )

    return [
        {
            "period": (
                row.period.isoformat()
                if hasattr(row.period, "isoformat")
                else str(row.period)
            ),

            "average_quality_score": round(
                float(row.average_quality_score or 0),
                2,
            ),

            "total_runs": row.total_runs or 0,
        }

        for row in results
    ]
