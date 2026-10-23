from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


RunStatus = Literal["pending", "processing", "completed", "failed"]


class ProcessingRunCreate(BaseModel):
    dataset_id: int = Field(gt=0)


class ProcessingRunUpdate(BaseModel):
    status: RunStatus | None = None
    records_processed: int | None = Field(default=None, ge=0)
    error_message: str | None = None
    completed_at: datetime | None = None

    model_config = ConfigDict(extra="forbid")


class ProcessingRunResponse(BaseModel):
    id: int
    dataset_id: int
    status: str
    records_processed: int = Field(ge=0)
    error_message: str | None = None
    started_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProcessingRunListResponse(BaseModel):
    items: list[ProcessingRunResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
