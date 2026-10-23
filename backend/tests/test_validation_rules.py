import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def test_dataset():
    response = client.post(
        "/api/v1/datasets",
        json={
            "name": "Automation Test Dataset",
            "description": "Dataset for validation rule tests",
            "organization_id": 1,
        },
    )
    if response.status_code == 201:
        return response.json()

    response = client.get("/api/v1/datasets")
    assert response.status_code == 200, response.text
    data = response.json()
    datasets = data.get("items", data.get("data", [])) if isinstance(data, dict) else data

    for dataset in datasets:
        if dataset.get("name") == "Automation Test Dataset":
            return dataset

    pytest.fail("Could not create or find a test dataset")


@pytest.fixture
def created_rule(test_dataset):
    response = client.post(
        "/api/v1/validation-rules",
        json={
            "dataset_id": test_dataset["id"],
            "name": "Automation Required Field Rule",
            "rule_type": "completeness",
            "description": "Check required fields",
            "configuration": {"column": "email"},
            "is_active": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_get_validation_rules_returns_paginated_object():
    response = client.get("/api/v1/validation-rules")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert isinstance(data["items"], list)
    assert {"total", "page", "page_size", "total_pages"} <= data.keys()


def test_get_validation_rules_search_and_pagination(created_rule):
    response = client.get(
        "/api/v1/validation-rules",
        params={"search": "Automation Required Field", "page": 1, "page_size": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any(item["id"] == created_rule["id"] for item in data["items"])


def test_get_validation_rules_dataset_filter(created_rule):
    response = client.get(
        "/api/v1/validation-rules",
        params={"dataset_id": created_rule["dataset_id"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["dataset_id"] == created_rule["dataset_id"] for item in data["items"])


def test_create_validation_rule(test_dataset):
    response = client.post(
        "/api/v1/validation-rules",
        json={
            "dataset_id": test_dataset["id"],
            "name": "Email Format Rule",
            "rule_type": "format",
            "description": "Validate email format",
            "configuration": {"column": "email"},
            "is_active": True,
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "Email Format Rule"
    assert data["dataset_id"] == test_dataset["id"]


def test_get_validation_rule_by_id(created_rule):
    response = client.get(f"/api/v1/validation-rules/{created_rule['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created_rule["id"]


def test_patch_validation_rule_name(created_rule):
    response = client.patch(
        f"/api/v1/validation-rules/{created_rule['id']}",
        json={"name": "Updated Automation Rule"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Updated Automation Rule"


def test_patch_validation_rule_status(created_rule):
    response = client.patch(
        f"/api/v1/validation-rules/{created_rule['id']}",
        json={"is_active": False},
    )
    assert response.status_code == 200, response.text
    assert response.json()["is_active"] is False


def test_get_missing_validation_rule():
    response = client.get("/api/v1/validation-rules/999999")
    assert response.status_code == 404


def test_patch_missing_validation_rule():
    response = client.patch(
        "/api/v1/validation-rules/999999",
        json={"name": "Updated Rule"},
    )
    assert response.status_code == 404


def test_create_rule_without_name(test_dataset):
    response = client.post(
        "/api/v1/validation-rules",
        json={
            "dataset_id": test_dataset["id"],
            "rule_type": "completeness",
            "configuration": {},
        },
    )
    assert response.status_code == 400


def test_create_rule_with_invalid_dataset():
    response = client.post(
        "/api/v1/validation-rules",
        json={
            "dataset_id": 999999,
            "name": "Invalid Dataset Rule",
            "rule_type": "completeness",
            "configuration": {},
        },
    )
    assert response.status_code == 404


def test_patch_rule_with_empty_payload(created_rule):
    response = client.patch(
        f"/api/v1/validation-rules/{created_rule['id']}",
        json={},
    )
    assert response.status_code == 400
