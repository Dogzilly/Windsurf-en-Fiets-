import { test } from "node:test";
import assert from "node:assert/strict";
import { circMean, pk, computeWindows, windClass, dirInRange, nearestStation, headwind, bearing, haversine, localParts, addDays, grp } from "../src/logic.js";

const H = (hour, wind, dir = 225, gust = wind + 5, extra = {}) => ({ hour, wind, dir, gust, rp: 0, rn: 0, ...extra });
const base = { min: 15, max: 25, favDir: { center: 225, span: 360 }, maxGust: 40, minHours: 1 };

test("circMean: 350° en 10° → 0°, niet 180°", () => {
  assert.ok(Math.abs(((circMean([350, 10]) + 180) % 360) - 180) < 1e-9);
});
test("circMean: gewogen en leeg", () => {
  assert.equal(Math.round(circMean([0, 90], [1, 1])), 45);
  assert.equal(circMean([]), null);
  assert.equal(circMean([0, 180]), null);
});
test("pk gebruikt circulair gemiddelde", () => {
  const p = pk([H(10, 20, 355), H(11, 20, 5)]);
  assert.ok(p.dir < 1 || p.dir > 359, `dir=${p.dir}`);
});
test("computeWindows: verleden uren worden overgeslagen", () => {
  const days = { "2026-10-25": [H(9, 18), H(10, 18), H(14, 18), H(15, 18)] };
  const w = computeWindows(days, { ...base, now: { date: "2026-10-25", hour: 12 } });
  assert.equal(w.length, 1); assert.equal(w[0].sh, 14); assert.equal(w[0].eh, 16);
});
test("computeWindows: gisteren telt niet mee", () => {
  const w = computeWindows({ "2026-10-24": [H(10, 18)] }, { ...base, now: { date: "2026-10-25", hour: 8 } });
  assert.equal(w.length, 0);
});
test("computeWindows: gaten splitsen vensters (geen 9–17 over een gat heen)", () => {
  const days = { "2026-10-26": [H(9, 18), H(10, 18), H(11, 5), H(12, 5), H(15, 20), H(16, 20)] };
  const w = computeWindows(days, { ...base, now: { date: "2026-10-25", hour: 20 } });
  assert.deepEqual(w.map(x => [x.sh, x.eh]), [[9, 11], [15, 17]]);
});
test("computeWindows: minHours filtert losse uren", () => {
  const days = { "2026-10-26": [H(9, 18), H(10, 5), H(12, 18), H(13, 18)] };
  const w = computeWindows(days, { ...base, minHours: 2, now: { date: "2026-10-25", hour: 20 } });
  assert.equal(w.length, 1); assert.equal(w[0].sh, 12);
});
test("computeWindows: windrichting-filter", () => {
  const days = { "2026-10-26": [H(10, 18, 225), H(11, 18, 45), H(12, 18, 240)] };
  const w = computeWindows(days, { ...base, favDir: { center: 225, span: 90 }, now: { date: "2026-10-25", hour: 20 } });
  assert.deepEqual(w.map(x => [x.sh, x.eh]), [[10, 11], [12, 13]]);
});
test("computeWindows: vlagen-limiet", () => {
  const days = { "2026-10-26": [H(10, 20, 225, 30), H(11, 20, 225, 38)] };
  const w = computeWindows(days, { ...base, maxGust: 32, now: { date: "2026-10-25", hour: 20 } });
  assert.equal(w.length, 1); assert.equal(w[0].maxGust, 30);
});
test("computeWindows: richting venster circulair", () => {
  const days = { "2026-10-26": [H(10, 18, 350), H(11, 18, 10)] };
  const w = computeWindows(days, { ...base, now: { date: "2026-10-25", hour: 20 } });
  assert.ok(w[0].dir < 1 || w[0].dir > 359);
});
test("windClass volgt de ingestelde range", () => {
  assert.equal(windClass(12, 10, 18), "p");
  assert.equal(windClass(8, 10, 18), "m");
  assert.equal(windClass(20, 10, 18), "s");
  assert.equal(windClass(24, 10, 18), "g");
  assert.equal(windClass(5, 10, 18), "z");
  assert.equal(windClass(20, 15, 25), "p");
});
test("dirInRange rond noord", () => {
  assert.ok(dirInRange(350, { center: 10, span: 60 }));
  assert.ok(!dirInRange(300, { center: 10, span: 60 }));
});
test("nearestStation: dichtstbij, vers, binnen maxKm", () => {
  const now = Date.parse("2026-10-25T18:00:00Z");
  const st = [
    { code: "a", lat: 51.544, lon: 3.8592, wind_ms: 8, wind_ts: "2026-10-25T17:50:00Z" },
    { code: "b", lat: 51.442, lon: 3.6, wind_ms: 9, wind_ts: "2026-10-25T10:00:00Z" }, // oud
  ];
  assert.equal(nearestStation(51.5283, 3.725, st, "wind", { now }).code, "a");
  assert.equal(nearestStation(51.44, 3.6, st, "wind", { now, maxKm: 5 }), null);
});
test("headwind en bearing", () => {
  assert.equal(Math.round(headwind(10, 0, 0)), 10);
  assert.equal(Math.round(headwind(10, 180, 0)), -10);
  assert.equal(Math.round(bearing(51, 3, 52, 3)), 0);
  assert.equal(Math.round(haversine(51, 3, 52, 3)), 111);
});
test("localParts gebruikt Amsterdamse tijd, niet UTC", () => {
  // 23:30 UTC op 25-10 = 00:30 op 26-10 in Amsterdam (CET)
  assert.deepEqual(localParts(new Date("2026-10-25T23:30:00Z")), { date: "2026-10-26", hour: 0 });
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});
test("grp groepeert per lokale dag", () => {
  const d = grp({ time: ["2026-10-25T23:00", "2026-10-26T00:00"], wind_speed_10m: [1, 2], wind_direction_10m: [0, 0], wind_gusts_10m: [2, 3], temperature_2m: [9, 9] });
  assert.deepEqual(Object.keys(d), ["2026-10-25", "2026-10-26"]);
});
