from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.main import app
from app.api.routes import datasets as datasets_routes
from app.api.routes import quality_summary as quality_summary_routes
from app.api.routes import validation_results as validation_results_routes
from app.models.dataset import Dataset
from app.models.organization import Organization
from app.models.validation_rule import ValidationRule


# Isolated in-memory SQLite database for Task 4 tests.
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
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Create isolated tables and override all Task 4 route DB dependencies."""
    Base.metadata.create_all(bind=engine)

    app.dependency_overrides[datasets_routes.get_db] = override_get_db
    app.dependency_overrides[quality_summary_routes.get_db] = override_get_db
    app.dependency_overrides[validation_results_routes.get_db] = override_get_db

    # Keep uploaded test CSV files inside pytest's temporary directory.
    monkeypatch.setattr(datasets_routes, "UPLOAD_DIR", tmp_path / "uploads")

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def dataset_id(client):
    """Create an organization and dataset for Task 4 API tests."""
    db = TestingSessionLocal()

    try:
        unique_id = uuid4().hex[:8]

        organization = Organization(
            name=f"Task 4 Test Organization {unique_id}",
            slug=f"task-4-test-{unique_id}",
        )
        db.add(organization)
        db.commit()
        db.refresh(organization)

        dataset = Dataset(
            organization_id=organization.id,
            name=f"Task 4 Test Dataset {unique_id}",
            source_type="csv",
            status="pending",
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return dataset.id
    finally:
        db.close()


def add_rule(dataset_id, name, rule_type, configuration, is_active=True):
    """Insert a validation rule directly into the isolated test database."""
    db = TestingSessionLocal()
    try:
        rule = ValidationRule(
            dataset_id=dataset_id,
            name=name,
            rule_type=rule_type,
            configuration=configuration,
            is_active=is_active,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule.id
    finally:
        db.close()


def upload_csv(client, dataset_id, filename="sample.csv", content=None):
    if content is None:
        content = (
            "id,name,age,email\n"
            "1,Alice,25,alice@example.com\n"
            "2,Bob,30,bob@example.com\n"
            "3,,17,invalid-email\n"
        )

    return client.post(
        f"/api/v1/datasets/{dataset_id}/upload",
        files={"file": (filename, content.encode("utf-8"), "text/csv")},
    )


def test_csv_upload_success(client, dataset_id):
    response = upload_csv(client, dataset_id)

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["message"] == "CSV uploaded successfully"
    assert data["dataset_id"] == dataset_id
    assert data["filename"] == "sample.csv"
    assert data["columns"] == ["id", "name", "age", "email"]
    assert data["total_rows"] == 3
    assert data["file_size"] > 0
    assert data["uploaded_at"] is not None


def test_csv_upload_rejects_non_csv_file(client, dataset_id):
    response = upload_csv(
        client,
        dataset_id,
        filename="sample.txt",
        content="id,name\n1,Alice\n",
    )

    assert response.status_code == 400
    assert "Only CSV files are supported" in response.json()["detail"]


def test_csv_upload_rejects_empty_file(client, dataset_id):
    response = upload_csv(
        client,
        dataset_id,
        filename="empty.csv",
        content="",
    )

    assert response.status_code == 400


def test_csv_upload_rejects_missing_headers(client, dataset_id):
    response = upload_csv(
        client,
        dataset_id,
        filename="no_headers.csv",
        content="",
    )

    assert response.status_code == 400


def test_csv_upload_rejects_malformed_rows(client, dataset_id):
    response = upload_csv(
        client,
        dataset_id,
        filename="malformed.csv",
        content="id,name\n1,Alice,extra\n",
    )

    assert response.status_code == 400
    assert "Invalid CSV file" in response.json()["detail"]


def test_csv_upload_returns_404_for_missing_dataset(client):
    response = upload_csv(client, 999999)

    assert response.status_code == 404


def test_execute_requires_uploaded_csv(client, dataset_id):
    response = client.post(f"/api/v1/datasets/{dataset_id}/execute")

    assert response.status_code == 400
    assert "upload a CSV" in response.json()["detail"]


def test_execute_validation_persists_results_and_issues(client, dataset_id):
    required_rule_id = add_rule(
        dataset_id,
        "Name is required",
        "required_field",
        {"column": "name"},
    )
    email_rule_id = add_rule(
        dataset_id,
        "Email format",
        "format_validation",
        {"column": "email", "format": "email"},
    )

    upload_response = upload_csv(client, dataset_id)
    assert upload_response.status_code == 200, upload_response.text

    execute_response = client.post(
        f"/api/v1/datasets/{dataset_id}/execute"
    )
    assert execute_response.status_code == 200, execute_response.text

    data = execute_response.json()

    assert data["dataset_id"] == dataset_id
    assert data["status"] == "completed"
    assert data["records_processed"] == 3
    assert data["total_rules_executed"] == 2
    assert data["passed_checks"] == 4
    assert data["failed_checks"] == 2
    assert data["quality_score"] == 66.67

    result_rule_ids = {item["rule_id"] for item in data["results"]}
    assert result_rule_ids == {required_rule_id, email_rule_id}

    assert len(data["issues"]) == 2
    assert any(
        issue["column_name"] == "name"
        and issue["row_number"] == 3
        for issue in data["issues"]
    )
    assert any(
        issue["column_name"] == "email"
        and issue["row_number"] == 3
        for issue in data["issues"]
    )

    run_id = data["processing_run_id"]

    results_response = client.get(
        f"/api/v1/processing-runs/{run_id}/results"
    )
    assert results_response.status_code == 200, results_response.text
    assert results_response.json()["total"] == 2

    issues_response = client.get(
        f"/api/v1/processing-runs/{run_id}/issues"
    )
    assert issues_response.status_code == 200, issues_response.text
    assert issues_response.json()["total"] == 2


def test_inactive_validation_rule_is_not_executed(client, dataset_id):
    active_rule_id = add_rule(
        dataset_id,
        "Required name",
        "required_field",
        {"column": "name"},
        is_active=True,
    )
    inactive_rule_id = add_rule(
        dataset_id,
        "Inactive email rule",
        "format_validation",
        {"column": "email", "format": "email"},
        is_active=False,
    )

    upload_response = upload_csv(client, dataset_id)
    assert upload_response.status_code == 200, upload_response.text

    response = client.post(f"/api/v1/datasets/{dataset_id}/execute")
    assert response.status_code == 200, response.text

    data = response.json()
    executed_ids = {item["rule_id"] for item in data["results"]}

    assert active_rule_id in executed_ids
    assert inactive_rule_id not in executed_ids
    assert data["total_rules_executed"] == 1


def test_quality_summary_returns_latest_completed_run(client, dataset_id):
    add_rule(
        dataset_id,
        "Age range",
        "numeric_range",
        {"column": "age", "min": 18, "max": 65},
    )

    upload_response = upload_csv(client, dataset_id)
    assert upload_response.status_code == 200, upload_response.text

    execute_response = client.post(
        f"/api/v1/datasets/{dataset_id}/execute"
    )
    assert execute_response.status_code == 200, execute_response.text

    summary_response = client.get(
        f"/api/v1/datasets/{dataset_id}/quality-summary"
    )
    assert summary_response.status_code == 200, summary_response.text

    summary = summary_response.json()

    assert summary["dataset_id"] == dataset_id
    assert summary["total_processing_runs"] == 1
    assert summary["total_records_processed"] == 3
    assert summary["total_rules_executed"] == 1
    assert summary["total_passed_checks"] == 2
    assert summary["total_failed_checks"] == 1
    assert summary["quality_score"] == 66.67
    assert summary["latest_run"]["status"] == "completed"


def test_quality_summary_returns_empty_values_without_runs(client, dataset_id):
    response = client.get(
        f"/api/v1/datasets/{dataset_id}/quality-summary"
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["total_processing_runs"] == 0
    assert data["total_records_processed"] == 0
    assert data["quality_score"] == 0.0
    assert data["latest_run"] is None


def test_quality_summary_returns_404_for_missing_dataset(client):
    response = client.get(
        "/api/v1/datasets/999999/quality-summary"
    )

    assert response.status_code == 404
