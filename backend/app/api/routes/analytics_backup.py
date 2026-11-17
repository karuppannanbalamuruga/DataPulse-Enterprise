
from datetime import date
from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from sqlalchemy.orm import Session

from app.db.database import SessionLocal

from app.services.analytics_service import (
    get_analytics_overview,
    get_quality_trends,
)


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


# --------------------------------------------------
# DATABASE CONNECTION
# --------------------------------------------------

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# --------------------------------------------------
# 1. OVERVIEW API
# --------------------------------------------------

@router.get("/overview")
def analytics_overview(
    db: Session = Depends(get_db),
):

    return get_analytics_overview(db)


# --------------------------------------------------
# 2. QUALITY TRENDS API
# --------------------------------------------------

@router.get("/quality-trends")
def quality_trends(

    dataset_id: int | None = Query(
        default=None,
        gt=0,
    ),

    start_date: date | None = None,

    end_date: date | None = None,

    group_by: Literal[
        "daily",
        "weekly",
        "monthly",
    ] = "daily",

    db: Session = Depends(get_db),

):

    # Validate date range
    if start_date and end_date and start_date > end_date:

        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    # Validate dataset ID
    if dataset_id is not None:

        from app.models.dataset import Dataset

        dataset_exists = (
            db.query(Dataset.id)
            .filter(Dataset.id == dataset_id)
            .first()
        )

        if not dataset_exists:

            raise HTTPException(
                status_code=404,
                detail="Dataset not found",
            )

    return {
        "group_by": group_by,

        "items": get_quality_trends(
            db=db,
            dataset_id=dataset_id,
            start_date=start_date,
            end_date=end_date,
            group_by=group_by,
        ),
    }
