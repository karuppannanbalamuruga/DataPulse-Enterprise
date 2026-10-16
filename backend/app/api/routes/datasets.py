
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()


@router.post("", status_code=201)
def create_dataset(payload: dict, db: Session = Depends(get_db)):
    organization_id = payload.get("organization_id")
    name = payload.get("name")

    if not organization_id or not name:
        raise HTTPException(
            status_code=400,
            detail="organization_id and name are required",
        )

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
            detail="Could not create dataset. Check organization_id and input values.",
        )
