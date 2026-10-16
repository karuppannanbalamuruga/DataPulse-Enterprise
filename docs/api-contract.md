
# DataPulse Enterprise — API Contract

## 1. Overview

The DataPulse Enterprise backend uses FastAPI to expose REST API endpoints.

Interactive API documentation is available at `/docs`.

**Base URL:** `http://127.0.0.1:8000`

## 2. Health Check

### GET `/health`

Checks application health and database connectivity.

**Success response:** `200 OK`

```json
{
  "status": "healthy",
  "database": "connected"
}
```

## 3. Organizations

### GET `/api/v1/organizations`

Retrieves organizations.

**Verified response:** `200 OK`

Response fields:
- `id`
- `name`
- `slug`

### POST `/api/v1/organizations`

Creates an organization.

**Verified request body:**

```json
{
  "name": "Checklist Test Org",
  "slug": "checklist-test-org"
}
```

**Verified response:** `201 Created`

Response fields:
- `id`
- `name`
- `slug`

## 4. Datasets

### GET `/api/v1/datasets`

Retrieves datasets.

**Verified response:** `200 OK`

Response fields:
- `id`
- `name`
- `description`
- `created_at`
- `organization_id`
- `source_type`
- `status`

### POST `/api/v1/datasets`

Creates a dataset.

**Verified request body:**

```json
{
  "name": "Checklist Test Dataset",
  "description": "Dataset created during API verification",
  "organization_id": 1,
  "source_type": "file",
  "status": "pending"
}
```

**Verified response:** `201 Created`

## 5. Validation Rules

### GET `/api/v1/validation-rules`

Retrieves validation rules.

**Verified response:** `200 OK`

Response fields:
- `id`
- `dataset_id`
- `name`
- `rule_type`
- `description`
- `configuration`
- `is_active`
- `created_at`

### POST `/api/v1/validation-rules`

Creates a validation rule.

**Verified request body:**

```json
{
  "dataset_id": 4,
  "name": "Checklist Not Null Rule",
  "rule_type": "not_null",
  "description": "Verify that required values are not empty",
  "configuration": {},
  "is_active": true
}
```

**Verified response:** `201 Created`

## 6. Processing Runs

### GET `/api/v1/processing-runs`

Retrieves processing runs.

**Verified response:** `200 OK`

Response fields:
- `id`
- `dataset_id`
- `status`
- `records_processed`
- `error_message`
- `started_at`
- `completed_at`

### POST `/api/v1/processing-runs`

Creates a processing run for an existing dataset.

The tested request uses the `dataset_id` query parameter.

**Verified response:** `200 OK`

Response fields:
- `id`
- `dataset_id`
- `status`
- `records_processed`
- `error_message`
- `started_at`
- `completed_at`

## 7. Error Handling

Error responses may occur when request data is invalid, a referenced record does not exist, or a server-side operation fails.

Consult `/docs` for the declared response schemas and status codes.

## 8. API Verification

Open `http://127.0.0.1:8000/docs` to inspect and test the API endpoints.

The GET endpoints and the POST endpoints listed above were tested successfully in the local development environment.

## 9. Scope

This document describes the foundational API currently verified in local development.

Full CSV processing, production authentication, and advanced data-quality execution are outside the initial scope.
