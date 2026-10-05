import assert from "node:assert/strict";
import test from "node:test";
import type { HearthState, HostPreferences, PairEvaluationInput } from "../src/lib/hearth/domain";
import { createInitialHearthState } from "../src/lib/hearth/fixtures";
import { evaluatePair, hoursOverlap, MatchingError, rankPairs } from "../src/lib/hearth/matching";

function scenario(): { state: HearthState; input: PairEvaluationInput } {
  const state = createInitialHearthState();
  const [a, b] = state.spirits;
  for (const spirit of [a, b]) Object.assign(spirit, { energy: "balanced", company: "medium", presence: "both", interests: ["tea", "books"], boundaryIds: [], spiritConsent: "yes", petCompatibility: { cats: true, dogs: true, other: true }, audibleHours: "none", quietHoursFlexibility: "can-adjust" });
  a.traitIds = ["trait-test-steady"]; b.traitIds = ["trait-test-curious"];
  state.traits.push({ id: "trait-test-steady", rev: "test-trait-1", label: "Steady", description: "A steady test trait.", complements: ["trait-test-curious"] }, { id: "trait-test-curious", rev: "test-trait-2", label: "Curious", description: "A curious test trait.", complements: ["trait-test-steady"] });
  state.pairRelationships = state.pairRelationships.filter((pair) => !(pair.spiritIds.includes(a.id) && pair.spiritIds.includes(b.id)));
  state.pairRelationships.push({ id: "pair-test", rev: "test-pair-1", spiritIds: [a.id, b.id], status: "friendly", title: "Documented test affinity", description: "The profiles contain a documented fictional friendship.", sourceRefs: [`spirit:${a.id}`, `spirit:${b.id}`] });
  state.matchingPolicy = { ...state.matchingPolicy, hostWeights: { energy: 30, company: 25, interests: 25, quietHours: 20 }, pairWeights: { complementarity: 40, sharedInterests: 25, presence: 20, relationship: 15 }, minimumHostScore: 45, minimumPairScore: 50, minimumOverallScore: 60 };
  const home: HostPreferences = { householdConsent: "yes", pets: "none", quietHours: { start: 22, end: 7 }, privateRetreat: true, stepFreeAccess: true, hasGarden: true, activityPreference: "balanced", companyPreference: "medium", nightPresence: "welcome", relocationWillingness: "yes", welcomedInterests: ["tea", "books"], recordingPolicy: "none", sharedEvenings: 4, respectBoundaries: "yes" };
  return { state, input: { home, spiritIds: [a.id, b.id], acceptedClauseIds: [] } };
}
function noScores(result: ReturnType<typeof evaluatePair>): void {
  assert.equal(result.hostAScore, null); assert.equal(result.hostBScore, null); assert.equal(result.pairScore, null); assert.equal(result.overallScore, null);
}

test("the original adults and additive fictional family and homes have complete references", () => {
  const state = createInitialHearthState();
  assert.equal(state.spirits.length, 9); assert.equal(state.homes.length, 5);
  for (const spirit of state.spirits) {
    assert.ok(spirit.ageAtPassing >= 18 || (spirit.ageAtPassing === 9 && spirit.guardianSpiritId && spirit.assentRequired));
    assert.ok(spirit.historyIds.every((id) => state.histories.some((record) => record.id === id)));
    assert.ok(spirit.traitIds.every((id) => state.traits.some((record) => record.id === id)));
    assert.ok(spirit.boundaryIds.every((id) => state.boundaries.some((record) => record.id === id)));
  }
  for (const home of state.homes) assert.equal(rankPairs(state, home.preferences).length, state.spirits.length * (state.spirits.length - 1) / 2);
});

test("hard household refusal prevents all scoring even for a perfect pair", () => {
  const { state, input } = scenario(); input.home.householdConsent = "no";
  const result = evaluatePair(state, input); assert.equal(result.status, "excluded"); noScores(result);
  assert.ok(result.exclusions.some((entry) => entry.code === "household-consent"));
});

test("unknown required answers are explicit and are never scored as permission", () => {
  const { state, input } = scenario(); input.home.pets = null;
  const result = evaluatePair(state, input); assert.equal(result.status, "needs-information"); noScores(result);
  assert.ok(result.unknowns.some((entry) => entry.code === "unknown-pets"));
});

