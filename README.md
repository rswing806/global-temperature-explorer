[README (2).md](https://github.com/user-attachments/files/33306722/README.2.md)
# Global Temperature Explorer

How much warmer is the world than it used to be? A Python program downloads NASA's global temperature record, cleans and analyzes it, and an interactive page lets you explore it year by year and season by season.

![Warming stripes and chart](screenshots/home.png)

<!-- Live demo: add your link here once the site is deployed -->

## Features

- Downloads the latest NASA temperature data and cleans it with pandas
- Warming stripes at the top of the page: one colored stripe per year, blue for cooler and red for warmer than the 1951-1980 average
- Interactive chart: choose the whole year or one season, and drag two sliders to pick the years to look at
- Optional 11-year average line to show the long-term direction
- The warming trend (in degrees C per decade) is recalculated for whatever years you select
- A decade-by-decade table and a short written summary of the findings
- A section explaining where the data comes from and what its limits are

## Built with

Python (pandas, NumPy), JavaScript, HTML, CSS, Chart.js

## Run it on your computer

You need Python 3.9 or newer and an internet connection.

**Windows (PowerShell)**

```
git clone https://github.com/rswing806/global-temperature-explorer.git
cd global-temperature-explorer
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python pipeline.py
start site\index.html
```

**Mac or Linux**

```
git clone https://github.com/rswing806/global-temperature-explorer.git
cd global-temperature-explorer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python pipeline.py
open site/index.html
```

`pipeline.py` creates the file `site/data.js`, which the page needs. If the download fails, get the CSV named "Global-mean monthly, seasonal, and annual means" from https://data.giss.nasa.gov/gistemp/ and run:

```
python pipeline.py --csv path/to/file.csv
```

## Tests

```
python -m unittest discover -s tests
node tests/test_stats.js
```

The Python tests use a small made-up table in the same layout as the NASA file. They check the cleaning, the trend calculation, and the output file. The JavaScript tests check the color scale, the moving average, the trend, and the decade averages. The second command needs Node.js.

## How it works

1. **Download.** `pipeline.py` fetches the NASA table (or reads a file you give it).
2. **Clean.** It skips the title line, turns the "***" markers into missing values, removes repeated header rows, and drops the current year if it is unfinished.
3. **Analyze.** It finds the warmest years, the average for each decade, and the straight-line trend for the whole record and since 1970.
4. **Export.** It writes everything to `site/data.js`.
5. **Display.** The page in `site/` reads that file and draws the stripes and charts. The helper functions for colors, averages, and trends are in `site/stats.js` so they can be tested on their own.

## Reading the numbers

An anomaly is how far a year's global average temperature is from the 1951-1980 average. It does not tell you the temperature in any one place. The trend is a straight line fitted by least squares, so it shows the overall direction but not every up and down. The data covers the whole world, not a single country or city.

## What I learned

<!-- Write this part yourself, in your own words. Name one or two real problems you ran into
     and how you solved them. Admissions readers care about this section most. -->

## Ideas for next steps

- Add a second dataset, such as sea level or the weather in your own city
- Compare the northern and southern hemispheres
- Let visitors download the chart as an image
- Explain what drives the trend

## Credits and license

Data: NASA Goddard Institute for Space Studies (GISS), Surface Temperature Analysis (GISTEMP v4), https://data.giss.nasa.gov/gistemp/. See that page for the citation NASA recommends. This project is not made or endorsed by NASA.

MIT
