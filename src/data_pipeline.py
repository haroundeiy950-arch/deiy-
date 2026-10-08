"""Member 1 - Data and vectorization pipeline.

What this file does (in plain words):
1. Reads the CSV file.
2. Checks that the required columns exist and the values are numbers.
3. Counts missing values and duplicate rows.
4. Removes bad rows (duplicates and rows with missing/invalid values).
5. Builds a NumPy feature matrix X (inputs) and target arrays (answers).
6. Saves data_report.json, including the SHA-256 fingerprint of the file.

Nothing here is hard-coded: row counts and statistics are calculated from the file.
"""
import argparse
import hashlib
import json
import os
import sys
import tempfile

import numpy as np
import pandas as pd

ID_COL = "record_id"
FEATURES = ["plot_area_ha", "rainfall_mm", "soil_ph", "seed_kg",
            "distance_km", "arrival_hour"]
REG_TARGET = "actual_yield_kg"
CLF_TARGET = "dispatch_attention"
REQUIRED_COLUMNS = [ID_COL] + FEATURES + [REG_TARGET, CLF_TARGET]
NUMERIC_COLUMNS = FEATURES + [REG_TARGET, CLF_TARGET]
MIN_ROWS = 20  # too few rows cannot be split or modelled safely


class DataError(Exception):
    """Raised with a clear message when the data is not usable."""


def sha256_file(path):
    """Fingerprint of the file. Changes if even one character changes."""
    if not os.path.isfile(path):
        raise DataError(f"Data file not found: {path}")
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def load_csv(path):
    if not os.path.isfile(path):
        raise DataError(f"Data file not found: {path}")
    try:
        df = pd.read_csv(path)
    except Exception as exc:
        raise DataError(f"Could not read CSV file: {exc}")
    if df.empty:
        raise DataError("The CSV file has no rows.")
    df.columns = [str(c).strip() for c in df.columns]  # remove stray spaces
    return df


def validate_schema(df):
    """Stop with a clear error if required columns are missing."""
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise DataError(f"Missing required column(s): {missing}")
    extra = [c for c in df.columns if c not in REQUIRED_COLUMNS]
    return extra  # extra columns are ignored, but reported


def to_numeric(df):
    """Turn numeric columns into numbers. Bad text becomes NaN (counted later)."""
    df = df.copy()
    invalid = {}
    for col in NUMERIC_COLUMNS:
        before_missing = df[col].isna().sum()
        df[col] = pd.to_numeric(df[col], errors="coerce")
        invalid[col] = int(df[col].isna().sum() - before_missing)
    return df, invalid


def quality_counts(df):
    """Missing values and duplicates, calculated on the loaded data."""
    return {
        "missing_values": {c: int(df[c].isna().sum()) for c in REQUIRED_COLUMNS},
        "duplicate_rows": int(df.duplicated().sum()),
        "duplicate_record_ids": int(df[ID_COL].duplicated().sum()),
    }


def clean(df):
    """Drop duplicates, rows with missing/invalid values, and invalid labels.

    Dropping (instead of filling with averages) avoids leaking information
    from the test data into the training data.
    """
    n0 = len(df)
    df = df.drop_duplicates()
    df = df.drop_duplicates(subset=ID_COL, keep="first")
    df = df.dropna(subset=REQUIRED_COLUMNS)
    df = df[df[CLF_TARGET].isin([0, 1])]
    df = df.reset_index(drop=True)
    if len(df) < MIN_ROWS:
        raise DataError(f"Only {len(df)} usable rows after cleaning "
                        f"(need at least {MIN_ROWS}).")
    return df, n0 - len(df)


def vectorize(df):
    """Split the table into NumPy arrays. record_id is kept OUT of X."""
    X = df[FEATURES].to_numpy(dtype=float)            # inputs
    y_reg = df[REG_TARGET].to_numpy(dtype=float)      # yield in kg
    y_clf = df[CLF_TARGET].to_numpy(dtype=int)        # 0 or 1
    ids = df[ID_COL].astype(str).to_numpy()
    return X, y_reg, y_clf, ids


def _clean_json(obj):
    """Make numpy numbers and NaN safe for JSON."""
    if isinstance(obj, dict):
        return {str(k): _clean_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean_json(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        return None if not np.isfinite(obj) else float(obj)
    return obj


def prepare_data(path, group_code):
    """Main function used by run_all.py. Returns data + the report dictionary."""
    sha = sha256_file(path)
    raw = load_csv(path)
    extra_cols = validate_schema(raw)
    raw, invalid_text = to_numeric(raw)
    quality = quality_counts(raw)
    df, dropped = clean(raw)
    X, y_reg, y_clf, ids = vectorize(df)

    stats = df[NUMERIC_COLUMNS].describe().to_dict()
    report = {
        "group_code": group_code,
        "sha256": sha,
        "file_name": os.path.basename(path),
        "row_count": int(len(raw)),
        "rows_after_cleaning": int(len(df)),
        "rows_dropped": int(dropped),
        "feature_count": len(FEATURES),
        "feature_names": FEATURES,
        "identifier_column": ID_COL,
        "target_columns": [REG_TARGET, CLF_TARGET],
        "extra_columns_ignored": extra_cols,
        "missing_values": quality["missing_values"],
        "non_numeric_values_found": invalid_text,
        "duplicate_rows": quality["duplicate_rows"],
        "duplicate_record_ids": quality["duplicate_record_ids"],
        "descriptive_statistics": stats,
    }
    return {"df": df, "X": X, "y_reg": y_reg, "y_clf": y_clf,
            "ids": ids, "report": _clean_json(report)}


def save_report(report, output_dir):
    """Write data_report.json safely (temp file first, then replace)."""
    os.makedirs(output_dir, exist_ok=True)
    final = os.path.join(output_dir, "data_report.json")
    fd, tmp = tempfile.mkstemp(dir=output_dir, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    os.replace(tmp, final)
    return final


def main():
    ap = argparse.ArgumentParser(description="Data pipeline only (Member 1).")
    ap.add_argument("--data", required=True)
    ap.add_argument("--output", default="artifacts/")
    ap.add_argument("--group", required=True)
    args = ap.parse_args()
    try:
        out = prepare_data(args.data, args.group)
    except DataError as exc:
        print(f"DATA ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
    rep = out["report"]
    path = save_report(rep, args.output)
    print(f"Group code : {rep['group_code']}")
    print(f"SHA-256    : {rep['sha256']}")
    print(f"Rows       : {rep['row_count']} (usable: {rep['rows_after_cleaning']})")
    print(f"Features   : {rep['feature_count']}  X shape = {out['X'].shape}")
    print(f"Saved      : {path}")


if __name__ == "__main__":
    main()
