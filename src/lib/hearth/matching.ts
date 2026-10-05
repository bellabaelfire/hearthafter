import type { Boundary, Company, Energy, HearthState, HostPreferences, MatchReason, PairEvaluation, PairEvaluationInput, QuietHours, EvaluatedIntroductionQuestion, SourceSnapshot, Spirit, Trait } from "./domain";

export class MatchingError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) { super(message); this.name = "MatchingError"; }
}
export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function reason(code: string, label: string, detail: string, sourceRefs: string[] = [], impact?: number): MatchReason {
  return { code, label, detail, sourceRefs, ...(impact === undefined ? {} : { impact }) };
}
function validHours(value: unknown): value is QuietHours {
  if (!value || typeof value !== "object") return false;
  const hours = value as QuietHours;
  return Number.isInteger(hours.start * 2) && Number.isInteger(hours.end * 2) && hours.start >= 0 && hours.start < 24 && hours.end >= 0 && hours.end < 24 && hours.start !== hours.end;
}
export function hoursOverlap(a: QuietHours | "none", b: QuietHours | "none"): boolean {
  if (a === "none" || b === "none") return false;
  const contains = (hours: QuietHours, hour: number) => hours.start < hours.end ? hour >= hours.start && hour < hours.end : hour >= hours.start || hour < hours.end;
  return Array.from({ length: 48 }, (_, slot) => slot / 2).some((hour) => contains(a, hour) && contains(b, hour));
}
const allowedHostFields = new Set(["templateId", "departedCapacity", "householdConsent", "pets", "quietHours", "privateRetreat", "stepFreeAccess", "hasGarden", "activityPreference", "companyPreference", "nightPresence", "relocationWillingness", "welcomedInterests", "recordingPolicy", "sharedEvenings", "respectBoundaries"]);
function companyWindowFullyQuiet(window: QuietHours, quiet: QuietHours): boolean {
  const contains = (hours: QuietHours, hour: number) => hours.start < hours.end ? hour >= hours.start && hour < hours.end : hour >= hours.start || hour < hours.end;
  return !Array.from({ length: 48 }, (_, slot) => slot / 2).some(hour => contains(window, hour) && !contains(quiet, hour));
}
const displayHour = (hour: number) => `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 ? "30" : "00"}`;
/** Visitor answers are a bounded anonymous value object, never names or addresses. */
export function validateHostPreferences(home: HostPreferences): void {
  if (!home || typeof home !== "object" || Array.isArray(home)) throw new MatchingError("INVALID_HOME", 422, "Anonymous household preferences are required.");
  if (Object.keys(home).some((key) => !allowedHostFields.has(key))) throw new MatchingError("INVALID_HOME", 422, "Only anonymous household preference fields are accepted.");
  const enums: [keyof HostPreferences, readonly string[]][] = [
    ["householdConsent", ["yes", "no"]], ["pets", ["none", "cats", "dogs", "both", "other"]],
    ["activityPreference", ["quiet", "balanced", "lively"]], ["companyPreference", ["low", "medium", "high"]],
    ["nightPresence", ["welcome", "unwelcome"]], ["relocationWillingness", ["yes", "no"]],
    ["recordingPolicy", ["none", "active"]], ["respectBoundaries", ["yes", "no"]],
  ];
  for (const [key, values] of enums) if (home[key] != null && !values.includes(home[key] as string)) throw new MatchingError("INVALID_HOME", 422, `Choose a valid ${key} answer or leave it unknown.`);
  for (const key of ["privateRetreat", "stepFreeAccess", "hasGarden"] as const) if (home[key] != null && typeof home[key] !== "boolean") throw new MatchingError("INVALID_HOME", 422, `${key} must be yes, no, or unknown.`);
  if (home.departedCapacity != null && (!Number.isInteger(home.departedCapacity) || home.departedCapacity < 0 || home.departedCapacity > 12)) throw new MatchingError("INVALID_HOME", 422, "Departed resident capacity must be a whole number from 0 to 12, or unknown.");
  if (home.sharedEvenings != null && (!Number.isInteger(home.sharedEvenings) || home.sharedEvenings < 0 || home.sharedEvenings > 7)) throw new MatchingError("INVALID_HOME", 422, "Shared evenings must be a whole number from 0 to 7, or unknown.");
  if (home.quietHours != null && home.quietHours !== "none" && !validHours(home.quietHours)) throw new MatchingError("INVALID_HOME", 422, "Quiet hours require distinct half-hour times from 00:00 through 23:30.");
  if (!Array.isArray(home.welcomedInterests) || home.welcomedInterests.length > 20 || home.welcomedInterests.some((interest) => typeof interest !== "string" || !interest.trim() || interest.length > 60)) throw new MatchingError("INVALID_HOME", 422, "Choose up to twenty short household interests.");
  if (home.templateId !== undefined && (typeof home.templateId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(home.templateId))) throw new MatchingError("INVALID_HOME", 422, "The preset reference is invalid.");
}
function validatePolicy(state: HearthState): void {
  const policy = state.matchingPolicy;
  if (!policy || !policy.rev) throw new MatchingError("INVALID_POLICY", 422, "A versioned matching policy is required.");
  const groups: [Record<string, number>, string[]][] = [[policy.hostWeights, ["energy", "company", "interests", "quietHours"]], [policy.pairWeights, ["complementarity", "sharedInterests", "presence", "relationship"]]];
  for (const [weights, fields] of groups) {
    if (!weights || Object.keys(weights).length !== fields.length || fields.some((field) => !Number.isFinite(weights[field]) || weights[field] < 0 || weights[field] > 100) || Object.values(weights).reduce((a, b) => a + b, 0) !== 100) throw new MatchingError("INVALID_POLICY", 422, "Each matching weight group must contain all four defined percentages adding to 100.");
  }
  if ([policy.minimumHostScore, policy.minimumPairScore, policy.minimumOverallScore].some((score) => !Number.isFinite(score) || score < 0 || score > 100)) throw new MatchingError("INVALID_POLICY", 422, "Matching thresholds must be percentages between 0 and 100.");
}
function collectSources(state: HearthState, spirits: Spirit[], home: HostPreferences, clauses: string[], unknowns: MatchReason[]): SourceSnapshot {
  const revisions: Record<string, string> = {};
  const add = (kind: string, id: string, entry: { rev: string } | undefined) => {
    const key = `${kind}:${id}`;
    if (!entry?.rev) { unknowns.push(reason("missing-source", "A source record is missing", `Review the referenced ${kind} record before making a recommendation.`, [key])); revisions[key] = "missing"; }
    else revisions[key] = entry.rev;
  };
  add("policy", state.matchingPolicy.id, state.matchingPolicy);
  for (const spirit of spirits) {
    add("spirit", spirit.id, spirit);
    for (const id of spirit.historyIds) add("history", id, state.histories.find((entry) => entry.id === id));
    for (const id of spirit.traitIds) add("trait", id, state.traits.find((entry) => entry.id === id));
    for (const id of spirit.boundaryIds) add("boundary", id, state.boundaries.find((entry) => entry.id === id));
  }
  const relationships = state.pairRelationships.filter((entry) => entry.spiritIds.every((id) => spirits.some((spirit) => spirit.id === id)));
  for (const pair of relationships) add("relationship", pair.id, pair);
  const sourceCollections: Record<string, { id: string; rev: string }[]> = {
    spirit: state.spirits, history: state.histories, trait: state.traits, boundary: state.boundaries,
    home: state.homes, relationship: state.pairRelationships, policy: [state.matchingPolicy],
  };
  const evidenceRefs = [...spirits.flatMap((spirit) => spirit.affinityFacts.flatMap((fact) => fact.sourceRefs)), ...spirits.flatMap((spirit) => (spirit.introductionQuestions ?? []).flatMap((question) => question.sourceRefs)), ...relationships.flatMap((pair) => pair.sourceRefs), ...(state.homes.find((entry) => entry.id === home.templateId)?.introductionQuestions ?? []).flatMap((question) => question.sourceRefs)];
  for (const ref of new Set(evidenceRefs)) {
    const separator = ref.indexOf(":");
    const explicitKind = separator >= 0 ? ref.slice(0, separator) : undefined;
    const id = separator >= 0 ? ref.slice(separator + 1) : ref;
    const kind = explicitKind ?? Object.keys(sourceCollections).find((key) => sourceCollections[key].some((entry) => entry.id === id)) ?? "source";
    add(kind, id, sourceCollections[kind]?.find((entry) => entry.id === id));
  }
  if (home.templateId) add("home", home.templateId, state.homes.find((entry) => entry.id === home.templateId));
  const fingerprint = stableSerialize({ home, spiritIds: spirits.map((spirit) => spirit.id), acceptedClauseIds: [...clauses].sort(), revisions });
  return { revisions, fingerprint };
}
function assessBoundary(boundary: Boundary, spirit: Spirit, home: HostPreferences, exclusions: MatchReason[], unknowns: MatchReason[]): void {
  const refs = [`spirit:${spirit.id}`, `boundary:${boundary.id}`];
  const validRules = ["private-retreat", "step-free", "garden", "no-cats", "no-dogs", "no-other-pets", "quiet-hours", "camera-free", "shared-evenings", "respect-boundaries", "defined-quiet-hours"];
  if (!validRules.includes(boundary.rule) || !["hard", "negotiable"].includes(boundary.kind) || (boundary.kind === "negotiable" && boundary.rule !== "quiet-hours")) {
    unknowns.push(reason("unknown-boundary-rule", "A boundary needs review", `${spirit.name}'s boundary record does not define a supported, enforceable rule.`, refs));
    return;
  }
  if (boundary.rule === "camera-free") {
    if (home.recordingPolicy == null) unknowns.push(reason("unknown-recording-policy", "The recording policy is unknown", `Confirm that ${spirit.name}'s agreed presence area is free of cameras and recording.`, refs));
    else if (home.recordingPolicy !== "none") exclusions.push(reason("camera-boundary", "A camera-free area is essential", `${spirit.name} needs a camera-free space; this household keeps a camera or recording device active.`, refs));
  }
  if (boundary.rule === "shared-evenings") {
    if (!Number.isInteger(boundary.minimum) || boundary.minimum! < 1 || boundary.minimum! > 7) unknowns.push(reason("unknown-evening-minimum", "The evening commitment needs review", "This boundary has no valid minimum number of shared evenings.", refs));
    else if (home.sharedEvenings == null) unknowns.push(reason("unknown-shared-evenings", "A sustainable evening routine is unknown", `Confirm whether at least ${boundary.minimum} shared evenings are genuinely sustainable.`, refs));
    else if (home.sharedEvenings < boundary.minimum!) exclusions.push(reason("shared-evenings-boundary", "The shared-evening commitment is not available", `${spirit.name} needs at least ${boundary.minimum} sustainable shared evenings; this household offers ${home.sharedEvenings}.`, refs));
  }
  if (boundary.rule === "respect-boundaries" && home.respectBoundaries === "no") exclusions.push(reason("respect-boundary", boundary.label, `${spirit.name}: ${boundary.description}`, refs));
  if (boundary.rule === "defined-quiet-hours" && home.quietHours === "none") exclusions.push(reason("written-quiet-plan", "Written quiet hours are required", `${spirit.name} needs an explicit quiet window and an agreed way to communicate changes.`, refs));
  const booleanRule = { "private-retreat": "privateRetreat", "step-free": "stepFreeAccess", garden: "hasGarden" } as const;
  if (boundary.rule in booleanRule) {
    const field = booleanRule[boundary.rule as keyof typeof booleanRule];
    if (home[field] == null) unknowns.push(reason(`unknown-${field}`, `${spirit.name} needs an answer`, `Confirm ${boundary.label.toLowerCase()} before matching.`, refs));
    else if (home[field] === false) exclusions.push(reason(`boundary-${boundary.rule}`, boundary.label, `${spirit.name}: ${boundary.description}`, refs));
  }
  const petRule = { "no-cats": ["cats", "both"], "no-dogs": ["dogs", "both"], "no-other-pets": ["other"] };
  if (boundary.rule in petRule && petRule[boundary.rule as keyof typeof petRule].includes(home.pets ?? "")) exclusions.push(reason(`boundary-${boundary.rule}`, boundary.label, `${spirit.name}: ${boundary.description}`, refs));
}
function individualFactors(state: HearthState, spirit: Spirit, home: HostPreferences, conflict: boolean, clauseAccepted: boolean): MatchReason[] {
  const weights = state.matchingPolicy.hostWeights;
  const energy: Energy[] = ["quiet", "balanced", "lively"];
  const company: Company[] = ["low", "medium", "high"];
  const fit = (distance: number) => distance === 0 ? 1 : distance === 1 ? 0.65 : 0.25;
  const common = spirit.interests.filter((interest) => home.welcomedInterests.includes(interest));
  const interestFit = home.welcomedInterests.length === 0 ? 0.5 : common.length ? Math.min(1, common.length / Math.min(2, Math.max(1, spirit.interests.length))) : 0.25;
  const refs = [`spirit:${spirit.id}`, ...spirit.traitIds.map((id) => `trait:${id}`)];
  return [
    reason("host-energy", "A comfortable pace", `${spirit.name} prefers a ${spirit.energy} household; this home chose ${home.activityPreference}.`, refs, Math.round(weights.energy * fit(Math.abs(energy.indexOf(spirit.energy) - energy.indexOf(home.activityPreference!))))),
    reason("host-company", "Room for company", `${spirit.name} prefers ${spirit.company} levels of company; this home chose ${home.companyPreference}.`, refs, Math.round(weights.company * fit(Math.abs(company.indexOf(spirit.company) - company.indexOf(home.companyPreference!))))),
    reason("host-interests", "Things to share", common.length ? `Shared interests: ${common.join(", ")}.` : home.welcomedInterests.length ? "Their interests differ from the ones this household selected. An introduction could reveal other things to share." : "Choose the things you enjoy if you would like them considered. It is fine to leave this open.", refs, Math.round(weights.interests * interestFit)),
    reason("host-quiet-hours", clauseAccepted && conflict ? "Quiet hours agreed" : "Quiet hours", conflict ? clauseAccepted ? "Sound, light, and object movement follow the household quiet window and this spirit's specific offered agreement. Any quiet presence still needs express permission." : "A preferred active routine overlaps the household quiet window. A specific agreement about sound, light, and manifestations is still needed." : "The recorded active routine does not overlap the household quiet window; each manifestation still needs agreement.", [`spirit:${spirit.id}`, ...spirit.boundaryIds.map((id) => `boundary:${id}`)], conflict && !clauseAccepted ? 0 : weights.quietHours),
  ];
}
function pairFactors(state: HearthState, a: Spirit, b: Spirit): MatchReason[] {
  const weights = state.matchingPolicy.pairWeights;
  const aTraits = a.traitIds.map((id) => state.traits.find((trait) => trait.id === id)).filter((trait): trait is Trait => Boolean(trait));
  const bTraits = b.traitIds.map((id) => state.traits.find((trait) => trait.id === id)).filter((trait): trait is Trait => Boolean(trait));
  const complementary = aTraits.flatMap((left) => bTraits.filter((right) => left.complements.includes(right.id) || right.complements.includes(left.id)).map((right) => [left, right] as const));
  const shared = a.interests.filter((interest) => b.interests.includes(interest));
  const overlap = a.presence === b.presence || a.presence === "both" || b.presence === "both";
  const relationship = state.pairRelationships.find((entry) => entry.spiritIds.length === 2 && entry.spiritIds.includes(a.id) && entry.spiritIds.includes(b.id));
  const refs = [`spirit:${a.id}`, `spirit:${b.id}`];
  return [
    reason("pair-complementarity", "Different strengths", complementary.length ? `${complementary[0][0].description} ${complementary[0][1].description} These approaches may support each other; an introduction will help them find out.` : "We have less information about how these two would get along. An introduction would help.", complementary.length ? complementary[0].map((trait) => `trait:${trait.id}`) : refs, Math.round(weights.complementarity * (complementary.length ? 1 : 0.45))),
    reason("pair-interests", "Common ground", shared.length ? `Both enjoy ${shared.join(", ")}.` : "They enjoy different things. They may prefer separate invitations as well as time together.", refs, Math.round(weights.sharedInterests * (shared.length >= 2 ? 1 : shared.length === 1 ? 0.8 : 0.35))),
    reason("pair-presence", "Time together", overlap ? "Their presence patterns include time together." : "One prefers daytime and the other nighttime; overlap will take planning.", refs, Math.round(weights.presence * (overlap ? 1 : 0.6))),
    reason("pair-relationship", relationship?.title ?? "A first introduction", relationship?.description ?? "Their applications do not mention a shared history. An introduction would let them get to know each other.", relationship ? [`relationship:${relationship.id}`, ...relationship.sourceRefs] : refs, Math.round(weights.relationship * (relationship?.status === "friendly" ? 1 : 0.5))),
  ];
}
const sum = (factors: MatchReason[]) => Math.min(100, factors.reduce((total, factor) => total + (factor.impact ?? 0), 0));

