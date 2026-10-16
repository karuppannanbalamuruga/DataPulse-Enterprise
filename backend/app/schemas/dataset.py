from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DatasetCreate(BaseModel):
    organization_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    source_type: str = Field(default="file", max_length=50)
    status: str = Field(default="pending", max_length=30)


class DatasetResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None
    source_type: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True) 