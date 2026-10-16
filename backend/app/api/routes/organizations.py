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

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(status_code=400, detail="name is required")

    if not isinstance(slug, str) or not slug.strip():
        raise HTTPException(status_code=400, detail="slug is required")

    organization = Organization(
        name=name.strip(),
        slug=slug.strip(),
    )

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


@router.put("/{organization_id}")
def update_organization(
    organization_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(Organization.id == organization_id)
        .first()
    )

    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    name = payload.get("name")
    slug = payload.get("slug")

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(status_code=400, detail="name is required")

    if not isinstance(slug, str) or not slug.strip():
        raise HTTPException(status_code=400, detail="slug is required")

    organization.name = name.strip()
    organization.slug = slug.strip()

    try:
        db.commit()
        db.refresh(organization)
        return organization
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Organization could not be updated. Name or slug may already exist.",
        )