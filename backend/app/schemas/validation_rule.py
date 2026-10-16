from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ValidationRuleCreate(BaseModel):
    dataset_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    rule_type: str = Field(min_length=1, max_length=50)
    description: str | None = None
    configuration: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class ValidationRuleResponse(BaseModel):
    id: int
    dataset_id: int
    name: str
    rule_type: str
    description: str | None
    configuration: dict[str, Any]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)