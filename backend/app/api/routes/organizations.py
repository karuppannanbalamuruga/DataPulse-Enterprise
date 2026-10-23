from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
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


def get_organization_or_404(
    organization_id: int,
    db: Session,
) -> Organization:
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

    return organization


# GET API 1: Get all organizations
@router.get("")
def get_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Organization)

    total = query.count()

    organizations = (
        query
        .order_by(Organization.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": organizations,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total else 0,
    }


# GET API 2: Get organization by ID
@router.get("/{organization_id}")
def get_organization(
    organization_id: int,
    db: Session = Depends(get_db),
):
    return get_organization_or_404(organization_id, db)


# POST API: Create organization
@router.post("", status_code=201)
def create_organization(
    payload: dict,
    db: Session = Depends(get_db),
):
    name = payload.get("name")
    slug = payload.get("slug")

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            status_code=400,
            detail="name is required",
        )

    if not isinstance(slug, str) or not slug.strip():
        raise HTTPException(
            status_code=400,
            detail="slug is required",
        )

    organization = Organization(
        name=name.strip(),
        slug=slug.strip(),
    )

    db.add(organization)

    try:
        db.commit()
        db.refresh(organization)
        return organization
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Organization could not be created. Name or slug may already exist.",
        )


# PATCH API: Partially update organization
@router.patch("/{organization_id}")
def update_organization(
    organization_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    organization = get_organization_or_404(organization_id, db)

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="At least one field (name or slug) is required",
        )

    if not set(payload.keys()).issubset({"name", "slug"}):
        raise HTTPException(
            status_code=400,
            detail="Only name and slug can be updated",
        )

    if "name" in payload:
        name = payload["name"]

        if not isinstance(name, str) or not name.strip():
            raise HTTPException(
                status_code=400,
                detail="name cannot be empty",
            )

        organization.name = name.strip()

    if "slug" in payload:
        slug = payload["slug"]

        if not isinstance(slug, str) or not slug.strip():
            raise HTTPException(
                status_code=400,
                detail="slug cannot be empty",
            )

        organization.slug = slug.strip()

    try:
        db.commit()
        db.refresh(organization)
        return organization
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Organization could not be updated. Name or slug may already exist.",
        )


# DELETE API: Delete organization by ID
@router.delete("/{organization_id}", status_code=204)
def delete_organization(
    organization_id: int,
    db: Session = Depends(get_db),
):
    organization = get_organization_or_404(organization_id, db)

    try:
        db.delete(organization)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Organization cannot be deleted because it has related records "
                "or a database constraint prevents deletion."
            ),
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="A database error occurred while deleting the organization.",
        )

    return Response(status_code=204)
