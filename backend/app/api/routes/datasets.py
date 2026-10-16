from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.organization import Organization

router = APIRouter(
    prefix="/api/v1/datasets",
    tags=["Datasets"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def validate_dataset_payload(payload: dict, db: Session):
    organization_id = payload.get("organization_id")
    name = payload.get("name")

    if not isinstance(organization_id, int) or isinstance(organization_id, bool) or organization_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="A valid organization_id is required",
        )

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            status_code=400,
            detail="name is required",
        )

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

    return organization_id, name.strip()


@router.get("")
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()


@router.post("", status_code=201)
def create_dataset(payload: dict, db: Session = Depends(get_db)):
    organization_id, name = validate_dataset_payload(payload, db)

    dataset = Dataset(
        organization_id=organization_id,
        name=name,
        description=payload.get("description"),
        source_type=payload.get("source_type", "file"),
        status="pending",
    )

    db.add(dataset)

    try:
        db.commit()
        db.refresh(dataset)
        return dataset
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not create dataset. Check the input values.",
        )


@router.put("/{dataset_id}")
def update_dataset(
    dataset_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    organization_id, name = validate_dataset_payload(payload, db)

    dataset.organization_id = organization_id
    dataset.name = name

    if "description" in payload:
        dataset.description = payload["description"]

    if "source_type" in payload:
        dataset.source_type = payload["source_type"]

    if "status" in payload:
        allowed_statuses = {"pending", "processing", "completed", "failed"}

        if payload["status"] not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"status must be one of: {', '.join(sorted(allowed_statuses))}",
            )

        dataset.status = payload["status"]

    try:
        db.commit()
        db.refresh(dataset)
        return dataset
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not update dataset. Check the input values.",
        )