
import csv
from datetime import datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun
from app.models.validation_rule import ValidationRule
from app.models.validation_result import ValidationResult
from app.models.validation_issue import ValidationIssue

from app.services.csv_processor import process_csv
from app.services.validation_engine import (
    execute_validation_rules,
    calculate_quality_score,
)
from app.services.monitoring_service import (
    create_execution_log,
    create_error_record,
)


def classify_error(exc, stage):
    if isinstance(exc, SQLAlchemyError):
        return "DATABASE", "CRITICAL", "Database operation failed"

    if isinstance(exc, (FileNotFoundError, UnicodeDecodeError, csv.Error)):
        return "FILE_PARSING", "HIGH", "CSV file processing failed"

    if isinstance(exc, ValueError):
        if stage == "VALIDATION_EXECUTION":
            return (
                "VALIDATION_EXECUTION",
                "HIGH",
                "Validation execution failed",
            )

        return (
            "DATASET_CONFIGURATION",
            "MEDIUM",
            "Dataset or execution configuration is invalid",
        )

    return "SYSTEM", "CRITICAL", "Unexpected processing error"


def execute_csv_validation(
    db: Session,
    dataset_id: int,
    file_path: str,
    rule_ids: list[int] | None = None,
):
    run = None
    stage = "RUN_START"

    try:
        dataset = (
            db.query(Dataset)
            .filter(Dataset.id == dataset_id)
            .first()
        )

        if not dataset:
            raise ValueError("Dataset not found")

        run = ProcessingRun(
            dataset_id=dataset_id,
            status="processing",
            records_processed=0,
            total_rules_executed=0,
            passed_checks=0,
            failed_checks=0,
            quality_score=0.0,
            started_at=datetime.utcnow(),
        )

        db.add(run)
        db.flush()

        create_execution_log(
            db,
            run.id,
            dataset_id,
            "INFO",
            "RUN_START",
            "Processing run started",
        )

        # Commit the run separately so failures can be recorded.
        db.commit()
        db.refresh(run)

        stage = "CSV_PROCESSING"

        create_execution_log(
            db,
            run.id,
            dataset_id,
            "INFO",
            stage,
            "CSV processing started",
        )
        db.commit()

        csv_data = process_csv(file_path)
        rows = csv_data["rows"]

        run.records_processed = csv_data["total_rows"]

        stage = "RULE_LOADING"

        query = db.query(ValidationRule).filter(
            ValidationRule.dataset_id == dataset_id,
            ValidationRule.is_active.is_(True),
        )

        if rule_ids is not None:
            if not rule_ids:
                raise ValueError("At least one rule ID is required")

            if len(rule_ids) != len(set(rule_ids)):
                raise ValueError("Duplicate rule IDs are not allowed")

            query = query.filter(
                ValidationRule.id.in_(rule_ids)
            )

        rules = query.all()

        if rule_ids is not None and len(rules) != len(rule_ids):
            raise ValueError(
                "One or more rules are invalid, inactive, "
                "or belong to another dataset"
            )

        stage = "VALIDATION_EXECUTION"

        create_execution_log(
            db,
            run.id,
            dataset_id,
            "INFO",
            stage,
            "Validation execution started",
        )

        output = execute_validation_rules(rows, rules)

        for result in output["results"]:
            db.add(
                ValidationResult(
                    processing_run_id=run.id,
                    validation_rule_id=result["rule_id"],
                    column_name=result["column_name"] or "unknown",
                    total_checked=result["total_checked"],
                    passed_count=result["passed_count"],
                    failed_count=result["failed_count"],
                    status=result["status"],
                )
            )

        for issue in output["issues"]:
            db.add(
                ValidationIssue(
                    processing_run_id=run.id,
                    validation_rule_id=issue["rule_id"],
                    row_number=issue["row_number"],
                    column_name=issue["column_name"],
                    invalid_value=issue["invalid_value"],
                    error_description=issue["error_description"],
                    severity="error",
                )
            )

        run.total_rules_executed = sum(
            1
            for result in output["results"]
            if result["status"] == "completed"
        )

        run.passed_checks = sum(
            result["passed_count"]
            for result in output["results"]
        )

        run.failed_checks = sum(
            result["failed_count"]
            for result in output["results"]
        )

        run.quality_score = calculate_quality_score(
            output["results"]
        )

        if run.failed_checks > 0:
            create_execution_log(
                db,
                run.id,
                dataset_id,
                "WARNING",
                "VALIDATION_RESULTS",
                f"Validation completed with {run.failed_checks} failed checks",
            )

        stage = "RUN_COMPLETION"

        run.status = "completed"
        run.completed_at = datetime.utcnow()

        create_execution_log(
            db,
            run.id,
            dataset_id,
            "INFO",
            stage,
            "Processing run completed successfully",
        )

        db.commit()
        db.refresh(run)

        return {
            "processing_run_id": run.id,
            "dataset_id": dataset_id,
            "status": run.status,
            "records_processed": run.records_processed,
            "total_rules_executed": run.total_rules_executed,
            "passed_checks": run.passed_checks,
            "failed_checks": run.failed_checks,
            "quality_score": run.quality_score,
            "results": output["results"],
            "issues": output["issues"],
        }

    except Exception as exc:
        db.rollback()

        if run is not None and run.id is not None:
            try:
                failed_run = (
                    db.query(ProcessingRun)
                    .filter(ProcessingRun.id == run.id)
                    .first()
                )

                if failed_run:
                    category, severity, safe_message = classify_error(
                        exc,
                        stage,
                    )

                    failed_run.status = "failed"
                    failed_run.error_message = safe_message
                    failed_run.completed_at = datetime.utcnow()

                    error_log = create_execution_log(
                        db,
                        failed_run.id,
                        dataset_id,
                        "ERROR",
                        stage,
                        safe_message,
                    )

                    create_error_record(
                        db,
                        failed_run.id,
                        category,
                        severity,
                        safe_message,
                        stage,
                        execution_log_id=error_log.id,
                    )

                    db.commit()

            except Exception:
                db.rollback()

        raise
