
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models

from app.db.database import Base
from app.models.organization import Organization
from app.models.dataset import Dataset
from app.models.alert_rule import AlertRule
from app.models.alert import Alert
from app.models.processing_run import ProcessingRun
from app.models.validation_rule import ValidationRule
from app.models.validation_result import ValidationResult

from app.services.alert_service import evaluate_alert_rules_for_run


TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def setup_data(db):
    unique_id = uuid4().hex[:8]

    organization = Organization(
        name=f"Alert Test Org {unique_id}",
        slug=f"alert-test-{unique_id}",
    )

    db.add(organization)
    db.commit()
    db.refresh(organization)

    dataset = Dataset(
        organization_id=organization.id,
        name=f"Alert Test Dataset {unique_id}",
        source_type="csv",
        status="pending",
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    validation_rule = ValidationRule(
        dataset_id=dataset.id,
        name="Required Field Test",
        rule_type="required_field",
        configuration={"column": "name"},
        is_active=True,
    )

    db.add(validation_rule)
    db.commit()
    db.refresh(validation_rule)

    return {
        "organization": organization,
        "dataset": dataset,
        "validation_rule": validation_rule,
    }


def create_alert_rule(
    db,
    setup_data,
    condition_type,
    configuration,
    is_enabled=True,
    severity="warning",
):
    rule = AlertRule(
        organization_id=setup_data["organization"].id,
        dataset_id=setup_data["dataset"].id,
        name=f"Test {condition_type}",
        condition_type=condition_type,
        configuration=configuration,
        severity=severity,
        notification_preferences={"in_app": True, "email": False},
        is_enabled=is_enabled,
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule


def create_processing_run(
    db,
    dataset_id,
    status="completed",
    quality_score=90.0,
    failed_checks=0,
    error_message=None,
):
    run = ProcessingRun(
        dataset_id=dataset_id,
        status=status,
        records_processed=100,
        total_rules_executed=5,
        passed_checks=100 - failed_checks,
        failed_checks=failed_checks,
        quality_score=quality_score,
        error_message=error_message,
    )

    db.add(run)
    db.commit()
    db.refresh(run)

    return run


def create_validation_result(
    db,
    run_id,
    validation_rule_id,
    failed_count=1,
):
    result = ValidationResult(
        processing_run_id=run_id,
        validation_rule_id=validation_rule_id,
        column_name="name",
        total_checked=10,
        passed_count=10 - failed_count,
        failed_count=failed_count,
        status="completed",
    )

    db.add(result)
    db.commit()
    db.refresh(result)

    return result


def test_quality_score_threshold_alert(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "quality_score_threshold",
        {"threshold": 80, "operator": "below"},
    )

    run = create_processing_run(
        db,
        setup_data["dataset"].id,
        quality_score=65,
    )

    alerts = evaluate_alert_rules_for_run(db, run.id)

    assert len(alerts) == 1
    assert alerts[0].severity == "warning"
    assert alerts[0].observed_value["quality_score"] == 65
    assert alerts[0].status == "open"


def test_processing_failure_alert(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "processing_failure",
        {},
        severity="critical",
    )

    run = create_processing_run(
        db,
        setup_data["dataset"].id,
        status="failed",
        error_message="CSV processing failed",
    )

    alerts = evaluate_alert_rules_for_run(db, run.id)

    assert len(alerts) == 1
    assert alerts[0].severity == "critical"
    assert alerts[0].observed_value["status"] == "failed"


def test_validation_failure_threshold_alert(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "validation_failure_threshold",
        {"threshold": 2},
    )

    run = create_processing_run(
        db,
        setup_data["dataset"].id,
        failed_checks=5,
    )

    alerts = evaluate_alert_rules_for_run(db, run.id)

    assert len(alerts) == 1
    assert alerts[0].observed_value["failed_checks"] == 5


def test_quality_score_decline_alert(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "quality_score_decline",
        {"threshold": 10},
    )

    create_processing_run(
        db,
        setup_data["dataset"].id,
        quality_score=95,
    )

    current_run = create_processing_run(
        db,
        setup_data["dataset"].id,
        quality_score=70,
    )

    alerts = evaluate_alert_rules_for_run(db, current_run.id)

    assert len(alerts) == 1
    assert alerts[0].observed_value["previous_score"] == 95
    assert alerts[0].observed_value["current_score"] == 70
    assert alerts[0].observed_value["decline"] == 25


def test_recurring_validation_failures_alert(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "recurring_validation_failures",
        {"occurrences": 3, "window_runs": 5},
    )

    validation_rule_id = setup_data["validation_rule"].id

    runs = []

    for _ in range(3):
        run = create_processing_run(
            db,
            setup_data["dataset"].id,
        )

        create_validation_result(
            db,
            run.id,
            validation_rule_id,
            failed_count=2,
        )

        runs.append(run)

    alerts = evaluate_alert_rules_for_run(db, runs[-1].id)

    assert len(alerts) == 1
    assert alerts[0].observed_value["occurrences"] == 3
    assert alerts[0].observed_value["validation_rule_id"] == validation_rule_id


def test_disabled_alert_rule_does_not_generate_alert(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "quality_score_threshold",
        {"threshold": 80, "operator": "below"},
        is_enabled=False,
    )

    run = create_processing_run(
        db,
        setup_data["dataset"].id,
        quality_score=50,
    )

    alerts = evaluate_alert_rules_for_run(db, run.id)

    assert alerts == []

    alert_count = db.query(Alert).count()
    assert alert_count == 0


def test_duplicate_alert_prevention(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "quality_score_threshold",
        {"threshold": 80, "operator": "below"},
    )

    run = create_processing_run(
        db,
        setup_data["dataset"].id,
        quality_score=50,
    )

    first_result = evaluate_alert_rules_for_run(db, run.id)
    second_result = evaluate_alert_rules_for_run(db, run.id)

    assert len(first_result) == 1
    assert len(second_result) == 0

    alert_count = db.query(Alert).count()
    assert alert_count == 1


def test_processing_run_not_found(db):
    with pytest.raises(ValueError, match="Processing run not found"):
        evaluate_alert_rules_for_run(db, 999999)


def test_no_alert_when_quality_score_is_above_threshold(db, setup_data):
    create_alert_rule(
        db,
        setup_data,
        "quality_score_threshold",
        {"threshold": 80, "operator": "below"},
    )

    run = create_processing_run(
        db,
        setup_data["dataset"].id,
        quality_score=95,
    )

    alerts = evaluate_alert_rules_for_run(db, run.id)

    assert alerts == []
    assert db.query(Alert).count() == 0
