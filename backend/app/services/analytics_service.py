
from datetime import date, datetime, time, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun
from app.models.validation_issue import ValidationIssue
from app.models.validation_result import ValidationResult
from app.models.validation_rule import ValidationRule


# ============================================================
# 1. ANALYTICS OVERVIEW
# ============================================================

def get_analytics_overview(db: Session):

    total_datasets = (
        db.query(func.count(Dataset.id)).scalar() or 0
    )

    total_runs = (
        db.query(func.count(ProcessingRun.id)).scalar() or 0
    )

    successful_runs = (
        db.query(func.count(ProcessingRun.id))
        .filter(ProcessingRun.status == "completed")
        .scalar() or 0
    )

    failed_runs = (
        db.query(func.count(ProcessingRun.id))
        .filter(ProcessingRun.status == "failed")
        .scalar() or 0
    )

    average_quality = (
        db.query(func.avg(ProcessingRun.quality_score))
        .filter(ProcessingRun.status == "completed")
        .scalar()
    )

    total_validation_failures = (
        db.query(func.count(ValidationIssue.id)).scalar() or 0
    )

    return {
        "overall_quality_score": round(float(average_quality or 0), 2),
        "total_datasets": total_datasets,
        "total_processing_runs": total_runs,
        "successful_processing_runs": successful_runs,
        "failed_processing_runs": failed_runs,
        "total_validation_failures": total_validation_failures,
    }


# ============================================================
# 2. QUALITY TRENDS
# ============================================================

def get_quality_trends(
    db: Session,
    dataset_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    group_by: str = "daily",
):

    if group_by == "weekly":
        period_column = func.date_trunc(
            "week", ProcessingRun.started_at
        )
    elif group_by == "monthly":
        period_column = func.date_trunc(
            "month", ProcessingRun.started_at
        )
    else:
        period_column = func.date(ProcessingRun.started_at)

    query = db.query(
        period_column.label("period"),
        func.avg(ProcessingRun.quality_score).label(
            "average_quality_score"
        ),
        func.count(ProcessingRun.id).label("total_runs"),
    ).filter(
        ProcessingRun.status == "completed"
    )

    if dataset_id is not None:
        query = query.filter(
            ProcessingRun.dataset_id == dataset_id
        )

    if start_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            >= datetime.combine(start_date, time.min)
        )

    if end_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            < datetime.combine(end_date + timedelta(days=1), time.min)
        )

    results = (
        query.group_by(period_column)
        .order_by(period_column.asc())
        .all()
    )

    return [
        {
            "period": (
                item.period.isoformat()
                if hasattr(item.period, "isoformat")
                else str(item.period)
            ),
            "average_quality_score": round(
                float(item.average_quality_score or 0), 2
            ),
            "total_runs": item.total_runs,
        }
        for item in results
    ]


# ============================================================
# 3. DATASET COMPARISON
# ============================================================

