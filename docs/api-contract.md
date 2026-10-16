# DataPulse Enterprise — API Contract

## 1. Overview

The backend uses FastAPI to expose REST API endpoints. Interactive API documentation is available at `/docs`.

Base URL for local development:

`http://127.0.0.1:8000`

## 2. Health Check

### GET `/health`

Checks application health and database connectivity.

**Success response:** HTTP 200

```json
{
  "status": "healthy",
  "database": "connected"
}
```

The exact error response depends on the backend implementation.

## 3. Organizations

The organization API is registered under the `/api/v1/organizations` route prefix.

Verify available methods and request schemas in `/docs`.

## 4. Datasets

### GET `/api/v1/datasets`

Retrieves datasets according to the implemented endpoint behavior.

### POST `/api/v1/datasets`

Creates a dataset using the request payload accepted by the backend.

The current frontend sends organization ID, name, description, and source type when creating a dataset. Confirm the exact schema in Swagger before making requests.

## 5. Validation Rules

The validation rules API is registered under `/api/v1/validation-rules`.

Check `/docs` for the supported HTTP methods, request parameters, and response schemas.

## 6. Processing Runs

### GET `/api/v1/processing-runs`

Retrieves processing runs.

### POST `/api/v1/processing-runs`

Creates a processing run. The current backend expects a `dataset_id` query parameter and checks whether the referenced dataset exists.

## 7. Error Handling

The API may return HTTP error responses when requests are invalid, referenced records do not exist, or a server-side operation fails. Refer to the live Swagger documentation for each endpoint's declared responses.

## 8. API Verification

Open:

`http://127.0.0.1:8000/docs`

Use the Swagger UI to inspect endpoint schemas and test the API.

## 9. Scope

This contract documents the current foundational API. Full CSV processing, production authentication, and advanced data-quality execution are outside the initial scope.