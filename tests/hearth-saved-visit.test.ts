import assert from "node:assert/strict";
import test from "node:test";
import type {HearthState, PlacementCommand} from "../src/lib/hearth/domain";
import {createInitialHearthState} from "../src/lib/hearth/fixtures";
import {rankPairs} from "../src/lib/hearth/matching";
import {applyPlacementCommand} from "../src/lib/hearth/placement";
import {blankVisit, MAX_SAVED_VISIT_CHARACTERS, parseSavedVisit, type SavedVisit} from "../src/lib/hearth/saved-visit";

function savedVisit(): SavedVisit {
  const state = createInitialHearthState(), home = state.homes[0].preferences;
  const pair = rankPairs(state, home, ["quiet-hours"]).find(entry => entry.status === "eligible")!;
  const opened = applyPlacementCommand(state, {type: "create", requestId: "saved-visit-test", home, spiritIds: pair.spiritIds, acceptedClauseIds: pair.acceptedClauseIds, sourceSnapshot: pair.sourceSnapshot}, {actor: "Local demonstration reviewer", now: "2026-10-02T12:00:00.000Z"});
  return {version: 1, home, placements: opened.state.placements, events: opened.state.events};
}

test("empty storage and complete browser-local cases restore without changing evidence", () => {
  assert.deepEqual(parseSavedVisit(null), blankVisit());
  const visit = savedVisit();
  assert.deepEqual(parseSavedVisit(JSON.stringify(visit)), visit);
});

test("plans, answered introductions, three decisions and a completed stay remain restorable", () => {
  const visit = savedVisit();
  let state: HearthState = {...createInitialHearthState(), placements: visit.placements, events: visit.events};
  let sequence = 0;
  type Intent = PlacementCommand extends infer C ? C extends PlacementCommand ? Omit<C, "requestId" | "placementId" | "expectedRev"> : never : never;
  const run = (intent: Intent) => {
    const current = state.placements[0];
    state = applyPlacementCommand(state, {...intent, placementId: current.id, expectedRev: current.rev, requestId: `saved-lifecycle-${++sequence}`} as PlacementCommand, {actor: "Local demonstration reviewer", now: "2026-10-02T13:00:00.000Z"}).state;
    const saved = {...visit, placements: state.placements, events: state.events};
    assert.deepEqual(parseSavedVisit(JSON.stringify(saved)), saved);
  };
  run({type: "set-plan", trialPlan: {durationDays: 14, checkInDays: [2, 7, 14], successCriteria: "Everyone reports comfort, privacy and a voluntary wish to continue."}, relocationPlan: {destination: "Hearthafter guest rooms", coordinator: "Placement coordinator", trigger: "Any party asks to leave or withdraws consent.", handoverNotes: "Confirm a private room, arrange a calm move, and check in separately."}});
  for (const question of state.placements[0].evaluation.introductionQuestions) run({type: "record-answer", questionId: question.id, spiritId: question.spiritId, answer: "yes", note: "The people involved confirmed the required arrangements."});
  for (const party of ["household", "spirit-a", "spirit-b"] as const) run({type: "record-consent", party, decision: "granted", note: "The complete plan was reviewed and freely agreed."});
  run({type: "transition", to: "trial", note: "Everyone is ready to begin the agreed voluntary trial."});
  run({type: "transition", to: "settled", note: "All three parties report a comfortable stay and freely wish to continue."});
  run({type: "record-consent", party: "spirit-a", decision: "denied", note: "The spirit wishes to end the stay and use the agreed exit."});
  run({type: "transition", to: "closed", note: "A private room and safe handover have been confirmed."});
});

test("the shallow-valid malformed case from the browser reproduction is rejected", () => {
  const visit = savedVisit();
  Object.assign(visit.placements[0], {evaluation: {sourceSnapshot: {}}, consents: {}});
  assert.throws(() => parseSavedVisit(JSON.stringify(visit)), /unsupported format/);
});

test("missing nested fields, invalid dates, unsafe IDs and duplicate records fail closed", () => {
  const corruptions: [string, (visit: SavedVisit) => void][] = [
    ["missing spirit decision", visit => {Object.assign(visit.placements[0].consents, {"spirit-a": undefined});}],
    ["invalid decision", visit => {Object.assign(visit.placements[0].consents.household, {decision: "approved"});}],
    ["broken question", visit => {Object.assign(visit.placements[0].evaluation.introductionQuestions[0], {question: {html: "bad"}});}],
    ["broken source revisions", visit => {Object.assign(visit.placements[0].evaluation.sourceSnapshot, {revisions: []});}],
    ["missing factor list", visit => {Object.assign(visit.placements[0].evaluation, {hostAFactors: null});}],
    ["missing plan fields", visit => {Object.assign(visit.placements[0], {relocationPlan: {destination: "Guest room"}});}],
    ["invalid trial days", visit => {Object.assign(visit.placements[0], {trialPlan: {durationDays: 14, checkInDays: ["tomorrow"], successCriteria: "A comfortable trial"}});}],
    ["malformed answer", visit => {Object.assign(visit.placements[0], {answers: [{}]});}],
    ["invalid event date", visit => {visit.events[0].at = "not-a-date";}],
    ["invalid case date", visit => {visit.placements[0].updatedAt = "not-a-date";}],
    ["unsafe case ID", visit => {visit.placements[0].id = "../another-route";}],
    ["duplicate case", visit => {visit.placements.push(visit.placements[0]);}],
    ["duplicate event", visit => {visit.events.push(visit.events[0]);}],
  ];
  for (const [label, corrupt] of corruptions) {
    const visit = savedVisit(); corrupt(visit);
    assert.throws(() => parseSavedVisit(JSON.stringify(visit)), /unsupported format/, label);
  }
});

test("saved input and nested collection sizes are bounded before rendering", () => {
  assert.throws(() => parseSavedVisit(" ".repeat(MAX_SAVED_VISIT_CHARACTERS + 1)), /unsupported format/);
  const visit = savedVisit();
  visit.placements[0].evaluation.introductionQuestions = Array(201).fill(visit.placements[0].evaluation.introductionQuestions[0]);
  assert.throws(() => parseSavedVisit(JSON.stringify(visit)), /unsupported format/);
  assert.throws(() => parseSavedVisit("null"), /unsupported format/);
  assert.throws(() => parseSavedVisit("{broken JSON"), SyntaxError);
});

test("plain user notes remain text instead of being rewritten as HTML", () => {
  const visit = savedVisit();
  const note = '<img src=x onerror="window.untrustedNoteRan=true">';
  visit.placements[0].note = note; visit.events[0].note = note;
  const restored = parseSavedVisit(JSON.stringify(visit));
  assert.equal(restored.placements[0].note, note);
  assert.equal(restored.events[0].note, note);
});
