
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.execution_log import ExecutionLog
from app.models.error_record import ErrorRecord


def create_execution_log(
    db: Session,
    run_id: int,
    dataset_id: int,
    level: str,
    stage: str,
    message: str,
):
    allowed_levels = {"INFO", "WARNING", "ERROR", "DEBUG"}

    if level not in allowed_levels:
        raise ValueError("Invalid log level")

    log = ExecutionLog(
        run_id=run_id,
        dataset_id=dataset_id,
        level=level,
        stage=stage,
        message=message,
        timestamp=datetime.utcnow(),
    )

    db.add(log)
    db.flush()

    return log


def create_error_record(
    db: Session,
    run_id: int,
    category: str,
    severity: str,
    message: str,
    stage: str,
    execution_log_id: int | None = None,
):
    allowed_categories = {
        "FILE_PARSING",
        "DATASET_CONFIGURATION",
        "VALIDATION_EXECUTION",
        "DATABASE",
        "SYSTEM",
    }

    allowed_severities = {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    if category not in allowed_categories:
        raise ValueError("Invalid error category")

    if severity not in allowed_severities:
        raise ValueError("Invalid error severity")

    error = ErrorRecord(
        run_id=run_id,
        execution_log_id=execution_log_id,
        category=category,
        severity=severity,
        message=message,
        stage=stage,
        timestamp=datetime.utcnow(),
        is_resolved=False,
    )

    db.add(error)
    db.flush()

    return error
