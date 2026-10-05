import assert from "node:assert/strict";
import test from "node:test";
import { ADDITIONAL_HOME_IDS, ASTER_FAMILY_IDS, appendAdditionalFixtures, createAdditionalFixtures } from "../src/lib/hearth/additional-fixtures";
import type { HearthState, PlacementCommand } from "../src/lib/hearth/domain";
import { createInitialHearthState } from "../src/lib/hearth/fixtures";
import { evaluatePair, rankGroups, validateHostPreferences } from "../src/lib/hearth/matching";
import { applyPlacementCommand, consentParties, getIntroductionReadinessIssues } from "../src/lib/hearth/placement";
import { encodeState } from "../src/lib/hearth/sanity/documents";

const context = { actor: "Fictional sample reviewer", now: "2026-10-05T04:45:00Z" };
const originalIds = ["spirit_iona_vale", "spirit_orin_pell", "spirit_cress_morrow", "spirit_tavi_mercer", "spirit_bram_kestrel", "spirit_sera_dene"];
const additionalIds = new Set(Object.values(createAdditionalFixtures()).flatMap(records => records.map(record => record.id)));
function familyMatch(state: HearthState, homeId: typeof ADDITIONAL_HOME_IDS[number] = ADDITIONAL_HOME_IDS[0]) {
  return evaluatePair(state, { home: state.homes.find(home => home.id === homeId)!.preferences, spiritIds: [...ASTER_FAMILY_IDS] });
}
function review(state = createInitialHearthState()) {
  const match = familyMatch(state);
  return applyPlacementCommand(state, { type: "create", requestId: "aster-family-review", home: match.home, spiritIds: match.spiritIds, acceptedClauseIds: [], sourceSnapshot: match.sourceSnapshot }, context);
}

test("the small expansion appends nineteen unique public records without replacing existing content", () => {
  const state = createInitialHearthState(), extra = createAdditionalFixtures();
  assert.equal(additionalIds.size, 19);
  assert.deepEqual(state.spirits.slice(0, 6).map(spirit => spirit.id), originalIds);
  assert.equal(state.spirits.length, 9); assert.equal(state.homes.length, 5);
  assert.deepEqual(state.placements, []); assert.deepEqual(state.events, []);
  const baseline = structuredClone(state);
  for (const key of Object.keys(extra) as (keyof typeof extra)[]) (baseline[key] as {id: string}[]) = baseline[key].filter(record => !additionalIds.has(record.id));
  const before = structuredClone(baseline), appended = appendAdditionalFixtures(baseline);
  for (const key of Object.keys(extra) as (keyof typeof extra)[]) assert.deepEqual(appended[key].slice(0, before[key].length), before[key]);
  assert.deepEqual(appended, state);
  assert.throws(() => appendAdditionalFixtures(appended), /Duplicate fictional fixture/);
  extra.spirits[0].name = "Changed only in this copy";
  assert.equal(createAdditionalFixtures().spirits[0].name, "Mara Aster");
});

test("every added source and encoded native reference resolves, including guardian and family companions", () => {
  const state = createInitialHearthState();
  const sources = new Set([
    ...state.spirits.map(record => `spirit:${record.id}`), ...state.homes.map(record => `home:${record.id}`),
    ...state.histories.map(record => `history:${record.id}`), ...state.traits.map(record => `trait:${record.id}`),
    ...state.boundaries.map(record => `boundary:${record.id}`), ...state.pairRelationships.map(record => `relationship:${record.id}`), `policy:${state.matchingPolicy.id}`,
  ]);
  function visitSource(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(visitSource); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      if (key === "sourceRefs") for (const ref of entry as string[]) assert.ok(sources.has(ref), `Unresolved source ${ref}`);
      else visitSource(entry);
    }
  }
  visitSource(createAdditionalFixtures());
  const documents = encodeState(state), nativeIds = new Set(documents.map(document => document._id));
  assert.equal(nativeIds.size, documents.length);
  function visitNative(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(visitNative); return; }
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if (item._type === "reference") assert.ok(nativeIds.has(String(item._ref)), `Unresolved native reference ${item._ref}`);
    Object.values(item).forEach(visitNative);
  }
  documents.filter(document => additionalIds.has(document.id)).forEach(visitNative);
  const child = documents.find(document => document.id === "spirit_kit_aster")!;
  assert.ok(child.guardianRef); assert.equal((child.companionRefs as unknown[]).length, 2);
  for (const home of createAdditionalFixtures().homes) {
    assert.equal(home.preferences.templateId, home.id); assert.equal(home.preferences.departedCapacity, 3);
    assert.doesNotThrow(() => validateHostPreferences(home.preferences));
  }
});

