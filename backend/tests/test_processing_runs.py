
from uuid import uuid4
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.main import app
from app.api.routes.processing_runs import get_db
from app.models.dataset import Dataset
from app.models.processing_run import ProcessingRun
from app.models.organization import Organization
from app.models.execution_log import ExecutionLog
from app.models.error_record import ErrorRecord


# In-memory SQLite database for isolated automated tests
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


def override_get_db():
    """Provide a test database session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    """Create test tables and override the API database dependency."""
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def dataset_id(client):
    """Create an Organization and its Dataset for API tests."""
    db = TestingSessionLocal()

    try:
        unique_id = uuid4().hex[:8]

        organization = Organization(
            name=f"Automation Test Organization {unique_id}",
            slug=f"automation-test-{unique_id}",
        )

        db.add(organization)
        db.commit()
        db.refresh(organization)

        dataset = Dataset(
            organization_id=organization.id,
            name=f"Automation Test Dataset {unique_id}",
            source_type="file",
            status="pending",
        )

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return dataset.id

    finally:
        db.close()


def create_run(client, dataset_id):
    """Create a processing run and return its ID."""
    response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )

    assert response.status_code == 201, response.text
    return response.json()["id"]


# ---------------------------------------------------------
# Existing Processing Run Tests
# ---------------------------------------------------------


def test_get_processing_runs_returns_paginated_response(client, dataset_id):
    create_run(client, dataset_id)

    response = client.get("/api/v1/processing-runs")

    assert response.status_code == 200, response.text

    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "total_pages" in data
    assert data["total"] == 1
    assert data["items"][0]["dataset_id"] == dataset_id


def test_get_processing_run_by_id(client, dataset_id):
    run_id = create_run(client, dataset_id)

    response = client.get(f"/api/v1/processing-runs/{run_id}")

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["id"] == run_id
    assert data["dataset_id"] == dataset_id
    assert data["status"] == "pending"


def test_get_missing_processing_run_returns_404(client):
    response = client.get("/api/v1/processing-runs/999999")
    assert response.status_code == 404


def test_create_processing_run(client, dataset_id):
    response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )

    assert response.status_code == 201, response.text

    data = response.json()
    assert data["dataset_id"] == dataset_id
    assert data["status"] == "pending"
    assert data["records_processed"] == 0


def test_create_processing_run_with_missing_dataset_returns_404(client):
    response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": 999999},
    )

    assert response.status_code == 404


def test_patch_processing_run_updates_fields(client, dataset_id):
    run_id = create_run(client, dataset_id)

    response = client.patch(
        f"/api/v1/processing-runs/{run_id}",
        json={
            "status": "processing",
            "records_processed": 25,
            "error_message": None,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["status"] == "processing"
    assert data["records_processed"] == 25


def test_patch_negative_records_is_rejected(client, dataset_id):
    run_id = create_run(client, dataset_id)

    response = client.patch(
        f"/api/v1/processing-runs/{run_id}",
        json={"records_processed": -1},
    )

    assert response.status_code == 422


def test_patch_invalid_status_is_rejected(client, dataset_id):
    run_id = create_run(client, dataset_id)

    response = client.patch(
        f"/api/v1/processing-runs/{run_id}",
        json={"status": "unknown"},
    )

    assert response.status_code == 422


def test_patch_missing_processing_run_returns_404(client):
    response = client.patch(
        "/api/v1/processing-runs/999999",
        json={"status": "processing"},
    )

    assert response.status_code == 404


def test_completed_run_cannot_be_updated(client, dataset_id):
    run_id = create_run(client, dataset_id)

    complete_response = client.patch(
        f"/api/v1/processing-runs/{run_id}",
        json={
            "status": "completed",
            "records_processed": 100,
        },
    )

    assert complete_response.status_code == 200, complete_response.text

    update_response = client.patch(
        f"/api/v1/processing-runs/{run_id}",
        json={"records_processed": 101},
    )

    assert update_response.status_code == 400


# ---------------------------------------------------------
# Task 5: Execution Logs API Tests
# ---------------------------------------------------------


def test_get_processing_run_logs_returns_empty_list(client, dataset_id):
    run_id = create_run(client, dataset_id)

    response = client.get(
        f"/api/v1/processing-runs/{run_id}/logs"
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["total_pages"] == 0


def test_get_processing_run_logs_returns_saved_logs(client, dataset_id):
    run_id = create_run(client, dataset_id)

    db = TestingSessionLocal()

    try:
        db.add_all([
            ExecutionLog(
                run_id=run_id,
                dataset_id=dataset_id,
                level="INFO",
                stage="RUN_START",
                message="Processing run started",
                timestamp=datetime(2026, 11, 10, 10, 0, 0),
            ),
            ExecutionLog(
                run_id=run_id,
                dataset_id=dataset_id,
                level="WARNING",
                stage="VALIDATION_RESULTS",
                message="Validation completed with failures",
                timestamp=datetime(2026, 11, 10, 10, 1, 0),
            ),
            ExecutionLog(
                run_id=run_id,
                dataset_id=dataset_id,
                level="ERROR",
                stage="CSV_PROCESSING",
                message="CSV processing failed",
                timestamp=datetime(2026, 11, 10, 10, 2, 0),
            ),
        ])

        db.commit()

    finally:
        db.close()

    response = client.get(
        f"/api/v1/processing-runs/{run_id}/logs"
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["total"] == 3
    assert len(data["items"]) == 3
    assert all(item["run_id"] == run_id for item in data["items"])


def test_get_processing_run_logs_filters_by_level(client, dataset_id):
    run_id = create_run(client, dataset_id)

    db = TestingSessionLocal()

    try:
        db.add_all([
            ExecutionLog(
                run_id=run_id,
                dataset_id=dataset_id,
                level="INFO",
                stage="RUN_START",
                message="Run started",
            ),
            ExecutionLog(
                run_id=run_id,
                dataset_id=dataset_id,
                level="ERROR",
                stage="CSV_PROCESSING",
                message="CSV processing failed",
            ),
        ])

        db.commit()

    finally:
        db.close()

    response = client.get(
        f"/api/v1/processing-runs/{run_id}/logs",
        params={"level": "ERROR"},
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["total"] == 1
    assert all(item["level"] == "ERROR" for item in data["items"])


def test_get_processing_run_logs_searches_message(client, dataset_id):
    run_id = create_run(client, dataset_id)

    db = TestingSessionLocal()

    try:
        db.add_all([
            ExecutionLog(
                run_id=run_id,
                dataset_id=dataset_id,
                level="INFO",
                stage="RUN_START",
                message="Processing started",
            ),
            ExecutionLog(
                run_id=run_id,
                dataset_id=dataset_id,
                level="ERROR",
                stage="CSV_PROCESSING",
                message="CSV file parsing failed",
            ),
        ])

        db.commit()

    finally:
        db.close()

    response = client.get(
        f"/api/v1/processing-runs/{run_id}/logs",
        params={"search": "CSV file parsing"},
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["total"] == 1
    assert "CSV file parsing" in data["items"][0]["message"]


def test_get_logs_for_missing_processing_run_returns_404(client):
    response = client.get(
        "/api/v1/processing-runs/999999/logs"
    )

    assert response.status_code == 404


# ---------------------------------------------------------
# Task 5: Processing Runs Summary API Tests
# ---------------------------------------------------------


def test_processing_runs_summary_returns_expected_structure(client):
    response = client.get(
        "/api/v1/processing-runs/summary"
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "processing_runs" in data
    assert "validation" in data
    assert "error_monitoring" in data
    assert "frequent_failing_rules" in data

    assert "total" in data["processing_runs"]
    assert "completed" in data["processing_runs"]
    assert "failed" in data["processing_runs"]

    assert "total_failures" in data["validation"]

    assert "severity_distribution" in data["error_monitoring"]
    assert "unresolved_errors" in data["error_monitoring"]
    assert "recurring_error_datasets" in data["error_monitoring"]


def test_processing_runs_summary_counts_runs(client, dataset_id):
    create_run(client, dataset_id)

    response = client.get(
        "/api/v1/processing-runs/summary"
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["processing_runs"]["total"] == 1
    assert data["processing_runs"]["pending"] == 1
    assert data["processing_runs"]["completed"] == 0
    assert data["processing_runs"]["failed"] == 0


def test_processing_runs_summary_includes_error_severity(client, dataset_id):
    run_id = create_run(client, dataset_id)

    db = TestingSessionLocal()

    try:
        log = ExecutionLog(
            run_id=run_id,
            dataset_id=dataset_id,
            level="ERROR",
            stage="CSV_PROCESSING",
            message="CSV parsing failed",
        )

        db.add(log)
        db.flush()

        error = ErrorRecord(
            run_id=run_id,
            execution_log_id=log.id,
            category="FILE_PARSING",
            severity="HIGH",
            message="CSV file processing failed",
            stage="CSV_PROCESSING",
            is_resolved=False,
        )

        db.add(error)
        db.commit()

    finally:
        db.close()

    response = client.get(
        "/api/v1/processing-runs/summary"
    )

    assert response.status_code == 200, response.text

    data = response.json()
    monitoring = data["error_monitoring"]

    assert monitoring["severity_distribution"]["HIGH"] == 1
    assert monitoring["unresolved_errors"] == 1
    assert len(monitoring["recurring_error_datasets"]) >= 1
