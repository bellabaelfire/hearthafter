import assert from "node:assert/strict";
import test from "node:test";
import type {ConsentParty, HearthState, PlacementCommand, PlacementStatus, Spirit} from "../src/lib/hearth/domain";
import {createInitialHearthState} from "../src/lib/hearth/fixtures";
import {evaluatePair, rankPairs} from "../src/lib/hearth/matching";
import {applyPlacementCommand, consentParties, PlacementError} from "../src/lib/hearth/placement";
import {applySavedWithdrawal} from "../src/lib/hearth/saved-case-recovery";
import {parseSavedVisit, type SavedVisit} from "../src/lib/hearth/saved-visit";

const context = {actor: "Saved case recovery reviewer", now: "2026-10-05T12:00:00.000Z"};
const withdrawalContext = {...context, now: "2026-10-05T13:00:00.000Z"};
let sequence = 0;
const requestId = () => "saved-recovery-" + ++sequence;
type Withdrawal = Parameters<typeof applySavedWithdrawal>[1];
type Intent = PlacementCommand extends infer Command ? Command extends PlacementCommand ? Omit<Command, "placementId" | "expectedRev" | "requestId"> : never : never;

function childGroup(): HearthState {
  const state = createInitialHearthState();
  const base = state.spirits[0];
  state.spirits = Array.from({length: 3}, (_, index): Spirit => ({
    ...structuredClone(base), id: "recovery-resident-" + (index + 1), rev: "recovery-source-" + (index + 1),
    name: "Recovery resident " + (index + 1), ageAtPassing: index === 2 ? 9 : 40,
    requiredCompanionIds: undefined, guardianSpiritId: index === 2 ? "recovery-resident-1" : undefined,
    assentRequired: index === 2 ? true : undefined, assentExemptionReason: undefined,
    historyIds: [], traitIds: [], boundaryIds: [], affinityFacts: [], introductionQuestions: [],
    energy: "balanced", company: "medium", presence: "both", interests: ["books", "music"],
    petCompatibility: {cats: true, dogs: true, other: true}, audibleHours: "none",
    quietHoursFlexibility: "can-adjust", spiritConsent: "yes", preferredHours: undefined,
  }));
  const home = state.homes[0];
  home.preferences = {...home.preferences, departedCapacity: 3, householdConsent: "yes", pets: "none", quietHours: "none",
    privateRetreat: true, stepFreeAccess: true, hasGarden: true, activityPreference: "balanced",
    companyPreference: "medium", nightPresence: "welcome", relocationWillingness: "yes",
    welcomedInterests: ["books", "music"], recordingPolicy: "none", sharedEvenings: 7, respectBoundaries: "yes"};
  home.introductionQuestions = [];
  state.homes = [home];
  state.pairRelationships = [];
  state.matchingPolicy.minimumHostScore = 0;
  state.matchingPolicy.minimumPairScore = 0;
  state.matchingPolicy.minimumOverallScore = 0;
  return state;
}

function savedState(state: HearthState): SavedVisit {
  return parseSavedVisit(JSON.stringify({version: 1, home: state.homes[0].preferences, placements: state.placements, events: state.events}));
}

function caseAt(status: "review" | "trial" | "settled" = "review", withChild = false) {
  let state = withChild ? childGroup() : createInitialHearthState();
  const home = state.homes[0].preferences;
  const evaluation = withChild
    ? evaluatePair(state, {home, spiritIds: state.spirits.map(spirit => spirit.id), acceptedClauseIds: []})
    : rankPairs(state, home, ["quiet-hours"]).find(pair => pair.status === "eligible")!;
  assert.equal(evaluation.status, "eligible", JSON.stringify(evaluation.reasons));
  const opened = applyPlacementCommand(state, {type: "create", requestId: requestId(), home,
    spiritIds: evaluation.spiritIds, acceptedClauseIds: evaluation.acceptedClauseIds, sourceSnapshot: evaluation.sourceSnapshot}, context);
  state = opened.state;
  const id = opened.placement.id;
  const run = (intent: Intent) => {
    const current = state.placements.find(placement => placement.id === id)!;
    state = applyPlacementCommand(state, {...intent, placementId: id, expectedRev: current.rev, requestId: requestId()} as PlacementCommand, context).state;
  };
  run({type: "set-plan", trialPlan: {durationDays: 14, checkInDays: [2, 7, 14],
    successCriteria: "Every resident reports comfort, privacy and a voluntary wish to continue."},
  relocationPlan: {destination: "Hearthafter private guest rooms", coordinator: "Placement coordinator",
    trigger: "Any required party withdraws agreement or asks to leave.",
    handoverNotes: "Confirm a private room, arrange a calm move, and check in separately."}});
  for (const question of state.placements[0].evaluation.introductionQuestions.filter(question => question.requiredForTrial)) {
    run({type: "record-answer", questionId: question.id, spiritId: question.spiritId, answer: "yes",
      note: "Every affected person has confirmed the required arrangements."});
  }
  if (status !== "review") {
    for (const party of consentParties(state.placements[0])) {
      run({type: "record-consent", party, decision: "granted", note: "The complete plan was reviewed and freely agreed."});
    }
    run({type: "transition", to: "trial", note: "Every required party is ready for the agreed voluntary trial."});
    if (status === "settled") run({type: "transition", to: "settled", note: "The completed trial respected every boundary and everyone freely wishes to continue."});
  }
  return {state, saved: savedState(state)};
}

