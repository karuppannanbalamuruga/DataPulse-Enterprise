
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models

from app.db.database import Base
from app.main import app
from app.api.routes import datasets as datasets_routes
from app.api.routes import quality_summary as quality_summary_routes
from app.api.routes import validation_results as validation_results_routes

from app.models.organization import Organization
from app.models.dataset import Dataset
from app.models.validation_rule import ValidationRule
from app.models.alert_rule import AlertRule
from app.models.alert import Alert

from app.services import csv_service


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


# ==================================================
# DATABASE FIXTURES
# ==================================================

def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    Base.metadata.create_all(bind=engine)

    app.dependency_overrides[
        datasets_routes.get_db
    ] = override_get_db

    app.dependency_overrides[
        quality_summary_routes.get_db
    ] = override_get_db

    app.dependency_overrides[
        validation_results_routes.get_db
    ] = override_get_db

    monkeypatch.setattr(
        datasets_routes,
        "UPLOAD_DIR",
        tmp_path / "uploads",
    )

    try:
        with TestClient(app) as test_client:
            yield test_client

    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(client):
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def dataset_data(db_session):
    unique_id = uuid4().hex[:8]

    organization = Organization(
        name=f"Alert Integration Org {unique_id}",
        slug=f"alert-integration-{unique_id}",
    )

    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    dataset = Dataset(
        organization_id=organization.id,
        name=f"Alert Integration Dataset {unique_id}",
        source_type="csv",
        status="pending",
    )

    db_session.add(dataset)
    db_session.commit()
    db_session.refresh(dataset)

    return {
        "organization_id": organization.id,
        "dataset_id": dataset.id,
    }


# ==================================================
# ALERT RULE HELPER
# ==================================================

def create_alert_rule(
    db,
    organization_id,
    condition_type,
    configuration,
    severity="warning",
):
    rule = AlertRule(
        organization_id=organization_id,
        dataset_id=None,
        name=f"Integration {condition_type}",
        condition_type=condition_type,
        configuration=configuration,
        severity=severity,
        notification_preferences={
            "in_app": True,
            "email": False,
        },
        is_enabled=True,
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule


# ==================================================
# TEST 1 - CSV SUCCESS QUALITY ALERT
# ==================================================

def test_csv_success_generates_quality_alert(
    client,
    db_session,
    dataset_data,
):
    dataset_id = dataset_data["dataset_id"]

    validation_rule = ValidationRule(
        dataset_id=dataset_id,
        name="Required Name",
        rule_type="required_field",
        configuration={"column": "name"},
        is_active=True,
    )

    db_session.add(validation_rule)

    create_alert_rule(
        db_session,
        dataset_data["organization_id"],
        "quality_score_threshold",
        {
            "threshold": 80,
            "operator": "below",
        },
    )

    db_session.commit()

    csv_content = (
        "id,name,age,email\n"
        "1,Alice,25,alice@example.com\n"
        "2,Bob,30,bob@example.com\n"
        "3,,17,invalid-email\n"
    )

    upload_response = client.post(
        f"/api/v1/datasets/{dataset_id}/upload",
        files={
            "file": (
                "sample.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert upload_response.status_code == 200, (
        upload_response.text
    )

    execute_response = client.post(
        f"/api/v1/datasets/{dataset_id}/execute"
    )

    assert execute_response.status_code == 200, (
        execute_response.text
    )

    processing_data = execute_response.json()

    assert processing_data["status"] == "completed"

    alerts = (
        db_session.query(Alert)
        .filter(
            Alert.dataset_id == dataset_id
        )
        .all()
    )

    assert len(alerts) == 1

    assert (
        alerts[0].title
        == "Data Quality Score Threshold Alert"
    )

    assert alerts[0].status == "open"

    assert (
        alerts[0].processing_run_id
        == processing_data["processing_run_id"]
    )

    assert (
        alerts[0].observed_value["quality_score"]
        < 80
    )


# ==================================================
# TEST 2 - CSV FAILURE PROCESSING ALERT
# ==================================================

def test_csv_failure_generates_processing_failure_alert(
    db_session,
    dataset_data,
    monkeypatch,
    tmp_path,
):
    dataset_id = dataset_data["dataset_id"]

    create_alert_rule(
        db_session,
        dataset_data["organization_id"],
        "processing_failure",
        {},
        severity="critical",
    )

    db_session.commit()

    def simulate_csv_failure(file_path):
        raise ValueError(
            "Simulated CSV processing failure"
        )

    monkeypatch.setattr(
        csv_service,
        "process_csv",
        simulate_csv_failure,
    )

    csv_file = tmp_path / "failure.csv"

    with pytest.raises(
        ValueError,
        match="Simulated CSV processing failure",
    ):
        csv_service.execute_csv_validation(
            db_session,
            dataset_id,
            str(csv_file),
        )

    db_session.expire_all()

    alerts = (
        db_session.query(Alert)
        .filter(
            Alert.dataset_id == dataset_id
        )
        .all()
    )

    assert len(alerts) == 1

    alert = alerts[0]

    assert alert.title == "Processing Failure Alert"
    assert alert.severity == "critical"
    assert alert.status == "open"

    assert (
        alert.observed_value["status"]
        == "failed"
    )

    assert alert.processing_run_id is not None


# ==================================================
# TEST 3 - FAILURE BACKGROUND EMAIL SCHEDULING
# ==================================================

def test_csv_failure_schedules_background_email(
    client,
    db_session,
    dataset_data,
    monkeypatch,
):
    dataset_id = dataset_data["dataset_id"]

    create_alert_rule(
        db_session,
        dataset_data["organization_id"],
        "processing_failure",
        {},
        severity="critical",
    )

    db_session.commit()

    scheduled_tasks = []

    def capture_background_task(
        self,
        func,
        *args,
        **kwargs,
    ):
        scheduled_tasks.append(
            {
                "function": func,
                "args": args,
                "kwargs": kwargs,
            }
        )

    monkeypatch.setattr(
        datasets_routes.BackgroundTasks,
        "add_task",
        capture_background_task,
    )

    csv_content = (
        "id,name,age\n"
        "1,Alice,25\n"
    )

    upload_response = client.post(
        f"/api/v1/datasets/{dataset_id}/upload",
        files={
            "file": (
                "failure.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            )
        },
    )

    assert upload_response.status_code == 200, (
        upload_response.text
    )

    def simulate_csv_failure(file_path):
        raise ValueError(
            "Simulated CSV processing failure"
        )

    monkeypatch.setattr(
        csv_service,
        "process_csv",
        simulate_csv_failure,
    )

    execute_response = client.post(
        f"/api/v1/datasets/{dataset_id}/execute"
    )

    assert execute_response.status_code == 400

    assert (
        execute_response.json()["detail"]
        == "Simulated CSV processing failure"
    )

    alerts = (
        db_session.query(Alert)
        .filter(
            Alert.dataset_id == dataset_id
        )
        .all()
    )

    assert len(alerts) == 1

    assert len(scheduled_tasks) == 1

    assert (
        scheduled_tasks[0]["function"]
        == datasets_routes.send_alert_emails_in_background
    )

    assert (
        scheduled_tasks[0]["args"]
        == (alerts[0].id,)
    )
