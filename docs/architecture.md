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
  | SQLAlchemy
  v
PostgreSQL Database
```

## 4. Backend Modules

- `app/main.py` — Application entry point and API configuration.
- `app/db/database.py` — Database configuration and connection.
- `app/models/` — Database model definitions.
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

## 7. API Documentation

FastAPI provides interactive API documentation at:

`http://127.0.0.1:8000/docs`

## 8. Health Check

The backend health endpoint is:

`GET /health`

It reports application health and database connectivity.

## 9. Environment Configuration

Database connection settings are maintained in the backend environment configuration. Secrets must not be committed to version control.

## 10. Current Scope

This stage focuses on foundational setup, database models, API structure, and project architecture. Full data processing, production authentication, and CSV upload functionality are outside the initial scope.