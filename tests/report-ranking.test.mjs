import test from "node:test";
import assert from "node:assert/strict";

import { calculateHotScore } from "../src/lib/report-ranking.ts";

const NOW = Date.parse("2026-08-22T12:00:00.000Z");

function hoursAgo(hours) {
  return new Date(NOW - hours * 3_600_000).toISOString();
}

test("newer reports rank above older reports with equal confirmation activity", () => {
  const recent = calculateHotScore(4, hoursAgo(2), NOW);
  const stale = calculateHotScore(4, hoursAgo(48), NOW);

  assert.ok(recent > stale);
});

test("strong confirmation activity can outrank a slightly newer report", () => {
  const active = calculateHotScore(100, hoursAgo(24), NOW);
  const quiet = calculateHotScore(1, hoursAgo(1), NOW);

  assert.ok(active > quiet);
});

test("old top reports cool enough for fresh reports to surface", () => {
  const oldLeader = calculateHotScore(100, hoursAgo(24 * 7), NOW);
  const freshReport = calculateHotScore(1, hoursAgo(1), NOW);

  assert.ok(freshReport > oldLeader);
});

test("invalid report dates sink to the bottom", () => {
  assert.equal(calculateHotScore(10, "not-a-date", NOW), Number.NEGATIVE_INFINITY);
});
