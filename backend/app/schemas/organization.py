
from pydantic import BaseModel, ConfigDict, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    slug: str = Field(min_length=1, max_length=100)


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=150)
    slug: str | None = Field(default=None, max_length=100)


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)
