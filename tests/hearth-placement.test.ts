import assert from "node:assert/strict";
import test from "node:test";
import type { ConsentParty, HearthState, Placement, PlacementCommand, RelocationPlan, TrialPlan } from "../src/lib/hearth/domain";
import { createInitialHearthState } from "../src/lib/hearth/fixtures";
import { evaluatePair, rankPairs } from "../src/lib/hearth/matching";
import { applyPlacementCommand, getPlacementReadinessIssues, PlacementError } from "../src/lib/hearth/placement";

const context = { actor: "Fictional placement steward", now: "2026-10-02T12:00:00.000Z" };
let sequence = 0;
const requestId = () => `placement-test-${++sequence}`;
const trialPlan: TrialPlan = { durationDays: 14, checkInDays: [2, 7, 14], successCriteria: "All three parties report comfort, respected boundaries, and a voluntary wish to continue." };
const relocationPlan: RelocationPlan = { destination: "The fictional Hearthafter guesthouse", coordinator: "On-duty placement steward", trigger: "Any party withdraws consent or an essential boundary no longer holds.", handoverNotes: "Arrange a calm handover, preserve personal keepsakes, and confirm arrival with the next steward." };
function proposal(state = createInitialHearthState()): Extract<PlacementCommand, { type: "create" }> {
  const home = state.homes[0].preferences;
  const evaluation = rankPairs(state, home, ["quiet-hours"]).find((pair) => pair.status === "eligible");
  assert.ok(evaluation, "The demonstration household must have an eligible pair after allowed negotiation.");
  return { type: "create", requestId: requestId(), home: structuredClone(home), spiritIds: evaluation.spiritIds, acceptedClauseIds: evaluation.acceptedClauseIds, sourceSnapshot: evaluation.sourceSnapshot };
}
function opened() {
  const state = createInitialHearthState(); return applyPlacementCommand(state, proposal(state), context);
}
const latest = (state: HearthState, id: string) => state.placements.find((placement) => placement.id === id)!;
function plan(state: HearthState, id: string): HearthState {
  return applyPlacementCommand(state, { type: "set-plan", placementId: id, expectedRev: latest(state, id).rev, requestId: requestId(), trialPlan, relocationPlan }, context).state;
}
function consent(state: HearthState, id: string, party: ConsentParty, decision: "granted" | "denied" = "granted"): HearthState {
  return applyPlacementCommand(state, { type: "record-consent", placementId: id, expectedRev: latest(state, id).rev, requestId: requestId(), party, decision, note: decision === "granted" ? "The fictional party has reviewed the complete plan and agrees freely." : "The fictional party has chosen to end the arrangement." }, context).state;
}
function move(state: HearthState, id: string, to: "trial" | "settled" | "relocating" | "closed", note = "Simulated review confirms the agreed conditions and the voluntary next step."): HearthState {
  return applyPlacementCommand(state, { type: "transition", placementId: id, expectedRev: latest(state, id).rev, requestId: requestId(), to, note }, context).state;
}
function confirmIntroductions(state: HearthState, id: string): HearthState {
  const questions = latest(state, id).evaluation.introductionQuestions.filter((question) => question.requiredForTrial);
  for (const question of questions) {
    state = applyPlacementCommand(state, { type: "record-answer", placementId: id, expectedRev: latest(state, id).rev, requestId: requestId(), questionId: question.id, spiritId: question.spiritId, answer: "yes", note: "In this fictional review, the prerequisite has been checked and confirmed." }, context).state;
  }
  return state;
}
function ready() {
  const result = opened(); const id = result.placement.id;
  let state = confirmIntroductions(plan(result.state, id), id);
  for (const party of ["household", "spirit-a", "spirit-b"] as const) state = consent(state, id, party);
  return { state, id };
}
function expectError(action: () => unknown, code: string, status = 422): void {
  assert.throws(action, (error: unknown) => error instanceof PlacementError && error.code === code && error.status === status);
}

test("a reviewed proposal opens with three independent pending consents", () => {
  const { placement, state } = opened();
  assert.equal(placement.status, "review"); assert.equal(state.events.length, 1);
  assert.ok(Object.values(placement.consents).every((entry) => entry.decision === "pending"));
  assert.equal(placement.trialPlan, null); assert.equal(placement.relocationPlan, null);
});

