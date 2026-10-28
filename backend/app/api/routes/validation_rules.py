
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.validation_rule import ValidationRule
from app.schemas.validation_rule import (
    ValidationRuleCreate,
    ValidationRuleUpdate,
    ValidationRuleStatusUpdate,
    ValidationRuleResponse,
    ValidationRuleListResponse,
)

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


def get_rule_or_404(db: Session, rule_id: int) -> ValidationRule:
    rule = (
        db.query(ValidationRule)
        .filter(ValidationRule.id == rule_id)
        .first()
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Validation rule not found")
    return rule


def ensure_dataset_exists(db: Session, dataset_id: int) -> None:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")


@router.get("", response_model=ValidationRuleListResponse)
def get_validation_rules(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(default=None),
    dataset_id: int | None = Query(default=None, gt=0),
    rule_type: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(ValidationRule)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.join(
            Dataset, ValidationRule.dataset_id == Dataset.id
        ).filter(
            or_(
                ValidationRule.name.ilike(term),
                ValidationRule.description.ilike(term),
                ValidationRule.rule_type.ilike(term),
                Dataset.name.ilike(term),
            )
        )

    if dataset_id is not None:
        query = query.filter(ValidationRule.dataset_id == dataset_id)

    if rule_type:
        query = query.filter(ValidationRule.rule_type == rule_type)

    if is_active is not None:
        query = query.filter(ValidationRule.is_active == is_active)

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


@router.get("/{rule_id}", response_model=ValidationRuleResponse)
def get_validation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    return get_rule_or_404(db, rule_id)


@router.post(
    "",
    response_model=ValidationRuleResponse,
    status_code=201,
)
def create_validation_rule(
    payload: ValidationRuleCreate,
    db: Session = Depends(get_db),
):
    ensure_dataset_exists(db, payload.dataset_id)

    rule = ValidationRule(**payload.model_dump())

    try:
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The rule conflicts with an existing database constraint.",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while creating validation rule.",
        )


@router.patch(
    "/{rule_id}",
    response_model=ValidationRuleResponse,
)
def update_validation_rule(
    rule_id: int,
    payload: ValidationRuleUpdate,
    db: Session = Depends(get_db),
):
    rule = get_rule_or_404(db, rule_id)
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update.",
        )

    # Validate the complete rule after applying partial updates.
    merged = {
        "dataset_id": rule.dataset_id,
        "name": rule.name,
        "rule_type": rule.rule_type,
        "description": rule.description,
        "configuration": rule.configuration or {},
        "is_active": rule.is_active,
    }
    merged.update(updates)

    try:
        validated = ValidationRuleCreate.model_validate(merged)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())

    ensure_dataset_exists(db, validated.dataset_id)

    for field, value in validated.model_dump().items():
        setattr(rule, field, value)

    try:
        db.commit()
        db.refresh(rule)
        return rule
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The update conflicts with a database constraint.",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while updating validation rule.",
        )


@router.patch(
    "/{rule_id}/status",
    response_model=ValidationRuleResponse,
)
def update_validation_rule_status(
    rule_id: int,
    payload: ValidationRuleStatusUpdate,
    db: Session = Depends(get_db),
):
    rule = get_rule_or_404(db, rule_id)
    rule.is_active = payload.is_active

    try:
        db.commit()
        db.refresh(rule)
        return rule
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while updating rule status.",
        )


@router.delete("/{rule_id}", status_code=204)
def delete_validation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    rule = get_rule_or_404(db, rule_id)

    try:
        db.delete(rule)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The rule cannot be deleted because a database constraint prevents it.",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while deleting validation rule.",
        )

    return Response(status_code=204)
