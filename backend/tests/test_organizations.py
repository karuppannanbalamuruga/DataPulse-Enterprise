
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base
from app.api.routes.organizations import get_db
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


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=test_engine)

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def create_organization(client, name="Test Organization", slug="test-organization"):
    return client.post(
        "/api/v1/organizations",
        json={"name": name, "slug": slug},
    )


def test_create_organization(client):
    response = create_organization(client)

    assert response.status_code == 201
    assert response.json()["name"] == "Test Organization"
    assert response.json()["slug"] == "test-organization"


def test_get_organizations(client):
    create_organization(client)

    response = client.get("/api/v1/organizations")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_create_organization_without_name(client):
    response = client.post(
        "/api/v1/organizations",
        json={"slug": "missing-name"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "name is required"


def test_create_organization_without_slug(client):
    response = client.post(
        "/api/v1/organizations",
        json={"name": "Missing Slug"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "slug is required"


def test_update_organization(client):
    created = create_organization(client)
    organization_id = created.json()["id"]

    response = client.put(
        f"/api/v1/organizations/{organization_id}",
        json={
            "name": "Updated Organization",
            "slug": "updated-organization",
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Organization"
    assert response.json()["slug"] == "updated-organization"


def test_update_missing_organization(client):
    response = client.put(
        "/api/v1/organizations/999999",
        json={
            "name": "Updated Organization",
            "slug": "updated-organization",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Organization not found"


def test_duplicate_organization_slug(client):
    create_organization(client, "Organization One", "shared-slug")

    response = create_organization(
        client,
        "Organization Two",
        "shared-slug",
    )

    assert response.status_code == 409
