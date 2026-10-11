"""Tests use a tiny made-up table in the same layout as the NASA file (NOT real data)."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import pipeline  # noqa: E402

HEADER = "Year,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,J-D,D-N,DJF,MAM,JJA,SON"


def make_csv():
    lines = ["Land-Ocean: Global Means (made-up test data)", HEADER]
    for year in range(2000, 2020):
        value = round((year - 2000) * 0.02, 2)              # steady 0.2 C per decade
        months = ",".join([str(value)] * 12)
        lines.append(f"{year},{months},{value},{value},{value},{value},{value},{value}")
    lines.append("2020," + ",".join(["0.5"] * 3 + ["***"] * 9) + ",***,***,***,0.5,***,***")  # unfinished year
    lines.append(HEADER)                                        # NASA repeats the header every 20 years
    return "\n".join(lines) + "\n"


class PipelineTests(unittest.TestCase):
    def test_clean_drops_incomplete_year_and_repeated_header(self):
        df = pipeline.clean(make_csv())
        self.assertEqual(len(df), 20)
        self.assertEqual(int(df["Year"].max()), 2019)
        self.assertIn("Annual", df.columns)

    def test_clean_rejects_wrong_format(self):
        with self.assertRaises(ValueError):
            pipeline.clean("title\nYear,Foo\n2000,1\n")

    def test_trend(self):
        df = pipeline.clean(make_csv())
        self.assertAlmostEqual(pipeline.trend_per_decade(df["Year"], df["Annual"]), 0.2, places=3)

    def test_analyze(self):
        f = pipeline.analyze(pipeline.clean(make_csv()))
        self.assertEqual(f["latest_year"], 2019)
        self.assertEqual(f["latest_rank"], 1)
        self.assertEqual(f["warmest"][0]["year"], 2019)
        self.assertEqual(f["decades"][0]["years"], 10)

    def test_main_writes_valid_data_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            src, out = Path(tmp) / "in.csv", Path(tmp) / "site" / "data.js"
            src.write_text(make_csv())
            self.assertEqual(pipeline.main(["--csv", str(src), "--out", str(out)]), 0)
            text = out.read_text()
            self.assertTrue(text.startswith("window.CLIMATE = "))
            data = json.loads(text[len("window.CLIMATE = "):].rstrip().rstrip(";"))
            self.assertEqual(len(data["rows"]), 20)
            self.assertEqual(data["findings"]["latest_year"], 2019)
            self.assertEqual(data["meta"]["baseline"], "1951-1980")


if __name__ == "__main__":
    unittest.main()
