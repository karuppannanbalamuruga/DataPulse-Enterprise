
from uuid import uuid4

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

        # Create Organization
        organization = Organization(
            name=f"Automation Test Organization {unique_id}",
            slug=f"automation-test-{unique_id}",
        )

        db.add(organization)
        db.commit()
        db.refresh(organization)

        # Create Dataset linked to Organization
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


def test_get_processing_runs_returns_paginated_response(client, dataset_id):
    create_response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )
    assert create_response.status_code == 201, create_response.text

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
    create_response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )
    assert create_response.status_code == 201, create_response.text

    run_id = create_response.json()["id"]

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
    create_response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )
    assert create_response.status_code == 201, create_response.text

    run_id = create_response.json()["id"]

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
    create_response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )
    assert create_response.status_code == 201, create_response.text

    run_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/processing-runs/{run_id}",
        json={"records_processed": -1},
    )

    assert response.status_code == 422


def test_patch_invalid_status_is_rejected(client, dataset_id):
    create_response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )
    assert create_response.status_code == 201, create_response.text

    run_id = create_response.json()["id"]

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
    create_response = client.post(
        "/api/v1/processing-runs",
        params={"dataset_id": dataset_id},
    )
    assert create_response.status_code == 201, create_response.text

    run_id = create_response.json()["id"]

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