test("an unknown feature only blocks a pair that requires it", () => {
  const { state, input } = scenario(); input.home.hasGarden = null;
  assert.equal(evaluatePair(state, input).status, "eligible");
  state.boundaries.push({ id: "boundary-test-garden", rev: "test-boundary-1", label: "Garden access", description: "Garden access is required.", rule: "garden", kind: "hard" });
  state.spirits[0].boundaryIds.push("boundary-test-garden");
  const result = evaluatePair(state, input); assert.equal(result.status, "needs-information"); noScores(result);
  assert.ok(result.unknowns.some((entry) => entry.code === "unknown-hasGarden"));
});

test("pet and accessibility boundaries cannot be bought off by high scores or quiet-hours agreement", () => {
  const { state, input } = scenario(); input.home.pets = "dogs"; input.acceptedClauseIds = ["quiet-hours"];
  state.spirits[0].petCompatibility.dogs = false;
  const pets = evaluatePair(state, input); assert.equal(pets.status, "excluded"); noScores(pets);
  input.home.pets = "none"; input.home.stepFreeAccess = false;
  state.boundaries.push({ id: "boundary-test-access", rev: "test-access-1", label: "Step-free access", description: "A step-free route is essential.", rule: "step-free", kind: "hard" });
  state.spirits[0].boundaryIds.push("boundary-test-access");
  const access = evaluatePair(state, input); assert.equal(access.status, "excluded"); noScores(access);
});

test("a quiet-hours negotiation genuinely changes the conflicted individual score", () => {
  const { state, input } = scenario(); state.spirits[0].audibleHours = { start: 21, end: 23 };
  const before = evaluatePair(state, input); assert.equal(before.status, "needs-negotiation");
  const after = evaluatePair(state, { ...input, acceptedClauseIds: ["quiet-hours"] });
  assert.equal(after.status, "eligible");
  assert.equal(after.hostAScore! - before.hostAScore!, state.matchingPolicy.hostWeights.quietHours);
  assert.equal(after.hostBScore, before.hostBScore); assert.equal(after.pairScore, before.pairScore);
  assert.ok(after.overallScore! > before.overallScore!);
  assert.equal(after.negotiations[0].accepted, true);
  assert.deepEqual(after.negotiations[0].affectedSpiritIds, [state.spirits[0].id]);
});

test("an essential audible routine cannot use the negotiable quiet-hours clause", () => {
  const { state, input } = scenario(); state.spirits[0].audibleHours = { start: 23, end: 2 }; state.spirits[0].quietHoursFlexibility = "essential";
  const result = evaluatePair(state, { ...input, acceptedClauseIds: ["quiet-hours"] });
  assert.equal(result.status, "excluded"); noScores(result); assert.equal(result.negotiations.length, 0);
});

test("quiet presence does not override a household's nighttime presence boundary", () => {
  const { state, input } = scenario(); input.home.nightPresence = "unwelcome";
  const result = evaluatePair(state, { ...input, acceptedClauseIds: ["quiet-hours"] });
  assert.equal(result.status, "excluded"); noScores(result); assert.ok(result.exclusions.some((entry) => entry.code === "night-boundary"));
});

test("documented pair refusal and individual refusal precede scoring", () => {
  const { state, input } = scenario(); state.pairRelationships.find((pair) => pair.id === "pair-test")!.status = "do-not-pair";
  const pairResult = evaluatePair(state, input); assert.equal(pairResult.status, "excluded"); noScores(pairResult);
  state.pairRelationships.find((pair) => pair.id === "pair-test")!.status = "friendly";
  state.spirits[1].spiritConsent = "no";
  const individual = evaluatePair(state, input); assert.equal(individual.status, "excluded"); noScores(individual);
});

test("a missing referenced history is visible instead of silently ignored", () => {
  const { state, input } = scenario(); state.histories = state.histories.filter((history) => history.id !== state.spirits[0].historyIds[0]);
  const result = evaluatePair(state, input); assert.equal(result.status, "needs-information"); noScores(result);
  assert.ok(result.unknowns.some((entry) => entry.code === "missing-source"));
});

test("complementary pair score is independent of either host score", () => {
  const { state, input } = scenario(); const before = evaluatePair(state, input);
  for (const trait of state.traits) if (trait.id.startsWith("trait-test")) { trait.complements = []; trait.rev += "-changed"; }
  const after = evaluatePair(state, input);
  assert.equal(after.hostAScore, before.hostAScore); assert.equal(after.hostBScore, before.hostBScore);
  assert.ok(after.pairScore! < before.pairScore!);
  assert.notEqual(after.sourceSnapshot.fingerprint, before.sourceSnapshot.fingerprint);
});

