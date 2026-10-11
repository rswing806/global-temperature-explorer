"""Climate data pipeline: download -> clean -> analyze -> export for the dashboard.

Data: NASA GISS Surface Temperature Analysis (GISTEMP v4), global mean temperature
anomalies in degrees C relative to the 1951-1980 average.

Usage:
    python pipeline.py                  # download the latest data from NASA
    python pipeline.py --csv file.csv   # use a CSV you downloaded yourself
"""
import argparse
import io
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
PAGE = "https://data.giss.nasa.gov/gistemp/"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
SEASONS = ["DJF", "MAM", "JJA", "SON"]
DEFAULT_OUT = Path(__file__).parent / "site" / "data.js"


def load_text(csv_path=None):
    """Read the raw CSV text from a local file or from NASA."""
    if csv_path:
        return Path(csv_path).read_text(encoding="utf-8")
    request = urllib.request.Request(URL, headers={"User-Agent": "climate-dashboard-student-project"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def clean(text):
    """Turn the raw NASA table into a tidy DataFrame with one row per complete year."""
    # Line 1 is a title; line 2 is the header. "***" marks missing values.
    df = pd.read_csv(io.StringIO(text), skiprows=1, na_values=["***", "****", ""])
    df.columns = df.columns.str.strip()
    needed = ["Year"] + MONTHS + ["J-D"] + SEASONS
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise ValueError(f"Unexpected file format, missing columns: {missing}")

    df = df[needed].rename(columns={"J-D": "Annual"})
    df = df.apply(pd.to_numeric, errors="coerce")
    df = df.dropna(subset=["Year", "Annual"])      # drops repeated headers and the unfinished current year
    df["Year"] = df["Year"].astype(int)
    return df.sort_values("Year").drop_duplicates("Year").reset_index(drop=True)


def trend_per_decade(years, values):
    """Least-squares slope, expressed in degrees C per decade."""
    years, values = np.asarray(years, float), np.asarray(values, float)
    ok = ~np.isnan(values)
    if ok.sum() < 3:
        return None
    return float(np.polyfit(years[ok], values[ok], 1)[0] * 10)


def analyze(df):
    """Compute the headline findings shown on the site."""
    annual = df.set_index("Year")["Annual"]
    ranked = annual.sort_values(ascending=False)
    latest_year = int(annual.index.max())

    decades = (df.assign(Decade=df["Year"] // 10 * 10)
                 .groupby("Decade")["Annual"].agg(["mean", "count"]).reset_index())

    since_1970 = df[df["Year"] >= 1970]
    return {
        "first_year": int(annual.index.min()),
        "latest_year": latest_year,
        "latest_value": round(float(annual[latest_year]), 2),
        "latest_rank": int(list(ranked.index).index(latest_year) + 1),
        "total_years": int(len(annual)),
        "warmest": [{"year": int(y), "value": round(float(v), 2)} for y, v in ranked.head(5).items()],
        "trend_all": round(trend_per_decade(df["Year"], df["Annual"]), 3),
        "trend_since_1970": round(trend_per_decade(since_1970["Year"], since_1970["Annual"]), 3),
        "decades": [{"decade": int(r.Decade), "mean": round(float(r["mean"]), 2), "years": int(r["count"])}
                    for _, r in decades.iterrows()],
    }


def to_records(df):
    """DataFrame -> list of dicts with None for missing values (valid JSON)."""
    records = []
    for row in df.itertuples(index=False):
        records.append({col: (None if pd.isna(v) else int(v) if col == "Year" else round(float(v), 2))
                        for col, v in zip(df.columns, row)})
    return records


def write_site_data(df, findings, out_path):
    payload = {
        "meta": {
            "source": "NASA GISS Surface Temperature Analysis (GISTEMP v4)",
            "url": PAGE,
            "baseline": "1951-1980",
            "built": date.today().isoformat(),
        },
        "findings": findings,
        "rows": to_records(df),
    }
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("window.CLIMATE = " + json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--csv", help="path to a GISTEMP CSV you downloaded manually")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="where to write the data file for the website")
    args = parser.parse_args(argv)

    try:
        text = load_text(args.csv)
    except OSError as err:
        print(f"Could not load the data ({err}).\n"
              f"Download the CSV from {PAGE} (Global-mean monthly, seasonal, annual means)\n"
              f"and run:  python pipeline.py --csv path/to/file.csv", file=sys.stderr)
        return 1

    df = clean(text)
    findings = analyze(df)
    write_site_data(df, findings, args.out)

    print(f"Cleaned {len(df)} years ({findings['first_year']}-{findings['latest_year']}).")
    print(f"Warming trend since 1970: {findings['trend_since_1970']:+.2f} C per decade.")
    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