test("the real family clears each resident and relationship threshold in both new homes", () => {
  const state = createInitialHearthState();
  // Independently calculated from the documented weight policy: parent edge 95,
  // guardian/child edge 78 (no claimed complementary trait), other parent/child edge 100.
  const expectedEdges = [95, 78, 100];
  assert.ok(expectedEdges.every(score => score >= state.matchingPolicy.minimumPairScore));
  assert.deepEqual(state.matchingPolicy.pairWeights, { complementarity: 40, sharedInterests: 25, presence: 20, relationship: 15 });
  for (const homeId of ADDITIONAL_HOME_IDS) {
    const match = familyMatch(state, homeId);
    assert.equal(match.status, "eligible", JSON.stringify(match.reasons));
    assert.deepEqual(match.hostScores, { spirit_mara_aster: 90, spirit_leon_aster: 100, spirit_kit_aster: 81 });
    assert.equal(match.pairScore, 91); assert.equal(match.overallScore, 91);
    assert.ok(Object.values(match.hostScores!).every(score => score! >= state.matchingPolicy.minimumHostScore));
    assert.deepEqual(match.unknowns, []); assert.deepEqual(match.exclusions, []); assert.deepEqual(match.negotiations, []);
    assert.ok(match.introductionQuestions.some(question => question.id === "question_dependent_care_spirit_kit_aster" && question.requiredForTrial));
    const ranked = rankGroups(state, match.home, [], 3).find(group => group.spiritIds.every(id => ASTER_FAMILY_IDS.includes(id as typeof ASTER_FAMILY_IDS[number])))!;
    assert.equal(ranked.status, "eligible");
    assert.deepEqual(ranked.consentRequirements!.filter(requirement => requirement.spiritId === "spirit_kit_aster").map(requirement => requirement.kind).sort(), ["assent", "guardian"]);
  }
  const stricterPairPolicy = structuredClone(state);
  stricterPairPolicy.matchingPolicy.minimumPairScore = 79;
  const weakEdge = familyMatch(stricterPairPolicy);
  assert.equal(weakEdge.pairScore, 91);
  assert.equal(weakEdge.status, "excluded", "The 78-point guardian/child edge must not disappear inside the 91-point group average.");
  const stricterHostPolicy = structuredClone(state);
  stricterHostPolicy.matchingPolicy.minimumHostScore = 82;
  assert.equal(familyMatch(stricterHostPolicy).status, "excluded", "Kit's 81-point host score must independently meet the resident threshold.");
  for (const missing of ASTER_FAMILY_IDS) {
    const match = evaluatePair(state, { home: state.homes.find(home => home.id === ADDITIONAL_HOME_IDS[0])!.preferences, spiritIds: ASTER_FAMILY_IDS.filter(id => id !== missing) });
    assert.equal(match.status, "excluded");
  }
});

test("the student home supports an existing adult joining Iona and Orin after the real quiet-hours agreement", () => {
  const state = createInitialHearthState(), home = state.homes.find(home => home.id === "household_lantern_students")!.preferences;
  const spiritIds = ["spirit_iona_vale", "spirit_orin_pell", "spirit_tavi_mercer"];
  assert.equal(evaluatePair(state, { home, spiritIds }).status, "needs-negotiation");
  const match = evaluatePair(state, { home, spiritIds, acceptedClauseIds: ["quiet-hours"] });
  assert.equal(match.status, "eligible");
  assert.equal(match.consentRequirements!.length, 4);
});