test("referenced history and preset revision changes invalidate the source snapshot", () => {
  const { state, input } = scenario(); input.home.templateId = state.homes[0].id;
  const before = evaluatePair(state, input);
  state.histories.find((history) => history.id === state.spirits[0].historyIds[0])!.rev += "-changed";
  const historyChanged = evaluatePair(state, input); assert.notEqual(historyChanged.sourceSnapshot.fingerprint, before.sourceSnapshot.fingerprint);
  state.homes[0].rev += "-changed";
  assert.notEqual(evaluatePair(state, input).sourceSnapshot.fingerprint, historyChanged.sourceSnapshot.fingerprint);
});

test("matching and ranking are deterministic and do not mutate input state", () => {
  const { state, input } = scenario(); const before = JSON.stringify({ state, input });
  assert.deepEqual(evaluatePair(state, input), evaluatePair(state, input));
  assert.deepEqual(rankPairs(state, input.home), rankPairs(state, input.home));
  assert.equal(JSON.stringify({ state, input }), before);
});

test("a genuine no-match result explains all candidate exclusions without a fallback recommendation", () => {
  const { state, input } = scenario(); input.home.relocationWillingness = "no";
  const results = rankPairs(state, input.home);
  assert.equal(results.length, state.spirits.length * (state.spirits.length - 1) / 2); assert.ok(results.every((result) => result.status === "excluded"));
  assert.ok(results.every((result) => result.exclusions.some((entry) => entry.code === "relocation-refused")));
  results.forEach(noScores);
});

test("anonymous home input rejects personal fields and malformed pair/clause inputs", () => {
  const { state, input } = scenario();
  assert.throws(() => evaluatePair(state, { ...input, home: { ...input.home, address: "not accepted" } as HostPreferences }), MatchingError);
  assert.throws(() => evaluatePair(state, { ...input, spiritIds: [input.spiritIds[0], input.spiritIds[0]] }), MatchingError);
  assert.throws(() => evaluatePair(state, { ...input, acceptedClauseIds: ["ignore-pet-boundary"] }), MatchingError);
});

test("quiet-hour overlap handles midnight and adjacent non-overlapping intervals", () => {
  assert.equal(hoursOverlap({ start: 22, end: 7 }, { start: 1, end: 3 }), true);
  assert.equal(hoursOverlap({ start: 22, end: 7 }, { start: 7, end: 22 }), false);
  assert.equal(hoursOverlap("none", { start: 22, end: 7 }), false);
});

test("a referenced hard quiet-hours boundary cannot be treated as a preference", () => {
  const { state, input } = scenario(); state.spirits[0].audibleHours = { start: 23, end: 2 };
  state.boundaries.push({ id: "boundary-test-hard-quiet", rev: "test-quiet-1", label: "Essential audible hours", description: "This routine cannot be moved.", kind: "hard", rule: "quiet-hours" });
  state.spirits[0].boundaryIds.push("boundary-test-hard-quiet");
  const result = evaluatePair(state, { ...input, acceptedClauseIds: ["quiet-hours"] });
  assert.equal(result.status, "excluded"); noScores(result);
});

test("affinity evidence references participate in revision and missing-source checks", () => {
  const { state, input } = scenario();
  const extra = { id: "history-test-affinity", rev: "affinity-rev-1", title: "Shared correspondence", era: "Fictional", summary: "An additional source.", events: [], sourceNote: "Fictional registry source." };
  state.histories.push(extra);
  state.spirits[0].affinityFacts.push({ id: "fact-test-extra", label: "Correspondence", detail: "A referenced shared interest.", sourceRefs: ["history:history-test-affinity"] });
  const before = evaluatePair(state, input);
  extra.rev = "affinity-rev-2";
  assert.notEqual(evaluatePair(state, input).sourceSnapshot.fingerprint, before.sourceSnapshot.fingerprint);
  state.histories = state.histories.filter((entry) => entry.id !== extra.id);
  const missing = evaluatePair(state, input); assert.equal(missing.status, "needs-information"); noScores(missing);
});

test("an incomplete scoring policy is rejected instead of producing an invented score", () => {
  const { state, input } = scenario();
  state.matchingPolicy.hostWeights = { energy: 30, company: 25, interests: 25, wrongField: 20 } as unknown as HearthState["matchingPolicy"]["hostWeights"];
  assert.throws(() => evaluatePair(state, input), (error: unknown) => error instanceof MatchingError && error.code === "INVALID_POLICY");
});


