
# DataPulse Enterprise — Architecture

## 1. Project Overview

DataPulse Enterprise is a data management platform designed to organize datasets, define validation rules, and track data processing runs.

## 2. Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **API Documentation:** FastAPI Swagger UI

## 3. System Architecture

```text
User
  |
  v
React + TypeScript Frontend
  |
  | HTTP / REST API
  v
FastAPI Backend
  |
  | SQLAlchemy ORM
  v
PostgreSQL Database
```

## 4. Backend Modules

- `app/main.py` — Application entry point, middleware, health check, and API configuration.
- `app/db/database.py` — Database engine, session configuration, and connection check.
- `app/models/` — SQLAlchemy database model definitions.
- `app/api/routes/` — API route handlers.

## 5. Frontend Modules

- `src/pages/` — Application pages.
- `src/components/` — Reusable UI components.
- `src/services/` — API communication.
- `src/types/` — TypeScript types.

## 6. Database Entities

The initial database design includes:

- Organizations
- Users
- Datasets
- Validation Rules
- Processing Runs

Organizations can have multiple users and datasets. Datasets can have multiple validation rules and processing runs.

## 7. API Design

The backend exposes REST API endpoints for:

- Organizations
- Datasets
- Validation Rules
- Processing Runs
- Health Check

The versioned resource endpoints use the `/api/v1/` prefix.

Interactive API documentation is available at:

`http://127.0.0.1:8000/docs`

## 8. Health Check

**Endpoint:** `GET /health`

The health endpoint checks application health and database connectivity.

Expected successful response:

```json
{
  "status": "healthy",
  "database": "connected"
}
```

## 9. Environment Configuration

Database connection settings are loaded from the backend environment configuration.

- Keep environment files and credentials out of version control.
- Use `.gitignore` to exclude local secrets and generated files.
- Do not commit database passwords or API secrets.

## 10. Current Scope

This stage focuses on foundational project setup, database models, API structure, and architecture documentation.

Full CSV processing, production authentication, and advanced data-quality execution are outside the initial scope.

## 11. Verification Status

- Frontend production build completed successfully in the earlier verification.
- Backend health and PostgreSQL connectivity were verified.
- GET endpoints for organizations, datasets, validation rules, and processing runs returned `200 OK`.
- POST endpoints for organizations, datasets, and validation rules returned `201 Created`.
- The tested processing-run creation endpoint returned `200 OK`.

These results reflect the local development tests performed so far.