function withdrawal(saved: SavedVisit, party: ConsentParty = "spirit-a"): Withdrawal {
  const placement = saved.placements[0];
  return {type: "record-consent", placementId: placement.id, expectedRev: placement.rev,
    requestId: requestId(), party, decision: "denied", note: "  I wish to end this arrangement and use the agreed exit.  "};
}
function errorCode(code: string, status: number) {
  return (error: unknown) => error instanceof PlacementError && error.code === code && error.status === status;
}

for (const [status, expected] of [["review", "declined"], ["trial", "relocating"], ["settled", "relocating"]] as const) {
  test("offline withdrawal from " + status + " matches the domain outcome and audit event", () => {
    const {state, saved} = caseAt(status);
    const command = withdrawal(saved);
    const before = structuredClone(saved), commandBefore = structuredClone(command);
    const live = applyPlacementCommand(state, command, withdrawalContext);
    const recovered = applySavedWithdrawal(saved, command, withdrawalContext);
    assert.equal(recovered.placement.status, expected);
    assert.equal(recovered.replayed, false);
    assert.deepEqual(recovered.placement, live.placement);
    assert.deepEqual(recovered.event, live.event);
    assert.deepEqual(recovered.saved, {...before, placements: live.state.placements, events: live.state.events});
    assert.deepEqual(recovered.placement.consents[command.party], {decision: "denied", at: withdrawalContext.now, note: command.note.trim()});
    assert.equal(recovered.event.fromStatus, status);
    assert.equal(recovered.event.toStatus, expected);
    assert.equal(recovered.event.expectedRev, command.expectedRev);
    assert.deepEqual(parseSavedVisit(JSON.stringify(recovered.saved)), recovered.saved);
    assert.deepEqual(saved, before);
    assert.deepEqual(command, commandBefore);
  });
}

test("recovery preserves the complete saved plans, answers, evidence, household and other cases", () => {
  const {saved} = caseAt("settled");
  const other = caseAt();
  saved.placements.push(...other.saved.placements);
  saved.events.push(...other.saved.events);
  const before = structuredClone(saved), previous = before.placements[0];
  assert.ok(previous.answers.length > 0);
  const recovered = applySavedWithdrawal(saved, withdrawal(saved), withdrawalContext);
  for (const field of ["trialPlan", "relocationPlan", "answers", "evaluation", "acceptedClauseIds", "home"] as const) {
    assert.deepEqual(recovered.placement[field], previous[field], field);
  }
  assert.deepEqual(recovered.saved.home, before.home);
  assert.deepEqual(recovered.saved.placements[1], before.placements[1]);
  assert.deepEqual(recovered.saved.events.slice(0, -1), before.events);
  assert.equal(recovered.saved.events.length, before.events.length + 1);
  assert.deepEqual(saved, before);
});

for (const party of ["guardian-3", "assent-3"] as const) {
  test("offline recovery honors the saved required " + party + " decision", () => {
    const {state, saved} = caseAt("trial", true);
    assert.deepEqual(consentParties(saved.placements[0]), ["household", "spirit-a", "spirit-b", "guardian-3", "assent-3"]);
    const command = withdrawal(saved, party);
    const result = applySavedWithdrawal(saved, command, withdrawalContext);
    assert.equal(result.placement.status, "relocating");
    assert.equal(result.placement.consents[party].decision, "denied");
    assert.deepEqual(result.placement, applyPlacementCommand(state, command, withdrawalContext).placement);
    assert.deepEqual(result.placement.relocationPlan, saved.placements[0].relocationPlan);
    assert.deepEqual(parseSavedVisit(JSON.stringify(result.saved)), result.saved);
  });
}

test("grants, transitions, plan edits and other operations cannot use offline recovery", () => {
  const {saved} = caseAt();
  const command = withdrawal(saved);
  const attempts = [
    {...command, decision: "granted"},
    {...command, type: "transition", to: "trial"},
    {...command, type: "set-plan", trialPlan: saved.placements[0].trialPlan, relocationPlan: saved.placements[0].relocationPlan},
    {...command, type: "refresh-review", acceptedClauseIds: []},
    {...command, type: "record-answer", questionId: "question", spiritId: saved.placements[0].spiritIds[0], answer: "yes"},
    {...command, type: "create"},
  ];
  const before = structuredClone(saved);
  for (const attempt of attempts) {
    assert.throws(() => applySavedWithdrawal(saved, attempt as Withdrawal, withdrawalContext), PlacementError);
    assert.deepEqual(saved, before);
  }
});