test("the final central pair needs two quiet-hour changes before June and Leila can be introduced", () => {
  const state = createInitialHearthState();
  const home = state.homes.find((entry) => entry.id === "household_june_leila")!.preferences;
  const spiritIds: [string, string] = ["spirit_iona_vale", "spirit_orin_pell"];
  const before = evaluatePair(state, { home, spiritIds });
  assert.equal(before.status, "needs-negotiation");
  assert.deepEqual(before.negotiations[0].affectedSpiritIds, spiritIds);
  const after = evaluatePair(state, { home, spiritIds, acceptedClauseIds: ["quiet-hours"] });
  assert.equal(after.status, "eligible");
  assert.equal(after.hostAScore! - before.hostAScore!, state.matchingPolicy.hostWeights.quietHours);
  assert.equal(after.hostBScore! - before.hostBScore!, state.matchingPolicy.hostWeights.quietHours);
  assert.ok(after.introductionQuestions.some((question) => /light/i.test(question.question)));
  assert.ok(after.introductionQuestions.some((question) => /sound|ticking/i.test(question.question)));
  assert.ok(after.introductionQuestions.some((question) => question.id === "question_confirmed_exit"));
});

test("Noor's active camera excludes Orin before every score, regardless of pair affinity", () => {
  const state = createInitialHearthState();
  const home = state.homes.find((entry) => entry.id === "household_noor")!.preferences;
  const result = evaluatePair(state, { home, spiritIds: ["spirit_iona_vale", "spirit_orin_pell"], acceptedClauseIds: ["quiet-hours"] });
  assert.equal(result.status, "excluded"); noScores(result);
  assert.ok(result.exclusions.some((entry) => entry.code === "camera-boundary"));
  assert.equal(home.recordingPolicy, "active");
});

test("Cress cannot be recommended where three shared evenings are not sustainable", () => {
  const state = createInitialHearthState();
  const home = state.homes.find((entry) => entry.id === "household_noor")!.preferences;
  const result = evaluatePair(state, { home, spiritIds: ["spirit_cress_morrow", "spirit_tavi_mercer"], acceptedClauseIds: ["quiet-hours"] });
  assert.equal(result.status, "excluded"); noScores(result);
  assert.ok(result.exclusions.some((entry) => entry.code === "shared-evenings-boundary"));
});

test("unknown camera facts stay unknown for a camera-sensitive spirit", () => {
  const state = createInitialHearthState();
  const home = { ...state.homes[0].preferences, recordingPolicy: null };
  const result = evaluatePair(state, { home, spiritIds: ["spirit_iona_vale", "spirit_orin_pell"], acceptedClauseIds: ["quiet-hours"] });
  assert.equal(result.status, "needs-information"); noScores(result);
  assert.ok(result.unknowns.some((entry) => entry.code === "unknown-recording-policy"));
});

test("pet comfort is an explicit trial prerequisite and never silently inferred from null", () => {
  const state = createInitialHearthState();
  const home = state.homes.find((entry) => entry.id === "household_noor")!.preferences;
  const result = evaluatePair(state, { home, spiritIds: ["spirit_bram_kestrel", "spirit_sera_dene"], acceptedClauseIds: ["quiet-hours"] });
  assert.equal(result.status, "eligible");
  for (const id of result.spiritIds) assert.ok(result.introductionQuestions.some((question) => question.spiritId === id && /pet|cat/i.test(question.question) && question.requiredForTrial));
  assert.equal(result.introductionQuestions.filter((question) => /recording coverage/i.test(question.question)).length, 2);
});

test("respect for identity and freedom from required labor are hard conditions for every pair", () => {
  const state = createInitialHearthState();
  const home = { ...state.homes[0].preferences, respectBoundaries: "no" as const };
  const results = rankPairs(state, home, ["quiet-hours"]);
  assert.ok(results.every((result) => result.status === "excluded")); results.forEach(noScores);
});

test("an unknown recording policy leaves an explicit trial question for each spirit", () => {
  const { state, input } = scenario();
  input.home.recordingPolicy = null;
  const result = evaluatePair(state, input);
  assert.equal(result.status, "eligible");
  for (const spiritId of input.spiritIds) assert.ok(result.introductionQuestions.some(question => question.id === `question_recording_${spiritId}` && question.requiredForTrial));
});

test("silence cannot replace Iona's lost morning company with an invented afternoon routine", () => {
  const state = createInitialHearthState();
  const home = state.homes.find(home => home.id === "household_noor")!.preferences;
  for (const acceptedClauseIds of [[], ["quiet-hours"]]) {
    const result = evaluatePair(state, {home, spiritIds: ["spirit_bram_kestrel", "spirit_iona_vale"], acceptedClauseIds});
    assert.equal(result.status, "needs-information"); noScores(result);
    assert.ok(result.unknowns.some(reason => reason.code === "company-window-unconfirmed" && /06:30 to 10:00/.test(reason.detail)));
    assert.ok(!result.exclusions.some(reason => reason.code === "company-window-unconfirmed"));
  }
});