test("stale source revisions cannot open a new placement review", () => {
  const state = createInitialHearthState(); const command = proposal(state);
  state.spirits.find((spirit) => spirit.id === command.spiritIds[0])!.rev += "-updated";
  expectError(() => applyPlacementCommand(state, command, context), "STALE_SOURCES", 409);
  assert.equal(state.placements.length, 0);
});

test("missing data and hard exclusions cannot create placement records", () => {
  const state = createInitialHearthState(); const command = proposal(state);
  for (const householdConsent of [null, "no"] as const) {
    const home = { ...command.home, householdConsent };
    const evaluation = evaluatePair(state, { home, spiritIds: command.spiritIds, acceptedClauseIds: command.acceptedClauseIds });
    expectError(() => applyPlacementCommand(state, { ...command, requestId: requestId(), home, sourceSnapshot: evaluation.sourceSnapshot }, context), "MATCH_NOT_ELIGIBLE");
  }
});

test("exact repeated requests are idempotent and key reuse with changed intent fails", () => {
  const state = createInitialHearthState(); const command = proposal(state);
  const first = applyPlacementCommand(state, command, context);
  const replay = applyPlacementCommand(first.state, command, { ...context, now: "2026-10-02T13:00:00.000Z" });
  assert.equal(replay.replayed, true); assert.strictEqual(replay.state, first.state);
  assert.equal(replay.state.placements.length, 1); assert.equal(replay.state.events.length, 1);
  expectError(() => applyPlacementCommand(first.state, { ...command, acceptedClauseIds: [] }, context), "IDEMPOTENCY_CONFLICT", 409);
  expectError(() => applyPlacementCommand(first.state, command, { ...context, actor: "A different reviewer" }), "IDEMPOTENCY_CONFLICT", 409);
});

test("placement revisions prevent stale reviewers from overwriting a newer plan", () => {
  const result = opened(); const before = result.placement;
  const state = plan(result.state, before.id);
  expectError(() => applyPlacementCommand(state, { type: "record-consent", placementId: before.id, expectedRev: before.rev, requestId: requestId(), party: "household", decision: "granted", note: "The household agrees." }, context), "STALE_REVISION", 409);
});

test("a trial cannot begin without all consents, a trial plan, and a relocation plan", () => {
  const result = opened(); const id = result.placement.id;
  expectError(() => move(result.state, id, "trial"), "CONSENT_REQUIRED");
  let state = result.state;
  for (const party of ["household", "spirit-a", "spirit-b"] as const) state = consent(state, id, party);
  expectError(() => move(state, id, "trial"), "TRIAL_PLAN_REQUIRED");
  expectError(() => applyPlacementCommand(state, { type: "set-plan", placementId: id, expectedRev: latest(state, id).rev, requestId: requestId(), trialPlan, relocationPlan: null as unknown as RelocationPlan }, context), "RELOCATION_PLAN_REQUIRED");
});

test("the actual trial and relocation plan must be reviewed before consent counts", () => {
  const result = opened(); const id = result.placement.id; let state = result.state;
  for (const party of ["household", "spirit-a", "spirit-b"] as const) state = consent(state, id, party);
  state = plan(state, id);
  assert.ok(Object.values(latest(state, id).consents).every((entry) => entry.decision === "pending"));
  expectError(() => move(state, id, "trial"), "CONSENT_REQUIRED");
});

test("trial plans require meaningful check-ins and a final review", () => {
  const result = opened(); const placement = result.placement;
  for (const bad of [{ ...trialPlan, durationDays: 0 }, { ...trialPlan, checkInDays: [2, 7] }, { ...trialPlan, checkInDays: [14, 14] }, { ...trialPlan, successCriteria: "Fine" }]) {
    assert.throws(() => applyPlacementCommand(result.state, { type: "set-plan", placementId: placement.id, expectedRev: placement.rev, requestId: requestId(), trialPlan: bad, relocationPlan }, context), PlacementError);
  }
});

