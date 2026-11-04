import csv
from pathlib import Path


def process_csv(file_path: str) -> dict:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError("CSV file not found")

    if path.suffix.lower() != ".csv":
        raise ValueError("Only CSV files are supported")

    columns = []
    rows = []
    total_rows = 0

    with path.open(
        mode="r",
        encoding="utf-8-sig",
        newline=""
    ) as csv_file:

        reader = csv.DictReader(csv_file)

        if not reader.fieldnames:
            raise ValueError("CSV file is empty or missing headers")

        columns = [
            column.strip() if column else ""
            for column in reader.fieldnames
        ]

        if not all(columns) or len(set(columns)) != len(columns):
            raise ValueError("CSV contains empty or duplicate column names")

        for row in reader:
            total_rows += 1

            if None in row:
                raise ValueError(
                    f"Malformed CSV row: {total_rows + 1}"
                )

            cleaned_row = {
                key: (value.strip() if value is not None else "")
                for key, value in row.items()
            }

            rows.append(cleaned_row)

    return {
        "columns": columns,
        "total_rows": total_rows,
        "rows": rows
    }