test("all Noor pairs preserve company-window uncertainty wherever Iona is selected", () => {
  const state = createInitialHearthState();
  const home = state.homes.find(home => home.id === "household_noor")!.preferences;
  const pairs = rankPairs(state, home, ["quiet-hours"]);
  assert.equal(pairs.length, state.spirits.length * (state.spirits.length - 1) / 2);
  for (const result of pairs.filter(pair => pair.spiritIds.includes("spirit_iona_vale"))) {
    assert.ok(result.unknowns.some(reason => reason.code === "company-window-unconfirmed"));
    assert.ok(result.status === "needs-information" || result.status === "excluded"); noScores(result);
  }
  assert.equal(pairs.find(pair => pair.spiritIds.includes("spirit_bram_kestrel") && pair.spiritIds.includes("spirit_sera_dene"))!.status, "eligible");
});

test("a partially available company window can be discussed without inventing a new one", () => {
  const {state, input} = scenario();
  state.spirits[0].preferredHours = [{start: 6.5, end: 10}];
  state.spirits[0].audibleHours = {start: 6.5, end: 10};
  input.acceptedClauseIds = ["quiet-hours"];
  const result = evaluatePair(state, input);
  assert.equal(result.status, "eligible");
  assert.ok(!result.unknowns.some(reason => reason.code === "company-window-unconfirmed"));
});

test("company windows handle midnight, exact boundaries, unknown and absent quiet periods", () => {
  const {state, input} = scenario();
  for (const spirit of state.spirits.slice(0, 2)) spirit.preferredHours = [{start: 22, end: 1}];
  input.home.quietHours = {start: 22, end: 7};
  assert.equal(evaluatePair(state, input).status, "needs-information");
  input.home.quietHours = {start: 1, end: 7};
  assert.ok(!evaluatePair(state, input).unknowns.some(reason => reason.code === "company-window-unconfirmed"));
  input.home.quietHours = "none";
  assert.equal(evaluatePair(state, input).status, "eligible");
  input.home.quietHours = null;
  assert.ok(evaluatePair(state, input).unknowns.some(reason => reason.code === "unknown-quietHours"));
});

test("half-hour routines overlap the quiet window at the exact boundary", () => {
  assert.equal(hoursOverlap({ start: 6.5, end: 10 }, { start: 22, end: 7 }), true);
  assert.equal(hoursOverlap({ start: 20.5, end: 23.5 }, { start: 22, end: 7 }), true);
  assert.equal(hoursOverlap({ start: 6.5, end: 10 }, { start: 22, end: 6.5 }), false);
});

test("household introduction questions never name spirits outside the proposed pair", () => {
  const state = createInitialHearthState();
  const givenNames: Record<string, string[]> = {
    spirit_iona_vale: ["Iona"], spirit_orin_pell: ["Orin"], spirit_cress_morrow: ["Cress", "Cressida"],
    spirit_tavi_mercer: ["Tavi"], spirit_bram_kestrel: ["Bram"], spirit_sera_dene: ["Sera"],
  };
  for (const home of state.homes) for (const result of rankPairs(state, home.preferences, ["quiet-hours"])) {
    const questions = result.introductionQuestions.filter(question => question.spiritId === "household");
    const text = questions.map(question => question.question + " " + question.whyItMatters).join(" ");
    for (const spirit of state.spirits.filter(spirit => !result.spiritIds.includes(spirit.id))) {
      for (const name of givenNames[spirit.id] ?? [spirit.name.split(" ")[0]]) assert.ok(!new RegExp("\\b" + name + "\\b", "i").test(text), home.id + " unexpectedly asks about " + name);
    }
  }
});

test("June and Leila's questions remain usable for Sera and Tavi", () => {
  const state = createInitialHearthState();
  const home = state.homes.find(home => home.id === "household_june_leila")!;
  const result = evaluatePair(state, {home: home.preferences, spiritIds: ["spirit_sera_dene", "spirit_tavi_mercer"], acceptedClauseIds: ["quiet-hours"]});
  const questions = result.introductionQuestions.filter(question => question.spiritId === "household");
  assert.ok(questions.some(question => /light/.test(question.question)));
  assert.ok(questions.some(question => /sound/.test(question.question)));
  assert.ok(questions.every(question => !/Iona|Orin/.test(question.question + question.whyItMatters)));
  assert.ok(home.story.includes("Orin"), "The canonical worked example remains in the source story.");
});
