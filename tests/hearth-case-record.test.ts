import assert from "node:assert/strict";
import test from "node:test";
import {createInitialHearthState} from "../src/lib/hearth/fixtures";
import {rankPairs} from "../src/lib/hearth/matching";
import {applyPlacementCommand} from "../src/lib/hearth/placement";
import {caseExcerpt, describeCaseRecord} from "../src/lib/hearth/case-record";

function record() {
  const state = createInitialHearthState();
  const home = state.homes[0].preferences;
  const evaluation = rankPairs(state, home, ["quiet-hours"]).find(pair => pair.status === "eligible")!;
  const result = applyPlacementCommand(state, {type: "create", requestId: "case-record-example", home, spiritIds: evaluation.spiritIds, acceptedClauseIds: evaluation.acceptedClauseIds, sourceSnapshot: evaluation.sourceSnapshot}, {actor: "Case record test", now: "2026-10-02T16:00:00.000Z"});
  return result;
}

test("a new record shows three pending decisions and cannot imply approval", () => {
  const {state, placement} = record();
  const summary = describeCaseRecord(state, placement, true);
  assert.equal(summary.label, "Placement review");
  assert.equal(summary.ready, false);
  assert.deepEqual(summary.decisions.map(decision => decision.label), ["Decision pending", "Decision pending", "Decision pending"]);
});

test("a changed source marks saved agreements for review without rewriting their history", () => {
  const {state, placement} = record();
  for (const record of Object.values(placement.consents)) record.decision = "granted";
  state.spirits.find(spirit => spirit.id === placement.spiritIds[0])!.rev += "-changed";
  const summary = describeCaseRecord(state, placement, true);
  assert.equal(summary.label, "Review required");
  assert.equal(summary.ready, false);
  assert.ok(summary.decisions.every(decision => decision.label === "Agreement needs review"));
  assert.ok(Object.values(placement.consents).every(record => record.decision === "granted"));
});

test("a registry failure never presents a saved settled case as currently confirmed", () => {
  const {state, placement} = record();
  placement.status = "settled";
  for (const record of Object.values(placement.consents)) record.decision = "granted";
  const summary = describeCaseRecord(state, placement, false);
  assert.equal(summary.label, "Registry check unavailable");
  assert.equal(summary.current, false);
  assert.ok(summary.decisions.every(decision => decision.label === "Agreement needs review"));
});

test("a refusal is preserved even when the registry is unavailable", () => {
  const {state, placement} = record();
  placement.status = "declined";
  placement.consents["spirit-a"].decision = "denied";
  assert.equal(describeCaseRecord(state, placement, false).decisions[1].label, "Refusal recorded");
});

test("long plan text is explicitly identified as an excerpt", () => {
  assert.equal(caseExcerpt("  A complete short sentence.  "), "A complete short sentence.");
  const summary = caseExcerpt("A detailed saved condition. ".repeat(20));
  assert.match(summary, /… \[excerpt\]$/);
  assert.ok(summary.length < 210);
});
