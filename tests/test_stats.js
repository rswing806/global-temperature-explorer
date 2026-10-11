// Run with: node tests/test_stats.js
const assert = require("assert");
const { color, movingAverage, trendPerDecade, decadeMeans } = require("../site/stats.js");

assert.strictEqual(color(-5), "rgb(33,102,172)");     // clamps to deep blue
assert.strictEqual(color(0), "rgb(247,247,247)");     // neutral at zero
assert.strictEqual(color(5), "rgb(178,24,43)");       // clamps to deep red

const ma = movingAverage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 11);
assert.deepStrictEqual(ma.slice(0, 5), [null, null, null, null, null]);
assert.strictEqual(ma[5], 6);
assert.strictEqual(ma[7], 8);
assert.strictEqual(ma[12], null);
assert.strictEqual(movingAverage([1, 2, null, 4, 5], 3)[2], null);

const pts = Array.from({ length: 30 }, (_, i) => [1990 + i, 0.02 * i]);
assert.ok(Math.abs(trendPerDecade(pts) - 0.2) < 1e-9);
assert.strictEqual(trendPerDecade(pts.slice(0, 5)), null);   // too few points

const rows = [{ Year: 1999, A: 1 }, { Year: 2000, A: 2 }, { Year: 2001, A: 4 }, { Year: 2002, A: null }];
assert.deepStrictEqual(decadeMeans(rows, "A"), [{ decade: 1990, mean: 1, years: 1 }, { decade: 2000, mean: 3, years: 2 }]);

console.log("Project 3 JS helpers: all checks passed");
