
from datetime import datetime
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.alert import Alert

from app.services.notification_service import (
    create_in_app_notifications_for_alert,
    send_email_notifications_for_alert,
)


router = APIRouter(
    prefix="/api/v1/alerts",
    tags=["Alerts"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_alert_or_404(
    db: Session,
    alert_id: int,
) -> Alert:

    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found.",
        )

    return alert


# =====================================================
# 1. GET ALL ALERTS WITH PAGINATION AND FILTERS
# =====================================================

@router.get("")
def get_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    dataset_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    """
    Get paginated alerts with optional status,
    severity, and dataset filters.
    """

    query = db.query(Alert)

    # Status filter
    if status:
        query = query.filter(
            Alert.status == status
        )

    # Severity filter
    if severity:
        query = query.filter(
            Alert.severity == severity
        )

    # Dataset filter
    if dataset_id is not None:
        query = query.filter(
            Alert.dataset_id == dataset_id
        )

    # Total records
    total = query.count()

    # Total pages
    total_pages = (
        ceil(total / page_size)
        if total
        else 0
    )

    # Fetch alerts
    alerts = (
        query
        .order_by(Alert.triggered_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": alert.id,
            "alert_rule_id": alert.alert_rule_id,
            "dataset_id": alert.dataset_id,
            "processing_run_id": alert.processing_run_id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "observed_value": alert.observed_value,
            "configured_threshold": alert.configured_threshold,
            "status": alert.status,
            "triggered_at": alert.triggered_at,
            "acknowledged_at": alert.acknowledged_at,
            "resolved_at": alert.resolved_at,
        }
        for alert in alerts
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# =====================================================
# 2. GET ALERT DETAILS
# =====================================================

@router.get("/{alert_id}")
def get_alert_details(
    alert_id: int,
    db: Session = Depends(get_db),
):
    """Get alert details."""

    alert = get_alert_or_404(db, alert_id)

    return {
        "id": alert.id,
        "alert_rule_id": alert.alert_rule_id,
        "dataset_id": alert.dataset_id,
        "processing_run_id": alert.processing_run_id,
        "title": alert.title,
        "description": alert.description,
        "severity": alert.severity,
        "observed_value": alert.observed_value,
        "configured_threshold": alert.configured_threshold,
        "status": alert.status,
        "triggered_at": alert.triggered_at,
        "acknowledged_at": alert.acknowledged_at,
        "resolved_at": alert.resolved_at,
    }


# =====================================================
# 3. ACKNOWLEDGE ALERT
# =====================================================

@router.patch("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
):
    """Acknowledge an open alert."""

    alert = get_alert_or_404(db, alert_id)

    if alert.status == "resolved":
        raise HTTPException(
            status_code=409,
            detail="A resolved alert cannot be acknowledged.",
        )

    if alert.status == "acknowledged":
        return {
            "message": "Alert is already acknowledged.",
            "alert_id": alert.id,
            "status": alert.status,
            "acknowledged_at": alert.acknowledged_at,
        }

    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(alert)

        return {
            "message": "Alert acknowledged successfully.",
            "alert_id": alert.id,
            "status": alert.status,
            "acknowledged_at": alert.acknowledged_at,
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while acknowledging alert.",
        )


# =====================================================
# 4. RESOLVE ALERT
# =====================================================

@router.patch("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
):
    """Resolve an alert."""

    alert = get_alert_or_404(db, alert_id)

    if alert.status == "resolved":
        return {
            "message": "Alert is already resolved.",
            "alert_id": alert.id,
            "status": alert.status,
            "resolved_at": alert.resolved_at,
        }

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(alert)

        return {
            "message": "Alert resolved successfully.",
            "alert_id": alert.id,
            "status": alert.status,
            "acknowledged_at": alert.acknowledged_at,
            "resolved_at": alert.resolved_at,
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error while resolving alert.",
        )
