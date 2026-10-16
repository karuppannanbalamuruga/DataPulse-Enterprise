from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProcessingRunResponse(BaseModel):
    id: int
    dataset_id: int
    status: str
    records_processed: int = Field(ge=0)
    error_message: str | None
    started_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)