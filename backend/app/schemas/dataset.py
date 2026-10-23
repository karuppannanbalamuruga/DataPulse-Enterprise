
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


SourceType = Literal["file", "csv", "excel", "database", "api"]
DatasetStatus = Literal["pending", "processing", "completed", "failed"]


class DatasetCreate(BaseModel):
    organization_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    source_type: SourceType = "file"


class DatasetUpdate(BaseModel):
    organization_id: int | None = Field(default=None, gt=0)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    source_type: SourceType | None = None
    status: DatasetStatus | None = None


class DatasetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    name: str
    description: str | None = None
    source_type: str
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class DatasetListResponse(BaseModel):
    items: list[DatasetRead]
    total: int
    page: int
    page_size: int
    total_pages: int
