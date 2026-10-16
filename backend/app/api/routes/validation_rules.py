from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
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


def validate_rule_payload(payload: dict):
    dataset_id = payload.get("dataset_id")
    name = payload.get("name")
    rule_type = payload.get("rule_type")

    if not isinstance(dataset_id, int) or isinstance(dataset_id, bool) or dataset_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="A valid dataset_id is required",
        )

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(status_code=400, detail="name is required")

    if not isinstance(rule_type, str) or not rule_type.strip():
        raise HTTPException(status_code=400, detail="rule_type is required")

    configuration = payload.get("configuration", {})

    if not isinstance(configuration, dict):
        raise HTTPException(
            status_code=400,
            detail="configuration must be a JSON object",
        )

    return dataset_id, name.strip(), rule_type.strip(), configuration


@router.get("")
def get_validation_rules(db: Session = Depends(get_db)):
    return db.query(ValidationRule).all()


@router.post("", status_code=201)
def create_validation_rule(
    payload: dict,
    db: Session = Depends(get_db),
):
    dataset_id, name, rule_type, configuration = validate_rule_payload(payload)

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

    rule = ValidationRule(
        dataset_id=dataset_id,
        name=name,
        rule_type=rule_type,
        description=payload.get("description"),
        configuration=configuration,
        is_active=payload.get("is_active", True),
    )

    db.add(rule)

    try:
        db.commit()
        db.refresh(rule)
        return rule
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not create validation rule. Check the input values.",
        )


@router.put("/{rule_id}")
def update_validation_rule(
    rule_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    rule = (
        db.query(ValidationRule)
        .filter(ValidationRule.id == rule_id)
        .first()
    )

    if not rule:
        raise HTTPException(
            status_code=404,
            detail="Validation rule not found",
        )

    dataset_id, name, rule_type, configuration = validate_rule_payload(payload)

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

    is_active = payload.get("is_active", rule.is_active)

    if not isinstance(is_active, bool):
        raise HTTPException(
            status_code=400,
            detail="is_active must be true or false",
        )

    rule.dataset_id = dataset_id
    rule.name = name
    rule.rule_type = rule_type
    rule.is_active = is_active

    if "description" in payload:
        rule.description = payload["description"]

    if "configuration" in payload:
        rule.configuration = configuration

    try:
        db.commit()
        db.refresh(rule)
        return rule
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not update validation rule. Check the input values.",
        )