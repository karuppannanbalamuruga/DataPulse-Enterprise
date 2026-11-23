
from datetime import datetime
from typing import Any

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.alert_rule import AlertRule
from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun
from app.models.validation_result import ValidationResult
from app.services.notification_service import (
    create_in_app_notifications_for_alert,
)


SUPPORTED_CONDITIONS = {
    "quality_score_threshold",
    "processing_failure",
    "validation_failure_threshold",
    "quality_score_decline",
    "recurring_validation_failures",
}


def get_configuration_value(
    configuration: dict[str, Any],
    key: str,
    default: Any = None,
):
    return configuration.get(key, default)


def get_event_key(
    rule_id: int,
    dataset_id: int,
    event_type: str,
    event_reference: str,
) -> str:
    return (
        f"rule:{rule_id}:dataset:{dataset_id}:"
        f"{event_type}:{event_reference}"
    )


def create_alert(
    db: Session,
    rule: AlertRule,
    dataset_id: int,
    processing_run_id: int | None,
    event_key: str,
    title: str,
    description: str,
    observed_value: dict,
    configured_threshold: dict,
) -> Alert | None:
    """
    Create an alert and its in-app notifications.

    Uses a nested transaction to protect the outer transaction
    when a duplicate event_key is encountered.
    """

    existing = (
        db.query(Alert)
        .filter(Alert.event_key == event_key)
        .first()
    )

    if existing:
        return None

    alert = Alert(
        alert_rule_id=rule.id,
        dataset_id=dataset_id,
        processing_run_id=processing_run_id,
        event_key=event_key,
        title=title,
        description=description,
        severity=rule.severity,
        observed_value=observed_value,
        configured_threshold=configured_threshold,
        status="open",
        triggered_at=datetime.utcnow(),
    )

    try:
        with db.begin_nested():
            db.add(alert)
            db.flush()

    except IntegrityError:
        # Another process already created this alert.
        return None

    # Create notifications only after a new alert is inserted.
    create_in_app_notifications_for_alert(
        db=db,
        alert=alert,
    )

    return alert


def get_enabled_rules(
    db: Session,
    dataset: Dataset,
):
    return (
        db.query(AlertRule)
        .filter(
            AlertRule.organization_id == dataset.organization_id,
            AlertRule.is_enabled.is_(True),
        )
        .filter(
            (AlertRule.dataset_id == dataset.id)
            | (AlertRule.dataset_id.is_(None))
        )
        .all()
    )


def evaluate_quality_score_threshold(
    db: Session,
    rule: AlertRule,
    run: ProcessingRun,
):
    config = rule.configuration or {}

    threshold = get_configuration_value(
        config,
        "threshold",
    )

    operator = get_configuration_value(
        config,
        "operator",
        "below",
    )

    if (
        isinstance(threshold, bool)
        or not isinstance(threshold, (int, float))
        or operator not in {"below", "above"}
    ):
        return None

    score = run.quality_score

    if score is None:
        return None

    triggered = (
        score < threshold
        if operator == "below"
        else score > threshold
    )

    if not triggered:
        return None

    event_key = get_event_key(
        rule.id,
        run.dataset_id,
        "quality_score_threshold",
        str(run.id),
    )

    return create_alert(
        db=db,
        rule=rule,
        dataset_id=run.dataset_id,
        processing_run_id=run.id,
        event_key=event_key,
        title="Data Quality Score Threshold Alert",
        description=(
            f"Dataset quality score is {score}, "
            f"which violates the configured threshold {threshold}."
        ),
        observed_value={"quality_score": score},
        configured_threshold={
            "threshold": threshold,
            "operator": operator,
        },
    )


def evaluate_processing_failure(
    db: Session,
    rule: AlertRule,
    run: ProcessingRun,
):
    if run.status != "failed":
        return None

    event_key = get_event_key(
        rule.id,
        run.dataset_id,
        "processing_failure",
        str(run.id),
    )

    return create_alert(
        db=db,
        rule=rule,
        dataset_id=run.dataset_id,
        processing_run_id=run.id,
        event_key=event_key,
        title="Processing Failure Alert",
        description=(
            f"Processing run {run.id} failed. "
            f"Error: {run.error_message or 'Unknown error'}"
        ),
        observed_value={
            "status": run.status,
            "error_message": run.error_message,
        },
        configured_threshold={"status": "failed"},
    )


def evaluate_validation_failure_threshold(
    db: Session,
    rule: AlertRule,
    run: ProcessingRun,
):
    config = rule.configuration or {}

    threshold = get_configuration_value(
        config,
        "threshold",
    )

    if (
        isinstance(threshold, bool)
        or not isinstance(threshold, int)
        or threshold < 0
    ):
        return None

    failed_count = run.failed_checks

    if failed_count <= threshold:
        return None

    event_key = get_event_key(
        rule.id,
        run.dataset_id,
        "validation_failure_threshold",
        str(run.id),
    )

    return create_alert(
        db=db,
        rule=rule,
        dataset_id=run.dataset_id,
        processing_run_id=run.id,
        event_key=event_key,
        title="Validation Failure Threshold Alert",
        description=(
            f"Validation failures ({failed_count}) "
            f"exceeded threshold ({threshold})."
        ),
        observed_value={"failed_checks": failed_count},
        configured_threshold={"threshold": threshold},
    )


def evaluate_quality_score_decline(
    db: Session,
    rule: AlertRule,
    run: ProcessingRun,
):
    config = rule.configuration or {}

    decline_threshold = get_configuration_value(
        config,
        "threshold",
    )

    if (
        isinstance(decline_threshold, bool)
        or not isinstance(decline_threshold, (int, float))
        or decline_threshold < 0
    ):
        return None

    previous_run = (
        db.query(ProcessingRun)
        .filter(
            ProcessingRun.dataset_id == run.dataset_id,
            ProcessingRun.status == "completed",
            ProcessingRun.id < run.id,
        )
        .order_by(ProcessingRun.id.desc())
        .first()
    )

    if previous_run is None:
        return None

    if (
        previous_run.quality_score is None
        or run.quality_score is None
    ):
        return None

    decline = previous_run.quality_score - run.quality_score

    if decline <= decline_threshold:
        return None

    event_key = get_event_key(
        rule.id,
        run.dataset_id,
        "quality_score_decline",
        str(run.id),
    )

    return create_alert(
        db=db,
        rule=rule,
        dataset_id=run.dataset_id,
        processing_run_id=run.id,
        event_key=event_key,
        title="Quality Score Decline Alert",
        description=(
            f"Quality score declined from "
            f"{previous_run.quality_score} to {run.quality_score}."
        ),
        observed_value={
            "previous_score": previous_run.quality_score,
            "current_score": run.quality_score,
            "decline": decline,
        },
        configured_threshold={
            "decline_threshold": decline_threshold,
        },
    )


def evaluate_recurring_validation_failures(
    db: Session,
    rule: AlertRule,
    run: ProcessingRun,
):
    config = rule.configuration or {}

    occurrence_threshold = get_configuration_value(
        config,
        "occurrences",
        3,
    )

    window_runs = get_configuration_value(
        config,
        "window_runs",
        5,
    )

    if (
        isinstance(occurrence_threshold, bool)
        or not isinstance(occurrence_threshold, int)
        or occurrence_threshold < 1
        or isinstance(window_runs, bool)
        or not isinstance(window_runs, int)
        or window_runs < 1
    ):
        return None

    run_ids = [
        row[0]
        for row in (
            db.query(ProcessingRun.id)
            .filter(
                ProcessingRun.dataset_id == run.dataset_id,
                ProcessingRun.status == "completed",
                ProcessingRun.id <= run.id,
            )
            .order_by(ProcessingRun.id.desc())
            .limit(window_runs)
            .all()
        )
    ]

    if not run_ids:
        return None

    failed_rules = (
        db.query(
            ValidationResult.validation_rule_id,
        )
        .filter(
            ValidationResult.processing_run_id.in_(run_ids),
            ValidationResult.failed_count > 0,
        )
        .distinct()
        .all()
    )

    for (validation_rule_id,) in failed_rules:

        occurrences = (
            db.query(ValidationResult)
            .join(
                ProcessingRun,
                ValidationResult.processing_run_id
                == ProcessingRun.id,
            )
            .filter(
                ProcessingRun.id.in_(run_ids),
                ValidationResult.validation_rule_id
                == validation_rule_id,
                ValidationResult.failed_count > 0,
            )
            .count()
        )

        if occurrences < occurrence_threshold:
            continue

        event_key = get_event_key(
            rule.id,
            run.dataset_id,
            "recurring_validation_failures",
            f"{validation_rule_id}:{run.id}",
        )

        return create_alert(
            db=db,
            rule=rule,
            dataset_id=run.dataset_id,
            processing_run_id=run.id,
            event_key=event_key,
            title="Recurring Validation Failure Alert",
            description=(
                f"Validation rule {validation_rule_id} "
                f"failed in {occurrences} of the last "
                f"{len(run_ids)} processing runs."
            ),
            observed_value={
                "validation_rule_id": validation_rule_id,
                "occurrences": occurrences,
                "window_runs": len(run_ids),
            },
            configured_threshold={
                "occurrences": occurrence_threshold,
                "window_runs": window_runs,
            },
        )

    return None


def evaluate_alert_rules_for_run(
    db: Session,
    processing_run_id: int,
) -> list[Alert]:
    run = (
        db.query(ProcessingRun)
        .filter(ProcessingRun.id == processing_run_id)
        .first()
    )

    if run is None:
        raise ValueError("Processing run not found")

    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == run.dataset_id)
        .first()
    )

    if dataset is None:
        raise ValueError("Dataset not found")

    rules = get_enabled_rules(db, dataset)

    created_alerts = []

    evaluators = {
        "quality_score_threshold": evaluate_quality_score_threshold,
        "processing_failure": evaluate_processing_failure,
        "validation_failure_threshold": evaluate_validation_failure_threshold,
        "quality_score_decline": evaluate_quality_score_decline,
        "recurring_validation_failures": evaluate_recurring_validation_failures,
    }

    try:
        for rule in rules:

            # Failed runs should only trigger processing failure alerts.
            if (
                run.status == "failed"
                and rule.condition_type != "processing_failure"
            ):
                continue

            # Completed runs should not trigger processing failure alerts.
            if (
                run.status != "failed"
                and rule.condition_type == "processing_failure"
            ):
                continue

            evaluator = evaluators.get(rule.condition_type)

            if evaluator is None:
                continue

            alert = evaluator(db, rule, run)

            if alert is not None:
                created_alerts.append(alert)

        # Persist alerts and notifications together.
        db.commit()

        for alert in created_alerts:
            db.refresh(alert)

        return created_alerts

    except SQLAlchemyError:
        db.rollback()
        raise


def evaluate_processing_failure_event(
    db: Session,
    processing_run_id: int,
) -> list[Alert]:
    return evaluate_alert_rules_for_run(
        db,
        processing_run_id,
    )
