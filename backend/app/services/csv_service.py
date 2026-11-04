
from datetime import datetime

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


def execute_csv_validation(
    db: Session,
    dataset_id: int,
    file_path: str,
    rule_ids: list[int] | None = None,
):
    run = None

    try:
        # 1. Check dataset
        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id
        ).first()

        if not dataset:
            raise ValueError("Dataset not found")

        # 2. Create processing run
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

        # 3. Process CSV
        csv_data = process_csv(file_path)
        rows = csv_data["rows"]

        run.records_processed = csv_data["total_rows"]

        # 4. Fetch active validation rules
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

        # 5. Validate requested rule IDs
        if rule_ids is not None:
            if len(rules) != len(rule_ids):
                raise ValueError(
                    "One or more rules are invalid, inactive, "
                    "or belong to another dataset"
                )

        # 6. Execute validation rules
        output = execute_validation_rules(
            rows,
            rules
        )

        # 7. Save validation results
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

        # 8. Save validation issues
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

        # 9. Calculate executed rules count
        run.total_rules_executed = sum(
            1
            for result in output["results"]
            if result["status"] == "completed"
        )

        # 10. Calculate passed and failed checks
        run.passed_checks = sum(
            result["passed_count"]
            for result in output["results"]
        )

        run.failed_checks = sum(
            result["failed_count"]
            for result in output["results"]
        )

        # 11. Calculate quality score
        run.quality_score = calculate_quality_score(
            output["results"]
        )

        # 12. Complete processing run
        run.status = "completed"
        run.completed_at = datetime.utcnow()

        # 13. Commit database transaction
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

        # Record failed processing run
        if run is not None:
            failed_run = db.query(ProcessingRun).filter(
                ProcessingRun.id == run.id
            ).first()

            if failed_run:
                failed_run.status = "failed"
                failed_run.error_message = str(exc)
                failed_run.completed_at = datetime.utcnow()
                db.commit()

        raise
