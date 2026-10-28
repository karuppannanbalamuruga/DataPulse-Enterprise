
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


RuleType = Literal[
    "required_field",
    "unique_value",
    "data_type",
    "numeric_range",
    "string_length",
    "format_validation",
]

ExpectedDataType = Literal[
    "integer",
    "number",
    "string",
    "boolean",
    "date",
]

SupportedFormat = Literal["email", "phone", "url"]


def validate_configuration(rule_type: str, configuration: dict[str, Any]):
    if rule_type in {"required_field", "unique_value"}:
        if configuration:
            raise ValueError(
                f"{rule_type} does not require configuration fields"
            )

    elif rule_type == "data_type":
        if configuration.get("expected_type") not in {
            "integer", "number", "string", "boolean", "date"
        }:
            raise ValueError(
                "expected_type must be integer, number, string, boolean, or date"
            )

    elif rule_type == "numeric_range":
        minimum = configuration.get("min")
        maximum = configuration.get("max")

        if minimum is None or maximum is None:
            raise ValueError("Numeric range requires min and max")

        if (
            isinstance(minimum, bool)
            or not isinstance(minimum, (int, float))
            or isinstance(maximum, bool)
            or not isinstance(maximum, (int, float))
        ):
            raise ValueError("min and max must be numbers")

        if minimum > maximum:
            raise ValueError("min cannot be greater than max")

    elif rule_type == "string_length":
        minimum = configuration.get("min_length")
        maximum = configuration.get("max_length")

        if (
            isinstance(minimum, bool)
            or not isinstance(minimum, int)
            or isinstance(maximum, bool)
            or not isinstance(maximum, int)
        ):
            raise ValueError("min_length and max_length must be integers")

        if minimum < 0 or maximum < minimum:
            raise ValueError("Invalid string length range")

    elif rule_type == "format_validation":
        if configuration.get("format") not in {"email", "phone", "url"}:
            raise ValueError("format must be email, phone, or url")

    else:
        raise ValueError("Unsupported validation rule type")

    allowed_keys = {
        "required_field": set(),
        "unique_value": set(),
        "data_type": {"expected_type"},
        "numeric_range": {"min", "max"},
        "string_length": {"min_length", "max_length"},
        "format_validation": {"format"},
    }

    unknown = set(configuration) - allowed_keys[rule_type]
    if unknown:
        raise ValueError(
            f"Unknown configuration fields: {', '.join(sorted(unknown))}"
        )


class ValidationRuleBase(BaseModel):
    dataset_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    rule_type: RuleType
    description: str | None = None
    configuration: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

    @model_validator(mode="after")
    def check_configuration(self):
        validate_configuration(self.rule_type, self.configuration)
        self.name = self.name.strip()

        if not self.name:
            raise ValueError("name cannot be empty")

        return self


class ValidationRuleCreate(ValidationRuleBase):
    pass


class ValidationRuleUpdate(BaseModel):
    dataset_id: int | None = Field(default=None, gt=0)
    name: str | None = Field(default=None, min_length=1, max_length=150)
    rule_type: RuleType | None = None
    description: str | None = None
    configuration: dict[str, Any] | None = None
    is_active: bool | None = None


class ValidationRuleStatusUpdate(BaseModel):
    is_active: bool


class ValidationRuleResponse(BaseModel):
    id: int
    dataset_id: int
    name: str
    rule_type: str
    description: str | None = None
    configuration: dict[str, Any]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ValidationRuleListResponse(BaseModel):
    items: list[ValidationRuleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
