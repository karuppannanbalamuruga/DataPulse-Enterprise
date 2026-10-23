
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base
from app.api.routes.datasets import get_db
from app.models.organization import Organization


TEST_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()

    # Create a test organization for dataset creation.
    organization = Organization(
    name="Test Organization",
    slug="test-organization",
    )

    # Add other required Organization fields here if your model requires them.
    db.add(organization)
    db.commit()
    db.refresh(organization)

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        test_client.organization_id = organization.id
        yield test_client

    app.dependency_overrides.clear()
    db.close()
    Base.metadata.drop_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_dataset(client, name="Test Dataset"):
    response = client.post(
        "/api/v1/datasets",
        json={
            "organization_id": client.organization_id,
            "name": name,
            "description": "Automated test dataset",
            "source_type": "csv",
        },
    )
    return response


def test_create_dataset(client):
    response = create_dataset(client)

    assert response.status_code == 201
    assert response.json()["name"] == "Test Dataset"
    assert response.json()["status"] == "pending"


def test_get_datasets(client):
    create_dataset(client)

    response = client.get("/api/v1/datasets")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


def test_get_dataset_by_id(client):
    created = create_dataset(client)
    dataset_id = created.json()["id"]

    response = client.get(f"/api/v1/datasets/{dataset_id}")

    assert response.status_code == 200
    assert response.json()["id"] == dataset_id


def test_update_dataset(client):
    created = create_dataset(client)
    dataset_id = created.json()["id"]

    response = client.patch(
        f"/api/v1/datasets/{dataset_id}",
        json={"name": "Updated Dataset"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Dataset"


def test_get_missing_dataset(client):
    response = client.get("/api/v1/datasets/999999")

    assert response.status_code == 404


def test_search_datasets(client):
    create_dataset(client, "Sales Dataset")
    create_dataset(client, "Customer Dataset")

    response = client.get(
        "/api/v1/datasets",
        params={"search": "Sales"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Sales Dataset"


def test_pagination(client):
    create_dataset(client, "Dataset One")
    create_dataset(client, "Dataset Two")

    response = client.get(
        "/api/v1/datasets",
        params={"page": 1, "page_size": 1},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 1
    assert data["total"] == 2
    assert len(data["items"]) == 1


def test_duplicate_dataset_name(client):
    create_dataset(client, "Sales Dataset")

    response = create_dataset(client, " sales dataset ")

    assert response.status_code == 409


def test_invalid_organization(client):
    response = client.post(
        "/api/v1/datasets",
        json={
            "organization_id": 999999,
            "name": "Invalid Organization Dataset",
            "description": "Test invalid organization",
            "source_type": "csv",
        },
    )

    assert response.status_code == 404


def test_empty_dataset_name(client):
    response = create_dataset(client, "   ")

    assert response.status_code == 422


def test_invalid_status_filter(client):
    response = client.get(
        "/api/v1/datasets",
        params={"status": "invalid_status"},
    )

    assert response.status_code == 422


def test_update_dataset_with_duplicate_name(client):
    create_dataset(client, "Sales Dataset")
    second = create_dataset(client, "Customer Dataset")
    dataset_id = second.json()["id"]

    response = client.patch(
        f"/api/v1/datasets/{dataset_id}",
        json={"name": "Sales Dataset"},
    )

    assert response.status_code == 409
