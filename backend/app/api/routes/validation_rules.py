from math import ceil
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.validation_rule import ValidationRule

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


ALLOWED_FIELDS = {
    "dataset_id",
    "name",
    "rule_type",
    "description",
    "configuration",
    "is_active",
}


def validate_rule_payload(payload: dict[str, Any], partial: bool = False) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")

    if partial and not payload:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    unknown_fields = set(payload) - ALLOWED_FIELDS
    if unknown_fields:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown fields: {', '.join(sorted(unknown_fields))}",
        )

    validated: dict[str, Any] = {}

    def validate_dataset_id(value: Any) -> int:
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            raise HTTPException(status_code=400, detail="A valid dataset_id is required")
        return value

    def validate_name(value: Any) -> str:
        if not isinstance(value, str) or not value.strip():
            raise HTTPException(status_code=400, detail="name is required")
        if len(value.strip()) > 150:
            raise HTTPException(status_code=400, detail="name must be 150 characters or fewer")
        return value.strip()

    def validate_rule_type(value: Any) -> str:
        if not isinstance(value, str) or not value.strip():
            raise HTTPException(status_code=400, detail="rule_type is required")
        if len(value.strip()) > 50:
            raise HTTPException(status_code=400, detail="rule_type must be 50 characters or fewer")
        return value.strip()

    fields = ("dataset_id", "name", "rule_type", "description", "configuration", "is_active")
    for field in fields:
        if field not in payload:
            # Missing optional create fields receive defaults below; missing patch fields stay untouched.
            continue

        value = payload.get(field)
        if field == "dataset_id":
            validated[field] = validate_dataset_id(value)
        elif field == "name":
            validated[field] = validate_name(value)
        elif field == "rule_type":
            validated[field] = validate_rule_type(value)
        elif field == "description":
            if value is not None and not isinstance(value, str):
                raise HTTPException(status_code=400, detail="description must be a string or null")
            validated[field] = value.strip() if isinstance(value, str) else None
        elif field == "configuration":
            if value is None:
                raise HTTPException(status_code=400, detail="configuration must be a JSON object")
            if not isinstance(value, dict):
                raise HTTPException(status_code=400, detail="configuration must be a JSON object")
            validated[field] = value
        elif field == "is_active":
            if not isinstance(value, bool):
                raise HTTPException(status_code=400, detail="is_active must be true or false")
            validated[field] = value

    if not partial:
        for required_field in ("dataset_id", "name", "rule_type"):
            if required_field not in validated:
                if required_field == "dataset_id":
                    raise HTTPException(status_code=400, detail="A valid dataset_id is required")
                raise HTTPException(status_code=400, detail=f"{required_field} is required")
        validated.setdefault("description", None)
        validated.setdefault("configuration", {})
        validated.setdefault("is_active", True)

    return validated


@router.get("")
def get_validation_rules(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(default=None),
    dataset_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    query = db.query(ValidationRule)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.join(Dataset, ValidationRule.dataset_id == Dataset.id).filter(
            or_(
                ValidationRule.name.ilike(term),
                ValidationRule.description.ilike(term),
                ValidationRule.rule_type.ilike(term),
                Dataset.name.ilike(term),
            )
        )

    if dataset_id is not None:
        query = query.filter(ValidationRule.dataset_id == dataset_id)

    total = query.count()
    total_pages = ceil(total / page_size) if total else 0
    items = (
        query.order_by(ValidationRule.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{rule_id}")
def get_validation_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(ValidationRule).filter(ValidationRule.id == rule_id).first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Validation rule not found")
    return rule


@router.post("", status_code=201)
def create_validation_rule(payload: dict[str, Any], db: Session = Depends(get_db)):
    validated = validate_rule_payload(payload)

    dataset = db.query(Dataset).filter(Dataset.id == validated["dataset_id"]).first()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rule = ValidationRule(**validated)
    try:
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not create validation rule. Check the input values.",
        )


@router.patch("/{rule_id}")
def update_validation_rule(
    rule_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
):
    updates = validate_rule_payload(payload, partial=True)

    rule = db.query(ValidationRule).filter(ValidationRule.id == rule_id).first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Validation rule not found")

    if "dataset_id" in updates:
        dataset = db.query(Dataset).filter(Dataset.id == updates["dataset_id"]).first()
        if dataset is None:
            raise HTTPException(status_code=404, detail="Dataset not found")

    for field, value in updates.items():
        setattr(rule, field, value)

    try:
        db.commit()
        db.refresh(rule)
        return rule
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Could not update validation rule. Check the input values.",
        )