def get_dataset_comparison(
    db: Session,
    dataset_ids: list[int],
    start_date: date | None = None,
    end_date: date | None = None,
):

    if not dataset_ids:
        return []

    start_dt = (
        datetime.combine(start_date, time.min)
        if start_date else None
    )

    end_dt = (
        datetime.combine(end_date + timedelta(days=1), time.min)
        if end_date else None
    )

    # Processing run statistics

    run_query = db.query(
        ProcessingRun.dataset_id.label("dataset_id"),
        func.count(ProcessingRun.id).label("total_runs"),
        func.avg(
            case(
                (
                    ProcessingRun.status == "completed",
                    ProcessingRun.quality_score,
                ),
                else_=None,
            )
        ).label("average_quality_score"),
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
    ).filter(
        ProcessingRun.dataset_id.in_(dataset_ids)
    )

    if start_dt:
        run_query = run_query.filter(
            ProcessingRun.started_at >= start_dt
        )

    if end_dt:
        run_query = run_query.filter(
            ProcessingRun.started_at < end_dt
        )

    run_stats = (
        run_query.group_by(ProcessingRun.dataset_id)
        .subquery()
    )

    # Validation issue statistics

    issue_query = (
        db.query(
            ProcessingRun.dataset_id.label("dataset_id"),
            func.count(ValidationIssue.id).label(
                "total_validation_failures"
            ),
        )
        .join(
            ValidationIssue,
            ValidationIssue.processing_run_id == ProcessingRun.id,
        )
        .filter(
            ProcessingRun.dataset_id.in_(dataset_ids)
        )
    )

    if start_dt:
        issue_query = issue_query.filter(
            ProcessingRun.started_at >= start_dt
        )

    if end_dt:
        issue_query = issue_query.filter(
            ProcessingRun.started_at < end_dt
        )

    issue_stats = (
        issue_query.group_by(ProcessingRun.dataset_id)
        .subquery()
    )

    # Dataset comparison

    datasets = (
        db.query(
            Dataset.id,
            Dataset.name,
            run_stats.c.total_runs,
            run_stats.c.average_quality_score,
            run_stats.c.successful_runs,
            run_stats.c.failed_runs,
            issue_stats.c.total_validation_failures,
        )
        .outerjoin(
            run_stats,
            Dataset.id == run_stats.c.dataset_id,
        )
        .outerjoin(
            issue_stats,
            Dataset.id == issue_stats.c.dataset_id,
        )
        .filter(
            Dataset.id.in_(dataset_ids)
        )
        .all()
    )

    # Frequently failing rules

    rule_query = (
        db.query(
            ValidationRule.dataset_id,
            ValidationRule.id,
            ValidationRule.name,
            ValidationRule.rule_type,
            func.sum(ValidationResult.failed_count).label(
                "failure_count"
            ),
            func.sum(ValidationResult.total_checked).label(
                "total_checked"
            ),
        )
        .join(
            ValidationResult,
            ValidationResult.validation_rule_id == ValidationRule.id,
        )
        .join(
            ProcessingRun,
            ProcessingRun.id == ValidationResult.processing_run_id,
        )
        .filter(
            ValidationRule.dataset_id.in_(dataset_ids)
        )
    )

    if start_dt:
        rule_query = rule_query.filter(
            ProcessingRun.started_at >= start_dt
        )

    if end_dt:
        rule_query = rule_query.filter(
            ProcessingRun.started_at < end_dt
        )

    rule_results = (
        rule_query.group_by(
            ValidationRule.dataset_id,
            ValidationRule.id,
            ValidationRule.name,
            ValidationRule.rule_type,
        )
        .all()
    )

    rules_by_dataset = {}

    for rule in rule_results:

        failure_count = int(rule.failure_count or 0)
        total_checked = int(rule.total_checked or 0)

        failure_percentage = (
            round(failure_count / total_checked * 100, 2)
            if total_checked > 0 else 0
        )

        rules_by_dataset.setdefault(
            rule.dataset_id, []
        ).append({
            "rule_id": rule.id,
            "rule_name": rule.name,
            "rule_type": rule.rule_type,
            "failure_count": failure_count,
            "failure_percentage": failure_percentage,
        })

    response = []

    for item in datasets:

        total_runs = int(item.total_runs or 0)
        successful_runs = int(item.successful_runs or 0)
        failed_runs = int(item.failed_runs or 0)

        success_rate = (
            round(successful_runs / total_runs * 100, 2)
            if total_runs > 0 else 0
        )

        frequently_failing_rules = sorted(
            rules_by_dataset.get(item.id, []),
            key=lambda rule: rule["failure_count"],
            reverse=True,
        )[:5]

        response.append({
            "dataset_id": item.id,
            "dataset_name": item.name,
            "average_quality_score": round(
                float(item.average_quality_score or 0), 2
            ),
            "total_processing_runs": total_runs,
            "total_validation_failures": int(
                item.total_validation_failures or 0
            ),
            "successful_runs": successful_runs,
            "failed_runs": failed_runs,
            "success_rate": success_rate,
            "frequently_failing_rules": frequently_failing_rules,
        })

    return response


# ============================================================
# 4. VALIDATION PERFORMANCE
# ============================================================

