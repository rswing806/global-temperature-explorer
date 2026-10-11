if (!window.CLIMATE) {
  const note = document.createElement("p");
  note.textContent = "The data file is missing. Run \"python pipeline.py\" in the project folder to create site/data.js, then reload this page.";
  document.querySelector("main").replaceChildren(note);
  throw new Error("site/data.js not found - run pipeline.py first");
}

const { color, movingAverage, trendPerDecade, decadeMeans } = window.Stats;
const { meta, findings, rows } = window.CLIMATE;
const $ = (id) => document.getElementById(id);

const NAMES = { Annual: "whole-year", DJF: "winter", MAM: "spring", JJA: "summer", SON: "autumn" };
const first = rows[0].Year, last = rows[rows.length - 1].Year;
const MIN_SPAN = 10;
const signed = (v, digits = 2) => `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(digits)}`;

// ---------- warming stripes ----------
function drawStripes() {
  const box = $("stripes");
  box.setAttribute("aria-label", `Warming stripes: one stripe per year, ${first} to ${last}`);
  box.replaceChildren(...rows.map((r) => {
    const s = document.createElement("span");
    s.style.background = color(r.Annual);
    s.title = `${r.Year}: ${signed(r.Annual)} °C`;
    return s;
  }));
}

// ---------- explorer ----------
const state = { series: "Annual", from: first, to: last };
let chart;

function setupControls() {
  for (const id of ["from", "to"]) {
    $(id).min = first; $(id).max = last;
  }
  $("from").value = first; $("to").value = last;

  $("series").addEventListener("change", (e) => { state.series = e.target.value; update(); });
  $("smooth").addEventListener("change", update);
  $("from").addEventListener("input", (e) => {
    state.from = Number(e.target.value);
    if (state.to - state.from < MIN_SPAN) { state.from = state.to - MIN_SPAN; e.target.value = state.from; }
    update();
  });
  $("to").addEventListener("input", (e) => {
    state.to = Number(e.target.value);
    if (state.to - state.from < MIN_SPAN) { state.to = state.from + MIN_SPAN; e.target.value = state.to; }
    update();
  });
}

function update() {
  const key = state.series;
  $("fromOut").textContent = state.from;
  $("toOut").textContent = state.to;

  const values = rows.map((r) => r[key]);
  const smooth = movingAverage(values);            // computed on the full record so the edges are accurate
  const idx = rows.map((r, i) => i).filter((i) => rows[i].Year >= state.from && rows[i].Year <= state.to);
  const labels = idx.map((i) => rows[i].Year);

  const datasets = [{
    type: "bar", label: "Yearly anomaly", data: idx.map((i) => values[i]),
    backgroundColor: idx.map((i) => (values[i] == null ? "#ccc" : color(values[i]))),
    borderColor: "rgba(0,0,0,.25)", borderWidth: 0.5, order: 2,
  }];
  if ($("smooth").checked) {
    datasets.push({
      type: "line", label: "11-year average", data: idx.map((i) => smooth[i]),
      borderColor: "#1b1f24", borderWidth: 2.5, pointRadius: 0, tension: 0.3, order: 1, spanGaps: false,
    });
  }

  if (chart) chart.destroy();
  chart = new Chart($("chart"), {
    data: { labels, datasets },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: $("smooth").checked },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y == null ? "no data" : signed(c.parsed.y) + " °C"}` } },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 10 } },
        y: { title: { display: true, text: "Degrees C vs 1951-1980 average" } },
      },
    },
  });

  const slope = trendPerDecade(idx.map((i) => [rows[i].Year, values[i]]));
  $("trend").textContent = slope == null
    ? "Choose at least 10 years with data to see a trend."
    : `From ${state.from} to ${state.to}, the ${NAMES[key]} anomaly rose by about ${signed(slope)} °C per decade.`;

  drawDecades(key);
}

function drawDecades(key) {
  const means = decadeMeans(rows, key);
  const max = Math.max(...means.map((m) => Math.abs(m.mean)), 0.1);
  $("decades").replaceChildren(...means.map((m) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = `${m.decade}s${m.years < 10 ? ` (${m.years} yrs)` : ""}`;
    const val = document.createElement("td");
    val.textContent = `${signed(m.mean)} °C`;
    const barCell = document.createElement("td");
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.style.width = `${(Math.abs(m.mean) / max) * 100}%`;
    bar.style.background = color(m.mean);
    barCell.append(bar);
    tr.append(th, val, barCell);
    return tr;
  }));
}

// ---------- findings written from the Python analysis ----------
function drawFindings() {
  const f = findings;
  const items = [
    `${f.latest_year}, the latest complete year in the record, was ${signed(f.latest_value)} °C compared with the 1951-1980 average. That ranks ${f.latest_rank === 1 ? "as the warmest" : "#" + f.latest_rank} of ${f.total_years} years.`,
    `The five warmest years on record are ${f.warmest.map((w) => `${w.year} (${signed(w.value)})`).join(", ")}.`,
    `Across the whole record (${f.first_year}-${f.latest_year}) the trend is ${signed(f.trend_all)} °C per decade. Since 1970 it is ${signed(f.trend_since_1970)} °C per decade, which is ${(f.trend_since_1970 / f.trend_all).toFixed(1)} times faster.`,
  ];
  $("findings").replaceChildren(...items.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  $("source").textContent = `Data: ${meta.source}, built on ${meta.built}. Source page: ${meta.url}`;
}

drawStripes();
setupControls();
drawFindings();
update();
