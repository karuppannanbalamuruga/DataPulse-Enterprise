# DataPulse Enterprise

A data management platform built with React, TypeScript, FastAPI, and PostgreSQL.

## Features

- Organization management
- Dataset management
- Validation rules
- Processing run tracking

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI
- **Database:** PostgreSQL
- **API Client:** Axios

## Prerequisites

Install the following before running the project:

- Node.js and npm
- Python 3.10 or a compatible version supported by the backend dependencies
- PostgreSQL
- Git

## Project Structure

```text
DataPulse-Enterprise/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   └── api-contract.md
└── README.md
```

*Note: Adjust the folder structure above to match your actual project.*

## Setup Instructions

### 1. Clone the Repository

```powershell
git clone <your-repository-url>
cd DataPulse-Enterprise
```

### 2. Configure PostgreSQL

Create the project database in PostgreSQL:

```sql
CREATE DATABASE datapulse_db;
```

Make sure PostgreSQL is running and configure the database connection using the environment variables expected by your backend.

Example configuration:

```env
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/datapulse_db
```

Replace the placeholders with your local PostgreSQL credentials. Use the database URL format required by your installed database driver.

### 3. Set Up the Backend

Open a terminal in the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks virtual environment activation, use an approved local execution-policy setting or activate the environment through Command Prompt instead.

Configure the required environment variables before starting the server.

Start FastAPI:

```powershell
python -m uvicorn app.main:app --reload
```

Backend URL:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

Alternative API documentation:

`http://127.0.0.1:8000/redoc`

### 4. Set Up the Frontend

Open a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal, typically:

`http://localhost:5173`

If the frontend uses an environment variable for the API URL, configure it in the frontend environment file according to the existing Axios configuration.

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 5. Verify the Application

- Confirm that PostgreSQL is running.
- Confirm that the FastAPI server starts successfully.
- Open `http://127.0.0.1:8000/health` if the health endpoint is configured.
- Open the frontend in your browser.
- Test organization and dataset operations through the UI.
- Review API responses and error messages in the browser developer tools.

## API Endpoints

Base URL:

`http://127.0.0.1:8000`

The following endpoint paths summarize the known dataset API and the expected resource groups. Confirm the final routes and HTTP methods in the backend route files or `/docs` before treating this table as the complete API contract.

### Dataset Management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/datasets` | List datasets; supports configured search, filtering, and pagination |
| GET | `/api/v1/datasets/{id}` | Retrieve a dataset by ID |
| POST | `/api/v1/datasets` | Create a dataset |
| PATCH | `/api/v1/datasets/{id}` | Update an existing dataset |

### Organization Management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/organizations` | Retrieve organizations for dataset association |

*Add organization create, update, and delete endpoints here only after confirming their implementation.*

### Validation Rules

Document the implemented validation-rule endpoints here. Confirm the paths and HTTP methods in the backend router or `/docs`.

### Processing Runs

Document the implemented processing-run endpoints here. Confirm the paths and HTTP methods in the backend router or `/docs`.

## Dataset API Examples

### List Datasets

```http
GET /api/v1/datasets
```

### Get a Dataset

```http
GET /api/v1/datasets/{id}
```

### Create a Dataset

```http
POST /api/v1/datasets
Content-Type: application/json
```

Use the request fields defined by the backend dataset creation schema. Example payload structure:

```json
{
  "name": "Sales Data",
  "description": "Monthly sales dataset",
  "source_type": "csv",
  "organization_id": 1
}
```

*Confirm that these fields and values match your current Pydantic schema before using the example.*

### Update a Dataset

```http
PATCH /api/v1/datasets/{id}
Content-Type: application/json
```

Send only the fields supported by the dataset update schema.

## Documentation

- [Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.md)
- [API Contract](docs/api-contract.md)

## Testing

Run backend tests from the backend directory using the test command configured for your project. For example:

```powershell
pytest -v
```

Build the frontend to check for TypeScript and build errors:

```powershell
cd frontend
npm run build
```

## Security

- Never commit `.env` files, passwords, database credentials, or API secrets to GitHub.
- Add environment files to `.gitignore`.
- Use environment variables for local configuration.
- Do not expose production credentials in logs or API responses.
- Validate request data on the backend.
- Use appropriate authentication and authorization before exposing protected endpoints.

## Troubleshooting

- **Database connection error:** Verify PostgreSQL is running and check the database URL.
- **Missing Python dependencies:** Activate the virtual environment and run `pip install -r requirements.txt`.
- **Frontend dependency error:** Run `npm install` inside `frontend`.
- **API connection error:** Check that FastAPI is running and the frontend API base URL is correct.
- **Port already in use:** Stop the process using the port or configure another available port.

## License

Add the appropriate license information before distributing this project.

### Validation Rules Management

The Validation Rules module allows users to create, retrieve, update, enable, disable, search, filter, and delete data-quality validation rules associated with registered datasets.

#### Supported Validation Types

| Validation Type | Purpose | Configuration |
|---|---|---|
| `required_field` | Detect missing or null values | `{}` |
| `unique_value` | Detect duplicate values | `{}` |
| `data_type` | Validate the expected data type | `{"expected_type": "integer"}` |
| `numeric_range` | Validate numeric minimum and maximum values | `{"min": 18, "max": 100}` |
| `string_length` | Validate minimum and maximum string lengths | `{"min_length": 2, "max_length": 100}` |
| `format_validation` | Validate supported formats | `{"format": "email"}` |

#### Validation Rules API

Base path: `/api/v1/validation-rules`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/validation-rules` | Create a validation rule |
| GET | `/api/v1/validation-rules` | List rules with supported search, filters, and pagination |
| GET | `/api/v1/validation-rules/{rule_id}` | Retrieve a specific rule |
| PATCH | `/api/v1/validation-rules/{rule_id}` | Update a rule |
| PATCH | `/api/v1/validation-rules/{rule_id}/status` | Enable or disable a rule |
| DELETE | `/api/v1/validation-rules/{rule_id}` | Delete a rule |

Use the interactive API documentation at `/docs` to inspect the actual request schemas, query parameters, response models, and error responses.

#### Example: Create a Validation Rule

`POST /api/v1/validation-rules`

Example payload for a numeric range rule:

```json
{
  "dataset_id": 1,
  "name": "Age Range Validation",
  "column_name": "age",
  "rule_type": "numeric_range",
  "configuration": {
    "min": 18,
    "max": 100
  },
  "is_active": true
}
```

Use a dataset ID that exists in your database. Confirm the request field names against the actual Pydantic schema before using this example.

#### Search, Filtering, and Pagination

The list endpoint supports the query parameters implemented by the backend, such as:

- `page` and `page_size` for pagination
- `search` for searching rule names
- `dataset_id` for filtering by dataset

Validation-type and status filters should be documented using their exact implemented query parameter names.

#### Scope

This module manages validation rule definitions and their configurations. Executing rules against dataset records and generating data-quality scores are outside the scope of this task.