test("offline withdrawal checks the saved revision and the required party", () => {
  const {saved} = caseAt();
  const command = withdrawal(saved);
  assert.throws(() => applySavedWithdrawal(saved, {...command, expectedRev: "obsolete-revision"}, withdrawalContext), errorCode("STALE_REVISION", 409));
  assert.throws(() => applySavedWithdrawal(saved, {...command, party: "guardian-9"}, withdrawalContext), errorCode("VALIDATION_ERROR", 422));
  assert.throws(() => applySavedWithdrawal(saved, {...command, placementId: "missing-placement"}, withdrawalContext), errorCode("NOT_FOUND", 404));
});

test("an exact retry replays the saved withdrawal without another event or revision", () => {
  const {saved} = caseAt("trial");
  const command = withdrawal(saved);
  const first = applySavedWithdrawal(saved, command, withdrawalContext);
  const replay = applySavedWithdrawal(first.saved, command, {...withdrawalContext, now: "2026-10-05T14:00:00.000Z"});
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.saved, first.saved);
  assert.deepEqual(replay.placement, first.placement);
  assert.deepEqual(replay.event, first.event);
  assert.equal(replay.saved.events.filter(event => event.requestId === command.requestId).length, 1);
  assert.throws(() => applySavedWithdrawal(first.saved, {...command, note: "Changed reason using the same request."}, withdrawalContext), errorCode("IDEMPOTENCY_CONFLICT", 409));
  assert.throws(() => applySavedWithdrawal(first.saved, command, {...withdrawalContext, actor: "Another reviewer"}), errorCode("IDEMPOTENCY_CONFLICT", 409));
});

test("recovery refuses new decisions after a saved case is declined, relocating or closed", () => {
  for (const status of ["declined", "relocating", "closed"] as PlacementStatus[]) {
    const {saved} = caseAt();
    saved.placements[0].status = status;
    assert.throws(() => applySavedWithdrawal(saved, withdrawal(saved), withdrawalContext), errorCode("INVALID_TRANSITION", 409));
  }
});

test("malformed saved cases and audit events are rejected before recovery writes a decision", () => {
  const corruptions: ((saved: SavedVisit) => void)[] = [
    saved => {Object.assign(saved.placements[0], {evaluation: {sourceSnapshot: {}}, consents: {}});},
    saved => {saved.placements[0].evaluation.consentRequirements = saved.placements[0].evaluation.consentRequirements!.filter(requirement => requirement.party !== "spirit-b");},
    saved => {Object.assign(saved.placements[0], {relocationPlan: {destination: "Guest rooms"}});},
    saved => {saved.events[0].at = "invalid-date";},
  ];
  for (const corrupt of corruptions) {
    const {saved} = caseAt();
    const command = withdrawal(saved);
    corrupt(saved);
    const before = structuredClone(saved);
    assert.throws(() => applySavedWithdrawal(saved, command, withdrawalContext), /unsupported format/);
    assert.deepEqual(saved, before);
  }
});

test("legacy pair cases can withdraw without a current household draft or dynamic requirements", () => {
  const {saved} = caseAt();
  saved.home = null;
  delete saved.placements[0].evaluation.consentRequirements;
  delete saved.placements[0].evaluation.hostScores;
  delete saved.placements[0].evaluation.hostFactors;
  const restored = parseSavedVisit(JSON.stringify(saved));
  const result = applySavedWithdrawal(restored, withdrawal(restored, "spirit-b"), withdrawalContext);
  assert.equal(result.placement.status, "declined");
  assert.equal(result.placement.consents["spirit-b"].decision, "denied");
  assert.equal(result.saved.home, null);
  assert.deepEqual(consentParties(result.placement), ["household", "spirit-a", "spirit-b"]);
  assert.deepEqual(parseSavedVisit(JSON.stringify(result.saved)), result.saved);
});

test("offline decisions retain the domain validation for notes, request IDs and review context", () => {
  const {saved} = caseAt();
  const command = withdrawal(saved);
  for (const invalid of [{...command, note: " "}, {...command, note: "x".repeat(1501)}, {...command, requestId: "../unsafe-request"}]) {
    assert.throws(() => applySavedWithdrawal(saved, invalid, withdrawalContext), errorCode("VALIDATION_ERROR", 422));
  }
  for (const invalid of [{...withdrawalContext, actor: " "}, {...withdrawalContext, now: "not-a-date"}]) {
    assert.throws(() => applySavedWithdrawal(saved, command, invalid), errorCode("VALIDATION_ERROR", 422));
  }
});
