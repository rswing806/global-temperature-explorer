// Small, pure helper functions (no DOM) so they can be unit-tested with Node.
(function (root) {
  const BLUE = [33, 102, 172], MID = [247, 247, 247], RED = [178, 24, 43];

  // Diverging blue-white-red scale used for temperature anomalies.
  function color(anomaly, limit = 1.2) {
    const t = Math.max(-1, Math.min(1, anomaly / limit));
    const [from, to, k] = t < 0 ? [BLUE, MID, t + 1] : [MID, RED, t];
    return `rgb(${from.map((c, i) => Math.round(c + (to[i] - c) * k)).join(",")})`;
  }

  // Centered moving average; null near the edges or when the window has gaps.
  function movingAverage(values, window = 11) {
    const half = (window - 1) / 2;
    return values.map((_, i) => {
      if (i < half || i >= values.length - half) return null;
      const slice = values.slice(i - half, i + half + 1);
      return slice.some((v) => v == null) ? null : slice.reduce((a, b) => a + b, 0) / window;
    });
  }

  // Least-squares slope in degrees per decade, or null with too few points.
  function trendPerDecade(points) {
    const pts = points.filter(([, y]) => y != null);
    if (pts.length < 10) return null;
    const n = pts.length;
    const mx = pts.reduce((s, [x]) => s + x, 0) / n;
    const my = pts.reduce((s, [, y]) => s + y, 0) / n;
    let num = 0, den = 0;
    for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
    return (num / den) * 10;
  }

  // Average of a series per decade, with a count so partial decades can be flagged.
  function decadeMeans(rows, key) {
    const groups = new Map();
    for (const r of rows) {
      if (r[key] == null) continue;
      const d = Math.floor(r.Year / 10) * 10;
      const g = groups.get(d) || { decade: d, sum: 0, years: 0 };
      g.sum += r[key]; g.years += 1;
      groups.set(d, g);
    }
    return [...groups.values()].sort((a, b) => a.decade - b.decade)
      .map((g) => ({ decade: g.decade, mean: g.sum / g.years, years: g.years }));
  }

  const api = { color, movingAverage, trendPerDecade, decadeMeans };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Stats = api;
})(typeof window !== "undefined" ? window : globalThis);
