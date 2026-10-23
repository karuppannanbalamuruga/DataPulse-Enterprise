
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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

router = APIRouter(
    prefix="/api/v1/datasets",
    tags=["Datasets"],
)

ALLOWED_STATUSES = {
    "pending",
    "processing",
    "completed",
    "failed",
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_dataset_or_404(dataset_id: int, db: Session) -> Dataset:
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if dataset is None:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found",
        )

    return dataset


def validate_organization(organization_id: int, db: Session) -> None:
    organization = (
        db.query(Organization)
        .filter(Organization.id == organization_id)
        .first()
    )

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )


def ensure_unique_name(
    organization_id: int,
    name: str,
    db: Session,
    exclude_dataset_id: int | None = None,
) -> None:
    query = db.query(Dataset).filter(
        Dataset.organization_id == organization_id,
        func.lower(Dataset.name) == name.strip().lower(),
    )

    if exclude_dataset_id is not None:
        query = query.filter(Dataset.id != exclude_dataset_id)

    if query.first() is not None:
        raise HTTPException(
            status_code=409,
            detail="A dataset with this name already exists in this organization.",
        )


@router.get("", response_model=DatasetListResponse)
def get_datasets(
    search: str | None = Query(default=None, max_length=255),
    status: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Dataset)

    if search and search.strip():
        query = query.filter(
            Dataset.name.ilike(f"%{search.strip()}%")
        )

    if status:
        normalized_status = status.strip().lower()

        if normalized_status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=422,
                detail="Invalid status filter.",
            )

        query = query.filter(
            func.lower(Dataset.status) == normalized_status
        )

    if source_type and source_type.strip():
        query = query.filter(
            func.lower(Dataset.source_type) == source_type.strip().lower()
        )

    total = query.count()

    items = (
        query.order_by(Dataset.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total else 0,
    }


@router.post("", response_model=DatasetRead, status_code=201)
def create_dataset(
    payload: DatasetCreate,
    db: Session = Depends(get_db),
):
    organization_id = payload.organization_id
    name = payload.name.strip()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Dataset name cannot be empty.",
        )

    validate_organization(organization_id, db)
    ensure_unique_name(organization_id, name, db)

    dataset = Dataset(
        organization_id=organization_id,
        name=name,
        description=payload.description,
        source_type=payload.source_type,
        status="pending",
    )

    try:
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        return dataset
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Dataset could not be created because of a database constraint.",
        )


@router.get("/{dataset_id}", response_model=DatasetRead)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    return get_dataset_or_404(dataset_id, db)


@router.patch("/{dataset_id}", response_model=DatasetRead)
def update_dataset(
    dataset_id: int,
    payload: DatasetUpdate,
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(dataset_id, db)

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update.",
        )

    if "organization_id" in updates:
        if updates["organization_id"] is None:
            raise HTTPException(
                status_code=422,
                detail="organization_id cannot be null.",
            )

        validate_organization(updates["organization_id"], db)

    if "name" in updates:
        if updates["name"] is None or not updates["name"].strip():
            raise HTTPException(
                status_code=422,
                detail="Dataset name cannot be empty.",
            )

        updates["name"] = updates["name"].strip()

    if "description" in updates and updates["description"] is not None:
        updates["description"] = updates["description"].strip()

    new_organization_id = updates.get(
        "organization_id", dataset.organization_id
    )
    new_name = updates.get("name", dataset.name)

    if "name" in updates or "organization_id" in updates:
        ensure_unique_name(
            new_organization_id,
            new_name,
            db,
            exclude_dataset_id=dataset.id,
        )

    for field, value in updates.items():
        setattr(dataset, field, value)

    try:
        db.commit()
        db.refresh(dataset)
        return dataset
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Dataset could not be updated because of a database constraint.",
        )