test("a refused placement cannot be reopened by overwriting the refusal", () => {
  const result = opened(); const id = result.placement.id;
  const state = consent(result.state, id, "spirit-b", "denied");
  assert.equal(latest(state, id).status, "declined");
  expectError(() => consent(state, id, "spirit-b", "granted"), "INVALID_TRANSITION", 409);
  expectError(() => move(state, id, "trial"), "INVALID_TRANSITION", 409);
  assert.equal(latest(move(state, id, "closed"), id).status, "closed");
});

test("settlement cannot skip the trial and requires a substantive outcome note", () => {
  const { state, id } = ready();
  expectError(() => move(state, id, "settled"), "INVALID_TRANSITION", 409);
  const trial = move(state, id, "trial");
  expectError(() => move(trial, id, "settled", "A short review."), "VALIDATION_ERROR");
});

test("source changes block grants and trial start until a refreshed review resets consent", () => {
  const readyState = ready(); const { id } = readyState; const state = structuredClone(readyState.state);
  const placement = latest(state, id); const spirit = state.spirits.find((entry) => entry.id === placement.spiritIds[0])!;
  state.histories.find((history) => history.id === spirit.historyIds[0])!.rev += "-changed";
  expectError(() => move(state, id, "trial"), "STALE_SOURCES", 409);
  expectError(() => consent(state, id, "household"), "STALE_SOURCES", 409);
  assert.ok(getPlacementReadinessIssues(state, placement).some((issue) => issue.includes("changed")));
  const refreshed = applyPlacementCommand(state, { type: "refresh-review", placementId: id, expectedRev: placement.rev, requestId: requestId(), acceptedClauseIds: placement.acceptedClauseIds }, context);
  assert.ok(Object.values(refreshed.placement.consents).every((entry) => entry.decision === "pending"));
  assert.notEqual(refreshed.placement.evaluation.sourceSnapshot.fingerprint, placement.evaluation.sourceSnapshot.fingerprint);
});

test("refresh uses edited preset answers instead of accepting its revision with stale answers", () => {
  const result = opened(); const state = structuredClone(result.state); const placement = result.placement;
  const home = state.homes.find((entry) => entry.id === placement.home.templateId)!;
  home.rev += "-changed"; home.preferences.householdConsent = "no";
  expectError(() => applyPlacementCommand(state, { type: "refresh-review", placementId: placement.id, expectedRev: placement.rev, requestId: requestId(), acceptedClauseIds: placement.acceptedClauseIds }, context), "MATCH_NOT_ELIGIBLE");
});

test("withdrawn consent during a trial triggers relocation even when sources changed", () => {
  const readyState = ready(); const { id } = readyState;
  let state = move(readyState.state, id, "trial");
  state = structuredClone(state); state.matchingPolicy.rev += "-changed";
  state = consent(state, id, "spirit-a", "denied");
  assert.equal(latest(state, id).status, "relocating");
  assert.ok(latest(state, id).relocationPlan);
  state = move(state, id, "closed", "Simulated guesthouse handover is complete and safe arrival is confirmed.");
  assert.equal(latest(state, id).status, "closed");
});

test("a complete voluntary lifecycle preserves an audit event for every decision", () => {
  const { id, state: reviewed } = ready();
  let state = move(reviewed, id, "trial", "The fictional trial introduction is simulated with all agreed conditions in place.");
  state = move(state, id, "settled", "Simulated end-of-trial review: each party wishes to stay and all boundaries were respected.");
  state = move(state, id, "relocating", "The household circumstances changed; the agreed guesthouse route is activated.");
  state = move(state, id, "closed", "Simulated handover is complete and all keepsakes have arrived with their owners.");
  assert.equal(latest(state, id).status, "closed");
  const events = state.events.filter((event) => event.placementId === id);
  assert.equal(events.length, 9 + latest(reviewed, id).evaluation.introductionQuestions.filter((question) => question.requiredForTrial).length); assert.ok(events.every((event) => event.requestPayload && event.actor === context.actor));
  assert.deepEqual(events.slice(-4).map((event) => event.toStatus), ["trial", "settled", "relocating", "closed"]);
});

