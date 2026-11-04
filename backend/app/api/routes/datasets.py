
import csv
from pathlib import Path
from datetime import datetime
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    UploadFile,
    File,
)

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.organization import Organization

from app.schemas.dataset import (
    DatasetCreate,
    DatasetUpdate,
    DatasetRead,
    DatasetListResponse,
)

from app.services.csv_processor import process_csv
from app.services.csv_service import execute_csv_validation


# ==================================================
# ROUTER CONFIGURATION
# ==================================================

router = APIRouter(
    prefix="/api/v1/datasets",
    tags=["Datasets"],
)


# ==================================================
# CSV UPLOAD CONFIGURATION
# ==================================================

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"


# ==================================================
# DATABASE DEPENDENCY
# ==================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ==================================================
# HELPER FUNCTIONS
# ==================================================

def get_dataset_or_404(
    dataset_id: int,
    db: Session,
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    return dataset


def validate_organization(
    organization_id: int,
    db: Session,
):
    organization = (
        db.query(Organization)
        .filter(Organization.id == organization_id)
        .first()
    )

    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )

    return organization


def ensure_unique_name(
    name: str,
    organization_id: int,
    db: Session,
    exclude_dataset_id: int | None = None,
):
    query = db.query(Dataset).filter(
        Dataset.organization_id == organization_id,
        Dataset.name.ilike(name.strip()),
    )

    if exclude_dataset_id is not None:
        query = query.filter(
            Dataset.id != exclude_dataset_id
        )

    if query.first():
        raise HTTPException(
            status_code=409,
            detail="Dataset name already exists in this organization",
        )


# ==================================================
# GET ALL DATASETS
# ==================================================

@router.get("/", response_model=DatasetListResponse)
def get_datasets(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    organization_id: int | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Dataset)

    if organization_id is not None:
        query = query.filter(
            Dataset.organization_id == organization_id
        )

    if status:
        allowed_statuses = {
            "pending",
            "processing",
            "completed",
            "failed",
        }

        if status not in allowed_statuses:
            raise HTTPException(
                status_code=422,
                detail="Invalid dataset status",
            )

        query = query.filter(
            Dataset.status == status
    )

    if search:
        query = query.filter(
            Dataset.name.ilike(f"%{search}%")
        )

    total = query.count()

    datasets = (
        query
        .order_by(Dataset.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = (
        (total + page_size - 1) // page_size
        if total
        else 0
    )

    return {
        "items": datasets,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ==================================================
# CREATE DATASET
# ==================================================

@router.post(
    "/",
    response_model=DatasetRead,
    status_code=201,
)
def create_dataset(
    payload: DatasetCreate,
    db: Session = Depends(get_db),
):
    validate_organization(
        payload.organization_id,
        db,
    )

    ensure_unique_name(
        payload.name,
        payload.organization_id,
        db,
    )

    dataset = Dataset(**payload.model_dump())

    try:
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return dataset

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Dataset already exists or database constraint failed",
        )

    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to create dataset",
        )


# ==================================================
# GET DATASET BY ID
# ==================================================

@router.get(
    "/{dataset_id}",
    response_model=DatasetRead,
)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    return get_dataset_or_404(
        dataset_id,
        db,
    )


# ==================================================
# UPDATE DATASET
# ==================================================

@router.patch(
    "/{dataset_id}",
    response_model=DatasetRead,
)
def update_dataset(
    dataset_id: int,
    payload: DatasetUpdate,
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(
        dataset_id,
        db,
    )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    new_name = update_data.get(
        "name",
        dataset.name,
    )

    new_organization_id = update_data.get(
        "organization_id",
        dataset.organization_id,
    )

    if new_organization_id != dataset.organization_id:
        validate_organization(
            new_organization_id,
            db,
        )

    if (
        new_name != dataset.name
        or new_organization_id != dataset.organization_id
    ):
        ensure_unique_name(
            new_name,
            new_organization_id,
            db,
            exclude_dataset_id=dataset_id,
        )

    for key, value in update_data.items():
        setattr(dataset, key, value)

    try:
        db.commit()
        db.refresh(dataset)

        return dataset

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Dataset update conflicts with existing data",
        )

    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to update dataset",
        )


# ==================================================
# DELETE DATASET
# ==================================================

@router.delete(
    "/{dataset_id}",
    status_code=204,
)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(
        dataset_id,
        db,
    )

    try:
        db.delete(dataset)
        db.commit()

        return Response(status_code=204)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Dataset cannot be deleted because related records exist",
        )

    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to delete dataset",
        )


# ==================================================
# UPLOAD CSV FILE
# ==================================================

@router.post("/{dataset_id}/upload")
async def upload_dataset_csv(
    dataset_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(
        dataset_id,
        db,
    )

    if (
        not file.filename
        or Path(file.filename).suffix.lower() != ".csv"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported",
        )

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    safe_filename = (
        f"dataset_{dataset_id}_{uuid4().hex}.csv"
    )

    file_path = UPLOAD_DIR / safe_filename

    total_size = 0
    upload_saved = False

    try:
        with file_path.open("wb") as output_file:

            while True:
                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="CSV file size must not exceed 10 MB",
                    )

                output_file.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded CSV file is empty",
            )

        csv_data = process_csv(
            str(file_path)
        )

        old_file_path = dataset.uploaded_file_path

        dataset.uploaded_file_path = str(
            file_path.resolve()
        )

        dataset.uploaded_filename = Path(
            file.filename
        ).name

        dataset.uploaded_at = datetime.utcnow()

        db.commit()
        db.refresh(dataset)

        upload_saved = True

        if old_file_path:
            old_path = Path(
                old_file_path
            ).resolve()

            if (
                old_path.parent == UPLOAD_DIR.resolve()
                and old_path != file_path.resolve()
                and old_path.is_file()
            ):
                old_path.unlink()

        return {
            "message": "CSV uploaded successfully",
            "dataset_id": dataset.id,
            "filename": dataset.uploaded_filename,
            "file_size": total_size,
            "columns": csv_data["columns"],
            "total_rows": csv_data["total_rows"],
            "uploaded_at": dataset.uploaded_at,
        }

    except HTTPException:
        db.rollback()
        raise

    except (
        ValueError,
        UnicodeDecodeError,
        csv.Error,
    ) as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV file: {exc}",
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="CSV upload failed",
        )

    finally:
        await file.close()

        if not upload_saved and file_path.exists():
            file_path.unlink(missing_ok=True)


# ==================================================
# EXECUTE CSV VALIDATION
# ==================================================

@router.post("/{dataset_id}/execute")
def execute_dataset_validation(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(
        dataset_id,
        db,
    )

    if not dataset.uploaded_file_path:
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file before execution",
        )

    file_path = Path(
        dataset.uploaded_file_path
    )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Uploaded CSV file not found",
        )

    try:
        result = execute_csv_validation(
            db=db,
            dataset_id=dataset_id,
            file_path=str(file_path),
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="CSV validation execution failed",
        )
