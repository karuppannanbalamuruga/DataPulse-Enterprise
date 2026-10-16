
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.validation_rule import ValidationRule
from app.models.dataset import Dataset

router = APIRouter(
    prefix="/api/v1/validation-rules",
    tags=["Validation Rules"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ValidationRuleCreate(BaseModel):
    dataset_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=255)
    rule_type: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: bool = True


@router.get("")
def get_validation_rules(db: Session = Depends(get_db)):
    return db.query(ValidationRule).all()


@router.post("", status_code=201)
def create_validation_rule(
    payload: ValidationRuleCreate,
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == payload.dataset_id)
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found. Please provide a valid dataset_id.",
        )

    rule = ValidationRule(
        dataset_id=payload.dataset_id,
        name=payload.name.strip(),
        rule_type=payload.rule_type.strip(),
        description=payload.description,
        is_active=payload.is_active,
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule
