import assert from "node:assert/strict";
import test from "node:test";
import { donutArcs } from "../components/pipeline-donut";

const C = 100;

void test("arcs tile the full circle and carry cumulative offsets", () => {
  const arcs = donutArcs(
    [
      { label: "a", count: 1, color: "#000" },
      { label: "b", count: 3, color: "#111" },
    ],
    C,
  );
  assert.equal(arcs[0]!.len, 25); // 1/4
  assert.equal(arcs[1]!.len, 75); // 3/4
  assert.equal(arcs[0]!.offset, 0);
  assert.equal(arcs[1]!.offset, 25); // starts where the first ended
  assert.equal(arcs[0]!.pct + arcs[1]!.pct, 100);
  const totalLen = arcs.reduce((s, a) => s + a.len, 0);
  assert.ok(Math.abs(totalLen - C) < 1e-9);
});

void test("empty pipeline produces zero-length arcs, not NaN", () => {
  const arcs = donutArcs([{ label: "a", count: 0, color: "#000" }], C);
  assert.equal(arcs[0]!.len, 0);
  assert.equal(arcs[0]!.pct, 0);
});
