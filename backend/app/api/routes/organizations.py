
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.organization import Organization

router = APIRouter(
    prefix="/api/v1/organizations",
    tags=["Organizations"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_organizations(db: Session = Depends(get_db)):
    return db.query(Organization).all()


@router.post("", status_code=201)
def create_organization(payload: dict, db: Session = Depends(get_db)):
    name = payload.get("name")
    slug = payload.get("slug")

    if not name or not slug:
        raise HTTPException(
            status_code=400,
            detail="name and slug are required",
        )

    organization = Organization(name=name, slug=slug)
    db.add(organization)

    try:
        db.commit()
        db.refresh(organization)
        return organization
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Organization could not be created. Name or slug may already exist.",
        )
