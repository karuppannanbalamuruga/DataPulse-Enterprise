
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.main import app
from app.api.routes.analytics import get_db as analytics_get_db
from app.models.organization import Organization
from app.models.dataset import Dataset


# ---------------------------------------------------------
# TEST DATABASE
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# FIXTURES
# ---------------------------------------------------------

@pytest.fixture()
def client():
    Base.metadata.create_all(bind=engine)

    app.dependency_overrides[analytics_get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(analytics_get_db, None)
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def dataset_ids(client):
    db = TestingSessionLocal()

    try:
        unique_id = uuid4().hex[:8]

        organization = Organization(
            name=f"Analytics Test Organization {unique_id}",
            slug=f"analytics-test-{unique_id}",
        )

        db.add(organization)
        db.commit()
        db.refresh(organization)

        datasets = [
            Dataset(
                organization_id=organization.id,
                name=f"Analytics Dataset {unique_id} - 1",
                source_type="file",
                status="pending",
            ),
            Dataset(
                organization_id=organization.id,
                name=f"Analytics Dataset {unique_id} - 2",
                source_type="file",
                status="pending",
            ),
        ]

        db.add_all(datasets)
        db.commit()

        for dataset in datasets:
            db.refresh(dataset)

        return [dataset.id for dataset in datasets]

    finally:
        db.close()


# ---------------------------------------------------------
# 1. ANALYTICS OVERVIEW TESTS
# ---------------------------------------------------------

def test_analytics_overview_returns_expected_structure(client):
    response = client.get("/api/v1/analytics/overview")

    assert response.status_code == 200, response.text

    data = response.json()

    assert "overall_quality_score" in data
    assert "total_datasets" in data
    assert "total_processing_runs" in data
    assert "successful_processing_runs" in data
    assert "failed_processing_runs" in data
    assert "total_validation_failures" in data


def test_analytics_overview_counts_datasets(client, dataset_ids):
    response = client.get("/api/v1/analytics/overview")

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["total_datasets"] == 2
    assert data["total_processing_runs"] == 0
    assert data["successful_processing_runs"] == 0
    assert data["failed_processing_runs"] == 0


# ---------------------------------------------------------
# 2. QUALITY TRENDS TESTS
# ---------------------------------------------------------

def test_quality_trends_returns_empty_list(client):
    response = client.get(
        "/api/v1/analytics/quality-trends"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_quality_trends_filters_by_dataset(client, dataset_ids):
    response = client.get(
        "/api/v1/analytics/quality-trends",
        params={"dataset_id": dataset_ids[0]},
    )

    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_quality_trends_missing_dataset_returns_404(client):
    response = client.get(
        "/api/v1/analytics/quality-trends",
        params={"dataset_id": 999999},
    )

    assert response.status_code == 404


def test_quality_trends_invalid_date_range_returns_400(client):
    response = client.get(
        "/api/v1/analytics/quality-trends",
        params={
            "start_date": "2026-11-13",
            "end_date": "2026-11-01",
        },
    )

    assert response.status_code == 400


def test_quality_trends_invalid_group_by_returns_422(client):
    response = client.get(
        "/api/v1/analytics/quality-trends",
        params={"group_by": "yearly"},
    )

    assert response.status_code == 422


# ---------------------------------------------------------
# 3. DATASET COMPARISON TESTS
# ---------------------------------------------------------

def test_dataset_comparison_returns_dataset_statistics(
    client, dataset_ids
):
    response = client.get(
        "/api/v1/analytics/dataset-comparison",
        params=[
            ("dataset_ids", dataset_ids[0]),
            ("dataset_ids", dataset_ids[1]),
        ],
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["dataset_count"] == 2
    assert len(data["items"]) == 2

    first_dataset = data["items"][0]

    assert "dataset_id" in first_dataset
    assert "dataset_name" in first_dataset
    assert "average_quality_score" in first_dataset
    assert "total_processing_runs" in first_dataset
    assert "total_validation_failures" in first_dataset
    assert "successful_runs" in first_dataset
    assert "failed_runs" in first_dataset
    assert "success_rate" in first_dataset
    assert "frequently_failing_rules" in first_dataset


def test_dataset_comparison_returns_zero_for_empty_history(
    client, dataset_ids
):
    response = client.get(
        "/api/v1/analytics/dataset-comparison",
        params=[
            ("dataset_ids", dataset_ids[0]),
            ("dataset_ids", dataset_ids[1]),
        ],
    )

    assert response.status_code == 200, response.text

    for item in response.json()["items"]:
        assert item["total_processing_runs"] == 0
        assert item["total_validation_failures"] == 0
        assert item["success_rate"] == 0
        assert item["frequently_failing_rules"] == []


def test_dataset_comparison_duplicate_ids_returns_400(
    client, dataset_ids
):
    response = client.get(
        "/api/v1/analytics/dataset-comparison",
        params=[
            ("dataset_ids", dataset_ids[0]),
            ("dataset_ids", dataset_ids[0]),
        ],
    )

    assert response.status_code == 400


def test_dataset_comparison_missing_dataset_returns_404(
    client, dataset_ids
):
    response = client.get(
        "/api/v1/analytics/dataset-comparison",
        params=[
            ("dataset_ids", dataset_ids[0]),
            ("dataset_ids", 999999),
        ],
    )

    assert response.status_code == 404


def test_dataset_comparison_requires_two_ids(client, dataset_ids):
    response = client.get(
        "/api/v1/analytics/dataset-comparison",
        params={"dataset_ids": dataset_ids[0]},
    )

    assert response.status_code == 422


# ---------------------------------------------------------
# 4. VALIDATION PERFORMANCE TESTS
# ---------------------------------------------------------

def test_validation_performance_returns_empty_list(client):
    response = client.get(
        "/api/v1/analytics/validation-performance"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_validation_performance_filters_by_dataset(
    client, dataset_ids
):
    response = client.get(
        "/api/v1/analytics/validation-performance",
        params={"dataset_id": dataset_ids[0]},
    )

    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_validation_performance_missing_dataset_returns_404(client):
    response = client.get(
        "/api/v1/analytics/validation-performance",
        params={"dataset_id": 999999},
    )

    assert response.status_code == 404


def test_validation_performance_invalid_date_returns_400(client):
    response = client.get(
        "/api/v1/analytics/validation-performance",
        params={
            "start_date": "2026-11-13",
            "end_date": "2026-11-01",
        },
    )

    assert response.status_code == 400


# ---------------------------------------------------------
# 5. PROCESSING TRENDS TESTS
# ---------------------------------------------------------

def test_processing_trends_returns_empty_list(client):
    response = client.get(
        "/api/v1/analytics/processing-trends"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_processing_trends_filters_by_dataset(
    client, dataset_ids
):
    response = client.get(
        "/api/v1/analytics/processing-trends",
        params={"dataset_id": dataset_ids[0]},
    )

    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_processing_trends_missing_dataset_returns_404(client):
    response = client.get(
        "/api/v1/analytics/processing-trends",
        params={"dataset_id": 999999},
    )

    assert response.status_code == 404


def test_processing_trends_invalid_date_range_returns_400(client):
    response = client.get(
        "/api/v1/analytics/processing-trends",
        params={
            "start_date": "2026-11-13",
            "end_date": "2026-11-01",
        },
    )

    assert response.status_code == 400


def test_processing_trends_invalid_group_by_returns_422(client):
    response = client.get(
        "/api/v1/analytics/processing-trends",
        params={"group_by": "yearly"},
    )

    assert response.status_code == 422


# ---------------------------------------------------------
# 6. ANALYTICS CSV EXPORT TESTS
# ---------------------------------------------------------

def test_analytics_export_returns_csv(client):
    response = client.get(
        "/api/v1/analytics/export"
    )

    assert response.status_code == 200, response.text

    assert "text/csv" in response.headers["content-type"]

    assert (
        'attachment; filename="datapulse_analytics.csv"'
        in response.headers["content-disposition"]
    )


def test_analytics_export_contains_expected_columns(client):
    response = client.get(
        "/api/v1/analytics/export"
    )

    assert response.status_code == 200, response.text

    header = response.text.splitlines()[0]

    expected_columns = [
        "run_id",
        "dataset_id",
        "dataset_name",
        "status",
        "records_processed",
        "total_rules_executed",
        "passed_checks",
        "failed_checks",
        "quality_score",
        "error_message",
        "started_at",
        "completed_at",
    ]

    assert header.split(",") == expected_columns


def test_analytics_export_filters_by_dataset(client, dataset_ids):
    response = client.get(
        "/api/v1/analytics/export",
        params={"dataset_id": dataset_ids[0]},
    )

    assert response.status_code == 200, response.text
    assert "text/csv" in response.headers["content-type"]


def test_analytics_export_missing_dataset_returns_404(client):
    response = client.get(
        "/api/v1/analytics/export",
        params={"dataset_id": 999999},
    )

    assert response.status_code == 404


def test_analytics_export_invalid_status_returns_422(client):
    response = client.get(
        "/api/v1/analytics/export",
        params={"status": "pending"},
    )

    assert response.status_code == 422


def test_analytics_export_invalid_date_range_returns_400(client):
    response = client.get(
        "/api/v1/analytics/export",
        params={
            "start_date": "2026-11-13",
            "end_date": "2026-11-01",
        },
    )

    assert response.status_code == 400