export function evaluatePair(state: HearthState, input: PairEvaluationInput): PairEvaluation {
  validateHostPreferences(input?.home);
  validatePolicy(state);
  if (!Array.isArray(input.spiritIds) || input.spiritIds.length < 2 || input.spiritIds.length > 12 || new Set(input.spiritIds).size !== input.spiritIds.length) throw new MatchingError("INVALID_PAIR", 422, "Choose at least two different departed residents (up to twelve per supported review). No departed resident is placed alone.");
  const spirits = input.spiritIds.map((id) => state.spirits.find((spirit) => spirit.id === id));
  if (spirits.some(spirit => !spirit)) throw new MatchingError("SPIRIT_NOT_FOUND", 404, "A selected spirit profile is unavailable.");
  const group = spirits as Spirit[];
  const [a, b] = group;
  const acceptedClauseIds = [...new Set(input.acceptedClauseIds ?? [])].sort();
  if (!Array.isArray(input.acceptedClauseIds ?? []) || acceptedClauseIds.some((id) => id !== "quiet-hours")) throw new MatchingError("INVALID_CLAUSE", 422, "Only the documented quiet-hours clause can be negotiated.");
  const home = structuredClone(input.home);
  const exclusions: MatchReason[] = [];
  const unknowns: MatchReason[] = [];
  const required: [keyof HostPreferences, string][] = [["householdConsent", "Everyone in the adult household agrees"], ["pets", "Pets in the home"], ["quietHours", "Household quiet hours"], ["activityPreference", "Household pace"], ["companyPreference", "Desired amount of company"], ["nightPresence", "Comfort with nighttime presence"], ["relocationWillingness", "Willingness to support a safe relocation"], ["respectBoundaries", "Respect for identity, privacy, and freedom from unpaid work"]];
  for (const [key, label] of required) if (home[key] == null) unknowns.push(reason(`unknown-${key}`, label, "This required answer is unknown. It is not treated as permission or a good fit."));
  if (home.departedCapacity === null || (home.departedCapacity === undefined && group.length > 2)) unknowns.push(reason("unknown-capacity", "Space for the whole group needs confirmation", "Confirm how many departed residents have an appropriate place to stay and retreat. Unknown space is not permission."));
  else if (home.departedCapacity !== undefined && home.departedCapacity < group.length) exclusions.push(reason("household-capacity", "The household cannot accommodate this whole group", `This household offers space for ${home.departedCapacity} departed residents; this review includes ${group.length}. A family or supported group is not split to improve its score.`, home.templateId ? [`home:${home.templateId}`] : []));
  if (home.householdConsent === "no") exclusions.push(reason("household-consent", "Household consent is required", "A placement cannot proceed over a household member's refusal."));
  if (home.relocationWillingness === "no") exclusions.push(reason("relocation-refused", "A safe exit must remain available", "The household must be willing to support relocation if any party ends the arrangement."));
  if (home.respectBoundaries === "no") exclusions.push(reason("household-respect", "Company cannot be conditional on service", "Names, pronouns, privacy, and the freedom to decline work, care, performance, or surveillance must be respected.", [`policy:${state.matchingPolicy.id}`]));
  const sourceSnapshot = collectSources(state, group, home, acceptedClauseIds, unknowns);
  const conflicts: Spirit[] = [];
  for (const spirit of group) {
    const refs = [`spirit:${spirit.id}`];
    if (!Array.isArray(spirit.introductionQuestions)) unknowns.push(reason("missing-introduction-questions", "The introduction review is incomplete", "The profile must explicitly define its questions before a group can be recommended.", refs));
    if (!Number.isFinite(spirit.ageAtPassing)) unknowns.push(reason("unknown-age", "Age and support needs confirmation", `${spirit.name}'s profile has incomplete age information.`, refs));
    else if (spirit.ageAtPassing < 0) unknowns.push(reason("unknown-age", "Age needs confirmation", "A valid age at passing is required.", refs));
    if (spirit.requiredCompanionIds !== undefined) {
      if (!Array.isArray(spirit.requiredCompanionIds) || spirit.requiredCompanionIds.length > 11 || new Set(spirit.requiredCompanionIds).size !== spirit.requiredCompanionIds.length || spirit.requiredCompanionIds.some(id => typeof id !== "string" || id === spirit.id || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id))) unknowns.push(reason("invalid-support-unit", "The family or support-unit boundary needs review", `${spirit.name} has an incomplete required-companion record.`, refs));
      else if (spirit.requiredCompanionIds.some(id => !input.spiritIds.includes(id))) exclusions.push(reason("required-companions", "This family or supported group stays together", `${spirit.name} has explicitly required their departed companions to be included. This review cannot separate the group to fit a smaller household.`, [...refs, ...spirit.requiredCompanionIds.map(id => `spirit:${id}`)]));
    }
    if (spirit.ageAtPassing < 18) {
      const guardian = group.find(member => member.id === spirit.guardianSpiritId && member.ageAtPassing >= 18);
      if (spirit.assentRequired === false && (typeof spirit.assentExemptionReason !== "string" || spirit.assentExemptionReason.trim().length < 20 || spirit.assentExemptionReason.length > 1500)) unknowns.push(reason("child-care-review", "Developmental care needs review", `${spirit.name} needs a documented developmental-care reason for why individual assent is not applicable. Guardian permission never overrides distress or refusal.`, refs));
      if (!guardian) exclusions.push(reason("guardian-required", "A dependent child stays with their departed guardian", `${spirit.name} cannot be considered without their documented adult departed guardian in the same group.`, refs));
    }
    if (spirit.spiritConsent === "no") exclusions.push(reason("spirit-consent", `${spirit.name} has declined`, "A match score cannot override a spirit's refusal.", refs));
    else if ((spirit.ageAtPassing >= 18 || spirit.assentRequired !== false) && spirit.spiritConsent !== "yes") unknowns.push(reason("unknown-spirit-consent", `${spirit.name}'s consent is pending`, "Confirm willingness to be considered before recommending this group.", refs));
    if (!["quiet", "balanced", "lively"].includes(spirit.energy) || !["low", "medium", "high"].includes(spirit.company) || !["day", "night", "both"].includes(spirit.presence)) unknowns.push(reason("unknown-routine", "A routine needs review", `${spirit.name}'s pace, company preference, or presence pattern is incomplete.`, refs));
    if (home.nightPresence === "unwelcome" && spirit.presence !== "day") exclusions.push(reason("night-boundary", "Nighttime presence is not welcome", `${spirit.name}'s recorded presence includes nighttime. Quiet activity would not resolve a boundary about presence itself.`, refs));
    if (spirit.preferredHours !== undefined) {
      if (!Array.isArray(spirit.preferredHours) || spirit.preferredHours.some(window => !validHours(window))) unknowns.push(reason("unknown-company-hours", "Preferred company hours need confirmation", `${spirit.name}'s preferred company windows are incomplete or invalid.`, refs));
      else if (home.quietHours && home.quietHours !== "none") {
        const quiet = home.quietHours;
        const unavailable = spirit.preferredHours.filter(window => companyWindowFullyQuiet(window, quiet));
        if (unavailable.length) unknowns.push(reason("company-window-unconfirmed", "A time for company still needs agreement", `${spirit.name}'s preferred company window${unavailable.length > 1 ? "s" : ""} ${unavailable.map(window => `${displayHour(window.start)} to ${displayHour(window.end)}`).join(" and ")} falls entirely inside the household's quiet hours. Agreeing to silence does not establish an alternative afternoon or other routine. Discuss a workable time and update the profile or household schedule before recommending this group.`, [...refs, ...(home.templateId ? [`home:${home.templateId}`] : [])]));
      }
    }
    for (const pet of ["cats", "dogs", "other"] as const) {
      const present = home.pets === pet || (home.pets === "both" && pet !== "other");
      if (present && spirit.petCompatibility?.[pet] === false) exclusions.push(reason(`pets-${pet}`, `${spirit.name} needs a different pet arrangement`, `The profile explicitly rules out sharing a home with ${pet}. This is not a negotiable preference.`, refs));
    }
    for (const id of spirit.boundaryIds) {
      const boundary = state.boundaries.find((entry) => entry.id === id);
      if (boundary) assessBoundary(boundary, spirit, home, exclusions, unknowns);
    }
    if (spirit.audibleHours !== "none" && !validHours(spirit.audibleHours)) unknowns.push(reason("unknown-audible-hours", "Audible hours need confirmation", `${spirit.name}'s audible routine is not fully recorded.`, refs));
    else if (home.quietHours != null && hoursOverlap(spirit.audibleHours, home.quietHours)) {
      const hardQuietBoundary = spirit.boundaryIds.some((id) => state.boundaries.some((boundary) => boundary.id === id && boundary.rule === "quiet-hours" && boundary.kind === "hard"));
      if (spirit.quietHoursFlexibility === "essential" || hardQuietBoundary) exclusions.push(reason("essential-routine", "An essential routine conflicts", `${spirit.name} cannot move this audible routine outside the household quiet window. The quiet-hours clause cannot override it.`, refs));
      else if (spirit.quietHoursFlexibility === "can-adjust") conflicts.push(spirit);
      else unknowns.push(reason("unknown-flexibility", "Quiet-hour flexibility is unknown", `Confirm whether ${spirit.name} can adjust the audible routine.`, refs));
    }
  }
  const relationships = state.pairRelationships.filter((entry) => entry.spiritIds.every(id => input.spiritIds.includes(id)));
  for (const relationship of relationships) if (relationship.status === "do-not-pair") exclusions.push(reason("pair-boundary", relationship.title, relationship.description, [`relationship:${relationship.id}`, ...relationship.sourceRefs]));
  const negotiations = conflicts.length ? [{ id: "quiet-hours" as const, title: "A quieter kind of midnight", description: "Move sound, light, and object movement outside the household quiet window. Any quiet presence needs express agreement, and a silent light is not automatically permitted. Each spirit's offered arrangement still applies: " + conflicts.flatMap((spirit) => (spirit.negotiablePreferences ?? []).map((preference) => `${spirit.name}: ${preference.possibleAgreement}`)).join(" "), affectedSpiritIds: conflicts.map((spirit) => spirit.id), accepted: acceptedClauseIds.includes("quiet-hours"), resolves: conflicts.map((spirit) => `audible-hours:${spirit.id}`) }] : [];
  const introductionQuestions: EvaluatedIntroductionQuestion[] = group.flatMap((spirit) => (spirit.introductionQuestions ?? []).map((question) => ({ ...question, spiritId: spirit.id, spiritName: spirit.name })));
  for (const spirit of group) {
    const presentPets = (["cats", "dogs", "other"] as const).filter((pet) => home.pets === pet || (home.pets === "both" && pet !== "other"));
    const unconfirmedPets = presentPets.filter((pet) => spirit.petCompatibility?.[pet] == null);
    const existingPetQuestion = introductionQuestions.some((question) => question.spiritId === spirit.id && /\b(pets?|cats?|dogs?)\b/i.test(question.question));
    if (unconfirmedPets.length && !existingPetQuestion) introductionQuestions.push({ id: `question_pet_introduction_${spirit.id}`, spiritId: spirit.id, spiritName: spirit.name, question: `Has an observed, low-pressure introduction confirmed comfort between ${spirit.name} and the household's ${unconfirmedPets.join(" and ")}?`, whyItMatters: "Pet comfort is not known from this profile. It requires an affirmative introduction result before the trial; absence of a refusal is not proof of comfort.", requiredForTrial: true, sourceRefs: [`spirit:${spirit.id}`, ...(home.templateId ? [`home:${home.templateId}`] : [])] });
  }
  for (const spirit of group.filter(member => member.ageAtPassing < 18)) introductionQuestions.push({id:`question_dependent_care_${spirit.id}`,spiritId:spirit.id,spiritName:spirit.name,question:spirit.assentRequired === false ? `Has the guardian and placement coordinator reviewed the developmental reason (${spirit.assentExemptionReason ?? "not yet documented"}), agreed how ${spirit.name}'s comfort and distress are observed, and confirmed that any refusal stops the stay?` : `Have the guardian and placement coordinator agreed age-appropriate conversations with ${spirit.name}, continued care together, and a way to express refusal without pressure?`,whyItMatters:"A child is not asked for adult legal consent. Guardian care agreement, age-appropriate assent where applicable, and the child's right to refuse remain separate requirements.",requiredForTrial:true,sourceRefs:[`spirit:${spirit.id}`, ...(spirit.guardianSpiritId?[`spirit:${spirit.guardianSpiritId}`]:[])]});
  const preset = state.homes.find((entry) => entry.id === home.templateId);
  introductionQuestions.push(...(preset?.introductionQuestions ?? []).map((question) => ({ ...question, spiritId: "household", spiritName: preset?.name ?? "The household" })));
  if (!introductionQuestions.some((question) => question.id === "question_confirmed_exit")) introductionQuestions.push({ id: "question_confirmed_exit", spiritId: "household", spiritName: "The household", question: "Has the interim destination and responsible coordinator actually confirmed the welcome?", whyItMatters: "A named possibility is not a confirmed exit. A trial needs somewhere safe to go if any party ends it.", requiredForTrial: true, sourceRefs: [`policy:${state.matchingPolicy.id}`] });
  if (home.recordingPolicy !== "none") for (const spirit of group) introductionQuestions.push({ id: `question_recording_${spirit.id}`, spiritId: spirit.id, spiritName: spirit.name, question: home.recordingPolicy === "active" ? `Has ${spirit.name} freely agreed to the precise recording coverage, purpose, and retention in the shared areas?` : `Has the household recording policy been confirmed with ${spirit.name}, including specific agreement to any coverage, purpose, and retention?`, whyItMatters: "Unknown recording arrangements cannot count as permission. Recording permission must be specific and voluntary. This answer cannot override an existing camera-free hard boundary.", requiredForTrial: true, sourceRefs: [`spirit:${spirit.id}`, ...(home.templateId ? [`home:${home.templateId}`] : [])] });
  const evaluation: PairEvaluation = {
    spiritIds: group.map(spirit => spirit.id), home, status: exclusions.length ? "excluded" : unknowns.length ? "needs-information" : "eligible",
    hostAScore: null, hostBScore: null, pairScore: null, overallScore: null,
    reasons: [...exclusions, ...unknowns], exclusions, unknowns, hostAFactors: [], hostBFactors: [], pairFactors: [], negotiations, acceptedClauseIds, sourceSnapshot, introductionQuestions,
  };
  evaluation.consentRequirements = [{party: "household", kind: "household", label: "The living household"}, ...group.flatMap<NonNullable<PairEvaluation["consentRequirements"]>[number]>((spirit, index) => {
    const suffix = index < 2 ? (index === 0 ? "a" : "b") : String(index + 1);
    if (spirit.ageAtPassing >= 18) return [{party: `spirit-${suffix}` as const, kind: "adult" as const, spiritId: spirit.id, label: spirit.name}];
    const guardianName = group.find(member => member.id === spirit.guardianSpiritId)?.name ?? "Documented guardian";
    return [{party: `guardian-${suffix}` as const, kind: "guardian" as const, spiritId: spirit.id, label: `${guardianName}: care agreement for ${spirit.name}`}, ...(spirit.assentRequired === false ? [] : [{party: `assent-${suffix}` as const, kind: "assent" as const, spiritId: spirit.id, label: `${spirit.name}: age-appropriate assent`}])];
  })];
  evaluation.hostScores = Object.fromEntries(group.map(spirit => [spirit.id, null]));
  evaluation.hostFactors = Object.fromEntries(group.map(spirit => [spirit.id, []]));
  // Hard boundaries and unknown required facts terminate the evaluation before any score exists.
  if (exclusions.length || unknowns.length) return evaluation;
  evaluation.hostFactors = Object.fromEntries(group.map(spirit => [spirit.id, individualFactors(state, spirit, home, conflicts.includes(spirit), acceptedClauseIds.includes("quiet-hours"))]));
  evaluation.hostScores = Object.fromEntries(group.map(spirit => [spirit.id, sum(evaluation.hostFactors![spirit.id])]));
  evaluation.hostAFactors = evaluation.hostFactors[a.id]; evaluation.hostBFactors = evaluation.hostFactors[b.id];
  evaluation.hostAScore = evaluation.hostScores[a.id]; evaluation.hostBScore = evaluation.hostScores[b.id];
  const edges = group.flatMap((left, index) => group.slice(index + 1).map(right => ({left, right, factors: pairFactors(state, left, right)})));
  const mean = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  evaluation.pairFactors = edges.flatMap(edge => edge.factors.map(factor => group.length === 2 ? factor : {...factor, label: `${edge.left.name} + ${edge.right.name}: ${factor.label}`, impact: Math.round((factor.impact ?? 0) / edges.length)}));
  const edgeScores = edges.map(edge => sum(edge.factors));
  evaluation.pairScore = mean(edgeScores);
  const hostScores = group.map(spirit => evaluation.hostScores![spirit.id]!);
  evaluation.overallScore = mean([...hostScores, evaluation.pairScore]);
  const unresolved = negotiations.some((clause) => !clause.accepted);
  const potentialHosts = group.map(spirit => evaluation.hostScores![spirit.id]! + (unresolved && conflicts.includes(spirit) ? state.matchingPolicy.hostWeights.quietHours : 0));
  const potentialOverall = mean([...potentialHosts, evaluation.pairScore]);
  // Every resident and every relationship must clear its threshold: averages cannot conceal an unsafe edge.
  if (potentialHosts.some(score => score < state.matchingPolicy.minimumHostScore) || edgeScores.some(score => score < state.matchingPolicy.minimumPairScore) || potentialOverall < state.matchingPolicy.minimumOverallScore) {
    exclusions.push(reason("policy-threshold", "This group does not clear the fit threshold", "At least one resident, relationship, or overall score falls below the published policy threshold, even with available negotiation.", [`policy:${state.matchingPolicy.id}`]));
    evaluation.status = "excluded";
  } else evaluation.status = unresolved ? "needs-negotiation" : "eligible";
  evaluation.reasons = [...exclusions, ...evaluation.pairFactors, ...Object.values(evaluation.hostFactors).flatMap(factors => factors.filter(factor => factor.code === "host-quiet-hours"))];
  return evaluation;
}

