
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.alert_rule import AlertRule
from app.models.organization import Organization
from app.models.dataset import Dataset
from app.schemas.alert_rule import (
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertRuleStatusUpdate,
    AlertRuleResponse,
    AlertRuleListResponse,
)


router = APIRouter(
    prefix="/api/v1/alert-rules",
    tags=["Alert Rules"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_alert_rule_or_404(
    db: Session,
    rule_id: int,
) -> AlertRule:
    rule = (
        db.query(AlertRule)
        .filter(AlertRule.id == rule_id)
        .first()
    )

    if rule is None:
        raise HTTPException(
            status_code=404,
            detail="Alert rule not found",
        )

    return rule


def ensure_organization_exists(
    db: Session,
    organization_id: int,
) -> None:
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


def ensure_dataset_belongs_to_organization(
    db: Session,
    dataset_id: int | None,
    organization_id: int,
) -> None:
    if dataset_id is None:
        return

    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.organization_id == organization_id,
        )
        .first()
    )

    if dataset is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Dataset not found or does not belong "
                "to the selected organization."
            ),
        )


@router.get("", response_model=AlertRuleListResponse)
def get_alert_rules(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(default=None),
    organization_id: int | None = Query(default=None, gt=0),
    dataset_id: int | None = Query(default=None, gt=0),
    condition_type: str | None = Query(default=None),
    is_enabled: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(AlertRule)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AlertRule.name.ilike(term),
                AlertRule.condition_type.ilike(term),
            )
        )

    if organization_id is not None:
        query = query.filter(
            AlertRule.organization_id == organization_id
        )

    if dataset_id is not None:
        query = query.filter(
            AlertRule.dataset_id == dataset_id
        )

    if condition_type:
        query = query.filter(
            AlertRule.condition_type == condition_type
        )

    if is_enabled is not None:
        query = query.filter(
            AlertRule.is_enabled == is_enabled
        )

    total = query.count()
    total_pages = ceil(total / page_size) if total else 0

    items = (
        query.order_by(AlertRule.id.desc())
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


@router.get(
    "/{rule_id}",
    response_model=AlertRuleResponse,
)
def get_alert_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    return get_alert_rule_or_404(db, rule_id)


@router.post(
    "",
    response_model=AlertRuleResponse,
    status_code=201,
)
def create_alert_rule(
    payload: AlertRuleCreate,
    db: Session = Depends(get_db),
):
    ensure_organization_exists(
        db,
        payload.organization_id,
    )

    ensure_dataset_belongs_to_organization(
        db,
        payload.dataset_id,
        payload.organization_id,
    )

    rule = AlertRule(**payload.model_dump())

    try:
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Alert rule conflicts with a database constraint.",
        )

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while creating alert rule.",
        )


@router.patch(
    "/{rule_id}",
    response_model=AlertRuleResponse,
)
def update_alert_rule(
    rule_id: int,
    payload: AlertRuleUpdate,
    db: Session = Depends(get_db),
):
    rule = get_alert_rule_or_404(db, rule_id)

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update.",
        )

    merged = {
        "organization_id": rule.organization_id,
        "dataset_id": rule.dataset_id,
        "name": rule.name,
        "condition_type": rule.condition_type,
        "configuration": rule.configuration or {},
        "severity": rule.severity,
        "notification_preferences": (
            rule.notification_preferences or {}
        ),
        "is_enabled": rule.is_enabled,
    }

    merged.update(updates)

    try:
        validated = AlertRuleCreate.model_validate(merged)

    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(),
        )

    ensure_organization_exists(
        db,
        validated.organization_id,
    )

    ensure_dataset_belongs_to_organization(
        db,
        validated.dataset_id,
        validated.organization_id,
    )

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
            detail="Alert rule update conflicts with a database constraint.",
        )

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while updating alert rule.",
        )


@router.patch(
    "/{rule_id}/status",
    response_model=AlertRuleResponse,
)
def update_alert_rule_status(
    rule_id: int,
    payload: AlertRuleStatusUpdate,
    db: Session = Depends(get_db),
):
    rule = get_alert_rule_or_404(db, rule_id)

    rule.is_enabled = payload.is_enabled

    try:
        db.commit()
        db.refresh(rule)
        return rule

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while updating alert rule status.",
        )


@router.delete(
    "/{rule_id}",
    status_code=204,
)
def delete_alert_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    rule = get_alert_rule_or_404(db, rule_id)

    try:
        db.delete(rule)
        db.commit()

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Alert rule cannot be deleted due to a database constraint.",
        )

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while deleting alert rule.",
        )

    return Response(status_code=204)