test("placement application never mutates source state, plans, or command values", () => {
  const result = opened(); const before = JSON.stringify(result.state);
  const command: PlacementCommand = { type: "set-plan", placementId: result.placement.id, expectedRev: result.placement.rev, requestId: requestId(), trialPlan: structuredClone(trialPlan), relocationPlan: structuredClone(relocationPlan) };
  const commandBefore = JSON.stringify(command);
  const changed = applyPlacementCommand(result.state, command, context);
  assert.equal(JSON.stringify(result.state), before); assert.equal(JSON.stringify(command), commandBefore);
  assert.notStrictEqual(changed.state, result.state); assert.notStrictEqual(changed.placement, result.placement);
});


test("a promising introduction can open while unanswered questions prevent a trial", () => {
  const result = opened(); const id = result.placement.id;
  assert.equal(result.placement.status, "review");
  assert.ok(result.placement.evaluation.introductionQuestions.length > 0);
  let state = plan(result.state, id);
  for (const party of ["household", "spirit-a", "spirit-b"] as const) state = consent(state, id, party);
  expectError(() => move(state, id, "trial"), "INTRODUCTION_ANSWERS_REQUIRED");
});

test("no or unknown introduction answers hold the review without inventing a refusal", () => {
  const result = opened(); const id = result.placement.id; let state = plan(result.state, id);
  const question = latest(state, id).evaluation.introductionQuestions[0];
  for (const answer of ["unknown", "no"] as const) {
    state = applyPlacementCommand(state, { type: "record-answer", placementId: id, expectedRev: latest(state, id).rev, requestId: requestId(), questionId: question.id, spiritId: question.spiritId, answer, note: "This fictional prerequisite has not been confirmed." }, context).state;
    assert.equal(latest(state, id).status, "review");
    assert.ok(getPlacementReadinessIssues(state, latest(state, id)).some((issue) => issue.includes("introduction question")));
  }
});

test("introduction answers reject unrelated questions and preserve idempotent retries", () => {
  const result = opened(); const id = result.placement.id;
  const question = result.placement.evaluation.introductionQuestions[0];
  const command: PlacementCommand = { type: "record-answer", placementId: id, expectedRev: result.placement.rev, requestId: requestId(), questionId: question.id, spiritId: question.spiritId, answer: "yes", note: "The fictional condition has been confirmed." };
  expectError(() => applyPlacementCommand(result.state, { ...command, questionId: "unrelated-question" }, context), "UNKNOWN_QUESTION");
  const first = applyPlacementCommand(result.state, command, context);
  assert.equal(first.placement.answers.length, 1);
  const again = applyPlacementCommand(first.state, command, context);
  assert.equal(again.replayed, true); assert.equal(again.placement.answers.length, 1);
});

test("changing agreed terms clears introduction confirmations and all consents", () => {
  const { state, id } = ready(); const before = latest(state, id);
  assert.ok(before.answers.length > 0);
  const updated = applyPlacementCommand(state, { type: "set-plan", placementId: id, expectedRev: before.rev, requestId: requestId(), trialPlan: { ...trialPlan, successCriteria: "All parties confirm comfort with revised quiet arrangements and a voluntary wish to continue." }, relocationPlan }, context);
  assert.deepEqual(updated.placement.answers, []);
  assert.ok(Object.values(updated.placement.consents).every((entry) => entry.decision === "pending"));
});

test("a revised answer invalidates consent and stale-source answers cannot approve a trial", () => {
  const { state, id } = ready(); const before = latest(state, id);
  const question = before.evaluation.introductionQuestions[0];
  const updated = applyPlacementCommand(state, { type: "record-answer", placementId: id, expectedRev: before.rev, requestId: requestId(), questionId: question.id, spiritId: question.spiritId, answer: "unknown", note: "Changed fictional circumstances need another check." }, context);
  assert.ok(Object.values(updated.placement.consents).every((entry) => entry.decision === "pending"));
  const edited = structuredClone(state); edited.matchingPolicy.rev += "-changed";
  expectError(() => applyPlacementCommand(edited, { type: "record-answer", placementId: id, expectedRev: before.rev, requestId: requestId(), questionId: question.id, spiritId: question.spiritId, answer: "yes", note: "This answer refers to the previous policy." }, context), "STALE_SOURCES", 409);
});