def get_validation_performance(
    db: Session,
    dataset_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    rule_type: str | None = None,
):

    query = (
        db.query(
            ValidationRule.id.label("rule_id"),
            ValidationRule.name.label("rule_name"),
            ValidationRule.rule_type.label("rule_type"),
            Dataset.id.label("dataset_id"),
            Dataset.name.label("dataset_name"),
            func.sum(ValidationResult.failed_count).label(
                "failure_count"
            ),
            func.sum(ValidationResult.total_checked).label(
                "total_checked"
            ),
        )
        .join(
            Dataset,
            Dataset.id == ValidationRule.dataset_id,
        )
        .join(
            ValidationResult,
            ValidationResult.validation_rule_id == ValidationRule.id,
        )
        .join(
            ProcessingRun,
            ProcessingRun.id == ValidationResult.processing_run_id,
        )
    )

    if dataset_id is not None:
        query = query.filter(
            ValidationRule.dataset_id == dataset_id
        )

    if start_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            >= datetime.combine(start_date, time.min)
        )

    if end_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            < datetime.combine(end_date + timedelta(days=1), time.min)
        )

    if rule_type is not None:
        query = query.filter(
            ValidationRule.rule_type == rule_type
        )

    results = (
        query.group_by(
            ValidationRule.id,
            ValidationRule.name,
            ValidationRule.rule_type,
            Dataset.id,
            Dataset.name,
        )
        .order_by(
            func.sum(ValidationResult.failed_count).desc()
        )
        .all()
    )

    response = []

    for item in results:

        failure_count = int(item.failure_count or 0)
        total_checked = int(item.total_checked or 0)

        failure_percentage = (
            round(failure_count / total_checked * 100, 2)
            if total_checked > 0 else 0
        )

        response.append({
            "rule_id": item.rule_id,
            "rule_name": item.rule_name,
            "rule_type": item.rule_type,
            "dataset_id": item.dataset_id,
            "dataset_name": item.dataset_name,
            "failure_count": failure_count,
            "total_checked": total_checked,
            "failure_percentage": failure_percentage,
        })

    return response


# ============================================================
# 5. PROCESSING TRENDS
# ============================================================

def get_processing_trends(
    db: Session,
    dataset_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    group_by: str = "daily",
):

    if group_by == "weekly":
        period_column = func.date_trunc(
            "week", ProcessingRun.started_at
        )

    elif group_by == "monthly":
        period_column = func.date_trunc(
            "month", ProcessingRun.started_at
        )

    else:
        period_column = func.date(ProcessingRun.started_at)

    query = db.query(
        period_column.label("period"),
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
    )

    if dataset_id is not None:
        query = query.filter(
            ProcessingRun.dataset_id == dataset_id
        )

    if start_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            >= datetime.combine(start_date, time.min)
        )

    if end_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            < datetime.combine(end_date + timedelta(days=1), time.min)
        )

    results = (
        query.group_by(period_column)
        .order_by(period_column.asc())
        .all()
    )

    return [
        {
            "period": (
                item.period.isoformat()
                if hasattr(item.period, "isoformat")
                else str(item.period)
            ),
            "total_runs": int(item.total_runs or 0),
            "successful_runs": int(item.successful_runs or 0),
            "failed_runs": int(item.failed_runs or 0),
        }
        for item in results
    ]


# ============================================================
# 6. ANALYTICS CSV EXPORT
# ============================================================

def get_analytics_export(
    db: Session,
    dataset_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    status: str | None = None,
):

    query = (
        db.query(
            ProcessingRun,
            Dataset.name.label("dataset_name"),
        )
        .outerjoin(
            Dataset,
            Dataset.id == ProcessingRun.dataset_id,
        )
    )

    if dataset_id is not None:
        query = query.filter(
            ProcessingRun.dataset_id == dataset_id
        )

    if start_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            >= datetime.combine(start_date, time.min)
        )

    if end_date is not None:
        query = query.filter(
            ProcessingRun.started_at
            < datetime.combine(end_date + timedelta(days=1), time.min)
        )

    if status is not None:
        query = query.filter(
            ProcessingRun.status == status
        )

    results = (
        query.order_by(ProcessingRun.started_at.desc())
        .all()
    )

    export_data = []

    for run, dataset_name in results:

        export_data.append({
            "run_id": run.id,
            "dataset_id": run.dataset_id,
            "dataset_name": dataset_name or "",
            "status": run.status,
            "records_processed": run.records_processed,
            "total_rules_executed": run.total_rules_executed,
            "passed_checks": run.passed_checks,
            "failed_checks": run.failed_checks,
            "quality_score": run.quality_score,
            "error_message": run.error_message or "",
            "started_at": (
                run.started_at.isoformat()
                if run.started_at else ""
            ),
            "completed_at": (
                run.completed_at.isoformat()
                if run.completed_at else ""
            ),
        })

    return export_data