/** Includes explicit exclusions and unknowns so callers can explain a genuine no-match result. */
export function rankPairs(state: HearthState, home: HostPreferences, acceptedClauseIds: string[] = []): PairEvaluation[] {
  const results: PairEvaluation[] = [];
  const spirits = [...state.spirits].sort((a, b) => a.id.localeCompare(b.id));
  for (let a = 0; a < spirits.length; a++) for (let b = a + 1; b < spirits.length; b++) results.push(evaluatePair(state, { home, spiritIds: [spirits[a].id, spirits[b].id], acceptedClauseIds }));
  const order = { eligible: 0, "needs-negotiation": 1, "needs-information": 2, excluded: 3 };
  return results.sort((a, b) => order[a.status] - order[b.status] || (b.overallScore ?? -1) - (a.overallScore ?? -1) || a.spiritIds.join("|").localeCompare(b.spiritIds.join("|")));
}

/** The guest register offers pairs and three-resident groups. Larger groups use the same evaluator and review engine. */
export function rankGroups(state: HearthState, home: HostPreferences, acceptedClauseIds: string[] = [], groupSize = 2): PairEvaluation[] {
  if (!Number.isInteger(groupSize) || groupSize < 2 || groupSize > 3) throw new MatchingError("INVALID_GROUP_SIZE", 422, "Browse groups of two or three residents.");
  if (groupSize === 2) return rankPairs(state, home, acceptedClauseIds);
  const residents = [...state.spirits].sort((a,b) => a.id.localeCompare(b.id));
  const result: PairEvaluation[] = [];
  for (let a=0;a<residents.length;a++) for(let b=a+1;b<residents.length;b++) for(let c=b+1;c<residents.length;c++) result.push(evaluatePair(state,{home,spiritIds:[residents[a].id,residents[b].id,residents[c].id],acceptedClauseIds}));
  const order = {eligible:0,"needs-negotiation":1,"needs-information":2,excluded:3};
  return result.sort((a,b)=>order[a.status]-order[b.status]||(b.overallScore??-1)-(a.overallScore??-1)||a.spiritIds.join("|").localeCompare(b.spiritIds.join("|")));
}
