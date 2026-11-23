
from datetime import datetime
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)


AlertCondition = Literal[
    "quality_score_threshold",
    "processing_failure",
    "validation_failure_threshold",
    "quality_score_decline",
    "recurring_validation_failures",
]

AlertSeverity = Literal[
    "info",
    "warning",
    "critical",
]


class AlertRuleBase(BaseModel):
    organization_id: int = Field(gt=0)
    dataset_id: int | None = Field(default=None, gt=0)

    name: str = Field(min_length=1, max_length=150)

    condition_type: AlertCondition

    configuration: dict[str, Any] = Field(
        default_factory=dict
    )

    severity: AlertSeverity = "warning"

    notification_preferences: dict[str, Any] = Field(
        default_factory=lambda: {
            "in_app": True,
            "email": False,
        }
    )

    is_enabled: bool = True

    @model_validator(mode="after")
    def validate_rule(self):
        self.name = self.name.strip()

        if not self.name:
            raise ValueError("Rule name cannot be empty")

        if not isinstance(self.configuration, dict):
            raise ValueError("configuration must be an object")

        if not isinstance(self.notification_preferences, dict):
            raise ValueError(
                "notification_preferences must be an object"
            )

        return self


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(BaseModel):
    organization_id: int | None = Field(default=None, gt=0)
    dataset_id: int | None = Field(default=None, gt=0)

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    condition_type: AlertCondition | None = None
    configuration: dict[str, Any] | None = None
    severity: AlertSeverity | None = None
    notification_preferences: dict[str, Any] | None = None
    is_enabled: bool | None = None


class AlertRuleStatusUpdate(BaseModel):
    is_enabled: bool


class AlertRuleResponse(BaseModel):
    id: int
    organization_id: int
    dataset_id: int | None

    name: str
    condition_type: str
    configuration: dict[str, Any]
    severity: str
    notification_preferences: dict[str, Any]
    is_enabled: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertRuleListResponse(BaseModel):
    items: list[AlertRuleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