test("family review begins with five pending decisions and unanswered care, child and household questions", () => {
  const result = review(), placement = result.placement;
  assert.equal(placement.status, "review"); assert.equal(consentParties(placement).length, 5);
  assert.ok(Object.values(placement.consents).every(record => record.decision === "pending" && record.at === null));
  assert.deepEqual(placement.answers, []);
  assert.ok(getIntroductionReadinessIssues(placement).some(issue => issue.includes("Kit Aster")));
  assert.ok(getIntroductionReadinessIssues(placement).some(issue => issue.includes("Esme")));
  const childRequirements = placement.evaluation.consentRequirements!.filter(requirement => requirement.spiritId === "spirit_kit_aster");
  assert.deepEqual(childRequirements.map(requirement => requirement.kind), ["guardian", "assent"]);
  const ready = structuredClone(result.state), p = ready.placements[0];
  for (const consent of Object.values(p.consents)) Object.assign(consent, { decision: "granted", at: context.now, note: "Independent prerequisite probe" });
  p.trialPlan = { durationDays: 14, checkInDays: [3, 14], successCriteria: "Every resident can rest, refuse an invitation and end the stay safely." };
  p.relocationPlan = { destination: "Confirmed fictional interim family suite", coordinator: "Named placement coordinator", trigger: "Any resident or guardian asks to end the stay.", handoverNotes: "Keep Kit with Mara and move the family to the confirmed welcome." };
  const transition: PlacementCommand = { type: "transition", requestId: "aster-care-required", placementId: p.id, expectedRev: p.rev, to: "trial", note: "Trying the recorded trial prerequisites." };
  assert.throws(() => applyPlacementCommand(ready, transition, context), { code: "INTRODUCTION_ANSWERS_REQUIRED" });
});

test("the actual family boundaries, refusal and source changes remain effective", () => {
  const state = createInitialHearthState(), original = familyMatch(state);
  for (const change of [{ privateRetreat: false }, { recordingPolicy: "active" as const }, { quietHours: "none" as const }, { respectBoundaries: "no" as const }, { sharedEvenings: 1 }, { departedCapacity: 2 }]) {
    assert.equal(evaluatePair(state, { home: { ...original.home, ...change }, spiritIds: [...ASTER_FAMILY_IDS] }).status, "excluded");
  }
  const pets = evaluatePair(state, { home: { ...original.home, pets: "cats" }, spiritIds: [...ASTER_FAMILY_IDS] });
  assert.ok(pets.introductionQuestions.filter(question => question.id.startsWith("question_pet_introduction_")).length === 3);
  const refused = structuredClone(state); refused.spirits.find(spirit => spirit.id === "spirit_kit_aster")!.spiritConsent = "no";
  assert.equal(familyMatch(refused).status, "excluded");
  const result = review();
  for (const mutate of [
    (next: HearthState) => { next.spirits.find(spirit => spirit.id === "spirit_kit_aster")!.rev += "-changed"; },
    (next: HearthState) => { next.pairRelationships.find(relationship => relationship.id === "relationship_aster_leon_kit")!.rev += "-changed"; },
    (next: HearthState) => { next.homes.find(home => home.id === ADDITIONAL_HOME_IDS[0])!.rev += "-changed"; },
  ]) {
    const next = structuredClone(result.state); mutate(next);
    assert.throws(() => applyPlacementCommand(next, { type: "record-consent", requestId: "aster-stale-review", placementId: result.placement.id, expectedRev: result.placement.rev, party: "household", decision: "granted", note: "A voluntary household decision." }, context), { code: "STALE_SOURCES" });
  }
});
