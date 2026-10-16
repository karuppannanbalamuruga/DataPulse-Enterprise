# DataPulse Enterprise

A data management platform built with React, TypeScript, FastAPI, and PostgreSQL.

## Features

- Organization management
- Dataset management
- Validation rules
- Processing run tracking

## Run the Project

### Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

### Frontend

Open a separate terminal:

```powershell
cd frontend
npm run dev
```

## Documentation

- [Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.md)
- [API Contract](docs/api-contract.md)

## Security

Never commit `.env` files or database credentials to GitHub.
