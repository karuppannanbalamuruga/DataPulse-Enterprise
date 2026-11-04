import re
from datetime import datetime
from urllib.parse import urlparse


def is_empty(value):
    return value is None or str(value).strip() == ""


def validate_value(value, rule_type, configuration):
    config = configuration or {}

    if rule_type == "required_field":
        if is_empty(value):
            return False, "Required field is missing"
        return True, None

    if rule_type == "unique_value":
        return True, None

    if is_empty(value):
        return True, None

    value = str(value).strip()

    if rule_type == "data_type":
        expected_type = config.get("expected_type")

        try:
            if expected_type == "integer":
                int(value)
            elif expected_type == "number":
                float(value)
            elif expected_type == "string":
                pass
            elif expected_type == "boolean":
                if value.lower() not in {"true", "false", "1", "0"}:
                    raise ValueError()
            elif expected_type == "date":
                datetime.fromisoformat(value)
            else:
                return False, "Unsupported expected data type"

            return True, None

        except (ValueError, TypeError):
            return False, f"Expected data type: {expected_type}"

    if rule_type == "numeric_range":
        try:
            number = float(value)
            minimum = float(config["min"])
            maximum = float(config["max"])
        except (ValueError, TypeError, KeyError):
            return False, "Invalid numeric range configuration or value"

        if minimum > maximum:
            return False, "Minimum value cannot exceed maximum value"

        if minimum <= number <= maximum:
            return True, None

        return False, f"Value must be between {minimum} and {maximum}"

    if rule_type == "string_length":
        try:
            minimum = int(config["min_length"])
            maximum = int(config["max_length"])
        except (ValueError, TypeError, KeyError):
            return False, "Invalid string length configuration"

        if minimum < 0 or maximum < minimum:
            return False, "Invalid string length limits"

        if minimum <= len(value) <= maximum:
            return True, None

        return False, f"String length must be between {minimum} and {maximum}"

    if rule_type == "format_validation":
        format_type = config.get("format")

        patterns = {
            "email": r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            "phone": r"^\+?[0-9\s\-()]{7,20}$",
        }

        if format_type in patterns:
            if re.fullmatch(patterns[format_type], value):
                return True, None
            return False, f"Invalid {format_type} format"

        if format_type == "url":
            parsed = urlparse(value)
            if parsed.scheme in {"http", "https"} and parsed.netloc:
                return True, None
            return False, "Invalid URL format"

        return False, "Unsupported format configuration"

    return False, f"Unsupported validation rule: {rule_type}"


def validate_unique_values(values):
    seen = set()
    duplicates = set()

    for row_index, value in enumerate(values, start=1):
        if is_empty(value):
            continue

        normalized = str(value).strip()

        if normalized in seen:
            duplicates.add(row_index)
        else:
            seen.add(normalized)

    return duplicates

def execute_validation_rules(rows, rules):
    """
    Execute active validation rules against CSV rows.
    Returns validation results and issues.
    """

    results = []
    issues = []

    for rule in rules:
        if not rule.is_active:
            continue

        rule_type = rule.rule_type
        config = rule.configuration or {}
        column = config.get("column")

        if not column or column not in (rows[0] if rows else {}):
            results.append({
                "rule_id": rule.id,
                "column_name": column,
                "total_checked": 0,
                "passed_count": 0,
                "failed_count": 0,
                "status": "skipped"
            })
            continue

        total_checked = 0
        passed_count = 0
        failed_count = 0

        if rule_type == "unique_value":
            values = [row.get(column) for row in rows]
            duplicates = validate_unique_values(values)

            for index, value in enumerate(values, start=1):
                total_checked += 1

                if index in duplicates:
                    failed_count += 1
                    issues.append({
                        "rule_id": rule.id,
                        "row_number": index,
                        "column_name": column,
                        "invalid_value": value,
                        "error_description": "Duplicate value found"
                    })
                else:
                    passed_count += 1

        else:
            for index, row in enumerate(rows, start=1):
                total_checked += 1
                value = row.get(column)

                passed, error = validate_value(
                    value,
                    rule_type,
                    config
                )

                if passed:
                    passed_count += 1
                else:
                    failed_count += 1
                    issues.append({
                        "rule_id": rule.id,
                        "row_number": index,
                        "column_name": column,
                        "invalid_value": value,
                        "error_description": error
                    })

        results.append({
            "rule_id": rule.id,
            "column_name": column,
            "total_checked": total_checked,
            "passed_count": passed_count,
            "failed_count": failed_count,
            "status": "completed"
        })

    return {
        "results": results,
        "issues": issues
    }

def calculate_quality_score(results):
    total_passed = sum(
        result["passed_count"] for result in results
    )

    total_failed = sum(
        result["failed_count"] for result in results
    )

    total_checks = total_passed + total_failed

    if total_checks == 0:
        return 0.0

    return round((total_passed / total_checks) * 100, 2)