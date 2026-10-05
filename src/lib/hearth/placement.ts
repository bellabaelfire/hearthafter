import type { ConsentParty, HearthState, PairEvaluation, Placement, PlacementCommand, PlacementContext, PlacementEvent, PlacementResult, PlacementStatus, RelocationPlan, SourceSnapshot, TrialPlan } from "./domain";
import { evaluatePair, stableSerialize } from "./matching";

export class PlacementError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) { super(message); this.name = "PlacementError"; }
}
function fail(code: string, message: string, status = 422): never { throw new PlacementError(code, status, message); }
function text(value: unknown, label: string, min = 1, max = 2000): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) fail("VALIDATION_ERROR", `${label} must contain ${min} to ${max} characters.`);
  return value.trim();
}
export const PLACEMENT_TRANSITIONS: Record<PlacementStatus, readonly PlacementStatus[]> = {
  review: ["trial", "closed"], trial: ["settled", "relocating"], settled: ["relocating"], declined: ["closed"], relocating: ["closed"], closed: [],
};
function sameSnapshot(a: SourceSnapshot, b: SourceSnapshot): boolean { return stableSerialize(a) === stableSerialize(b); }
function currentEvaluation(state: HearthState, placement: Placement): PairEvaluation {
  return evaluatePair(state, { home: placement.home, spiritIds: placement.spiritIds, acceptedClauseIds: placement.acceptedClauseIds });
}
function requireCurrentSources(state: HearthState, placement: Placement): PairEvaluation {
  const evaluation = currentEvaluation(state, placement);
  if (!sameSnapshot(evaluation.sourceSnapshot, placement.evaluation.sourceSnapshot)) fail("STALE_SOURCES", "A profile, boundary, history, relationship, home, or policy changed. Refresh the review and collect fresh consent before continuing.", 409);
  if (evaluation.status !== "eligible") fail("MATCH_NOT_ELIGIBLE", "This group no longer meets the household's placement conditions. Review the matching explanation before continuing.");
  return evaluation;
}
function validateTrialPlan(plan: TrialPlan): void {
  if (!plan || !Number.isInteger(plan.durationDays) || plan.durationDays < 7 || plan.durationDays > 30) fail("TRIAL_PLAN_REQUIRED", "Agree a trial stay of 7 to 30 days.");
  if (!Array.isArray(plan.checkInDays) || plan.checkInDays.length < 2 || plan.checkInDays.length > plan.durationDays || plan.checkInDays.some((day) => !Number.isInteger(day) || day < 1 || day > plan.durationDays) || new Set(plan.checkInDays).size !== plan.checkInDays.length || !plan.checkInDays.includes(plan.durationDays)) fail("TRIAL_PLAN_REQUIRED", "Schedule at least two distinct check-ins, including one on the final trial day.");
  text(plan.successCriteria, "Trial success criteria", 20, 1500);
}
function validateRelocationPlan(plan: RelocationPlan): void {
  if (!plan) fail("RELOCATION_PLAN_REQUIRED", "A safe relocation plan is required before the trial begins.");
  for (const [key, label, min] of [["destination", "Relocation destination", 5], ["coordinator", "Relocation coordinator role", 3], ["trigger", "Relocation trigger", 12], ["handoverNotes", "Relocation handover", 12]] as const) {
    if (typeof plan[key] !== "string" || plan[key].trim().length < min || plan[key].length > 1500) fail("RELOCATION_PLAN_REQUIRED", `${label} must contain ${min} to 1500 characters.`);
  }
}
/** New cases preserve adult first-two keys; legacy pair cases require their original three decisions. */
export function consentRequirements(placement: Placement) {
  return placement.evaluation.consentRequirements ?? [{party: "household" as ConsentParty, kind: "household" as const, label: "The living household"}, ...placement.spiritIds.map((id,index) => ({party: `spirit-${index < 2 ? (index === 0 ? "a" : "b") : index+1}` as ConsentParty, kind: "adult" as const, spiritId: id, label: `Departed resident ${index+1}`}))];
}
export function consentParties(placement: Placement): ConsentParty[] { return consentRequirements(placement).map(requirement => requirement.party); }
function resetConsent(placement: Placement) { placement.consents = Object.fromEntries(consentParties(placement).map(party => [party, {decision: "pending", at: null, note: ""}])) as Placement["consents"]; }
function validateConsent(state: HearthState, placement: Placement): void {
  const authoritative = currentEvaluation(state, placement);
  const requiredParties = (authoritative.consentRequirements ?? []).map(requirement => requirement.party);
  if (requiredParties.length < 3) fail("CONSENT_REQUIRED", "Every resident needs a reviewed consent requirement.");
  if (requiredParties.some((party) => placement.consents[party]?.decision === "denied")) fail("CONSENT_DENIED", "A refusal ends the proposed arrangement. Consent cannot be overridden.");
  if (requiredParties.some((party) => placement.consents[party]?.decision !== "granted")) fail("CONSENT_REQUIRED", "The household, every adult departed resident, and each required guardian or child assent must be recorded before the trial starts.");
}
export function getIntroductionReadinessIssues(placement: Placement): string[] {
  return (placement.evaluation.introductionQuestions ?? []).filter((question) => question.requiredForTrial).flatMap((question) => {
    const answer = (placement.answers ?? []).find((entry) => entry.questionId === question.id && entry.spiritId === question.spiritId);
    if (answer?.answer === "yes" && answer.sourceFingerprint === placement.evaluation.sourceSnapshot.fingerprint) return [];
    return [`${question.spiritName}: ${question.question} ${answer?.answer === "no" ? "This prerequisite is not met." : "A current, affirmative confirmation is still needed."}`];
  });
}
function validateIntroductionAnswers(placement: Placement): void {
  const unresolved = getIntroductionReadinessIssues(placement);
  if (unresolved.length) fail("INTRODUCTION_ANSWERS_REQUIRED", `Resolve every required introduction question before the trial. ${unresolved.join(" ")}`);
}
export function getPlacementReadinessIssues(state: HearthState, placement: Placement): string[] {
  const issues: string[] = [];
  for (const check of [() => requireCurrentSources(state, placement), () => validateConsent(state, placement), () => validateIntroductionAnswers(placement), () => validateTrialPlan(placement.trialPlan!), () => validateRelocationPlan(placement.relocationPlan!)]) {
    try { check(); } catch (error) { issues.push(error instanceof Error ? error.message : "The placement needs review."); }
  }
  return issues;
}
export function getAvailablePlacementTransitions(placement: Placement): PlacementStatus[] { return [...PLACEMENT_TRANSITIONS[placement.status]]; }
function validateCommand(command: PlacementCommand): void {
  if (!command || typeof command !== "object") fail("VALIDATION_ERROR", "A placement command is required.");
  const requestId = text(command.requestId, "Request ID", 8, 96);
  if (requestId !== command.requestId || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,95}$/.test(requestId)) fail("VALIDATION_ERROR", "Request ID must be an 8 to 96 character token using letters, numbers, dashes, or underscores.");
  if (!["create", "record-consent", "record-answer", "set-plan", "refresh-review", "transition"].includes(command.type)) fail("VALIDATION_ERROR", "Unknown placement operation.");
  if (command.type === "create") {
    if (!command.sourceSnapshot || typeof command.sourceSnapshot.fingerprint !== "string" || !command.sourceSnapshot.revisions) fail("SOURCE_REVIEW_REQUIRED", "Submit the reviewed source snapshot with the proposed group.");
    return;
  }
  text(command.placementId, "Placement ID", 1, 160);
  text(command.expectedRev, "Expected revision", 1, 160);
  if (command.type === "record-consent") {
    if (!/^(household|(?:spirit|guardian|assent)-[a-z0-9]+)$/.test(command.party) || !["granted", "denied"].includes(command.decision)) fail("VALIDATION_ERROR", "Record a valid decision for the household or a required resident, guardian or assent party.");
    text(command.note, "Consent note", 5, 1500);
  }
  if (command.type === "record-answer") {
    text(command.questionId, "Question ID", 1, 160);
    text(command.spiritId, "Question subject", 1, 160);
    if (!["yes", "no", "unknown"].includes(command.answer)) fail("VALIDATION_ERROR", "Use yes, no, or unknown for an introduction answer.");
    text(command.note, "Introduction answer note", 5, 1500);
  }
  if (command.type === "transition") text(command.note, "Review note", 12, 2000);
}

/** Pure, revision-aware placement workflow. A refusal and a safe exit remain available even when sources are stale. */
export function applyPlacementCommand(state: HearthState, command: PlacementCommand, context: PlacementContext): PlacementResult {
  validateCommand(command);
  const actor = text(context?.actor, "Acting reviewer", 1, 120);
  if (typeof context.now !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(context.now) || !Number.isFinite(Date.parse(context.now))) fail("VALIDATION_ERROR", "A valid ISO review timestamp is required.");
  const requestPayload = stableSerialize({ actor, command });
  const previous = state.events.find((event) => event.requestId === command.requestId);
  if (previous) {
    if (previous.requestPayload !== requestPayload) fail("IDEMPOTENCY_CONFLICT", "This request ID was already used for a different operation.", 409);
    const placement = state.placements.find((entry) => entry.id === previous.placementId);
    if (!placement) fail("INCONSISTENT_STATE", "The original review event exists but its placement is unavailable.", 409);
    return { state, placement, event: previous, replayed: true };
  }
  let placement: Placement;
  let fromStatus: PlacementStatus | null = null;
  let note: string;
  if (command.type === "create") {
    const evaluation = evaluatePair(state, { home: command.home, spiritIds: command.spiritIds, acceptedClauseIds: command.acceptedClauseIds });
    if (!sameSnapshot(command.sourceSnapshot, evaluation.sourceSnapshot)) fail("STALE_SOURCES", "The reviewed profiles or household answers changed. Recalculate before opening the placement review.", 409);
    if (evaluation.status !== "eligible") fail("MATCH_NOT_ELIGIBLE", "Resolve missing information, exclusions, and proposed agreements before opening a placement review.");
    placement = {
      id: `placement-${command.requestId}`, rev: `rev-${command.requestId}`, spiritIds: [...command.spiritIds],
      home: structuredClone(command.home), acceptedClauseIds: [...evaluation.acceptedClauseIds], evaluation: structuredClone(evaluation),
      status: "review", consents: { household: { decision: "pending", at: null, note: "" }, "spirit-a": { decision: "pending", at: null, note: "" }, "spirit-b": { decision: "pending", at: null, note: "" } },
      trialPlan: null, relocationPlan: null, answers: [], createdAt: context.now, updatedAt: context.now, note: "A promising match is ready for a voluntary placement review.",
    };
    resetConsent(placement);
    if (state.placements.some((entry) => entry.id === placement.id)) fail("IDEMPOTENCY_CONFLICT", "A placement already exists for this request ID.", 409);
    note = placement.note;
  } else {
    const existing = state.placements.find((entry) => entry.id === command.placementId);
    if (!existing) fail("NOT_FOUND", "The placement review could not be found.", 404);
    if (existing.rev !== command.expectedRev) fail("STALE_REVISION", "This placement changed after you opened it. Refresh the review before trying again.", 409);
    fromStatus = existing.status;
    placement = structuredClone(existing);
    placement.rev = `rev-${command.requestId}`;
    placement.updatedAt = context.now;
    if (command.type === "record-consent") {
      if (!["review", "trial", "settled"].includes(existing.status)) fail("INVALID_TRANSITION", "This placement no longer accepts consent changes. A declined arrangement cannot be reopened by overriding the refusal.", 409);
      if (!consentParties(existing).includes(command.party)) fail("VALIDATION_ERROR", "This consent party does not belong to the reviewed group.");
      if (command.decision === "granted") requireCurrentSources(state, existing);
      placement.consents[command.party] = { decision: command.decision, at: context.now, note: command.note.trim() };
      if (command.decision === "denied") placement.status = existing.status === "review" ? "declined" : "relocating";
      note = `${command.party}: ${command.decision}. ${command.note.trim()}`;
    } else if (command.type === "record-answer") {
      if (existing.status !== "review") fail("INVALID_TRANSITION", "Introduction answers can only be recorded during the placement review. An active stay can use its agreed exit or withdraw consent.", 409);
      requireCurrentSources(state, existing);
      const question = existing.evaluation.introductionQuestions.find((entry) => entry.id === command.questionId && entry.spiritId === command.spiritId);
      if (!question) fail("UNKNOWN_QUESTION", "This question does not belong to the reviewed introduction.");
      const prior = (existing.answers ?? []).find((entry) => entry.questionId === command.questionId && entry.spiritId === command.spiritId);
      const changed = prior?.answer !== command.answer || prior.note !== command.note.trim();
      placement.answers = [...(existing.answers ?? []).filter((entry) => !(entry.questionId === command.questionId && entry.spiritId === command.spiritId)), { questionId: command.questionId, spiritId: command.spiritId, answer: command.answer, note: command.note.trim(), at: context.now, sourceFingerprint: existing.evaluation.sourceSnapshot.fingerprint }];
      if (changed) { resetConsent(placement); }
      note = `${question.spiritName}: ${command.answer}. ${question.question} ${command.note.trim()}`;
    } else if (command.type === "set-plan") {
      if (existing.status !== "review") fail("INVALID_TRANSITION", "Trial and relocation plans must be agreed during the placement review.", 409);
      requireCurrentSources(state, existing);
      validateTrialPlan(command.trialPlan);
      validateRelocationPlan(command.relocationPlan);
      const changed = stableSerialize(existing.trialPlan) !== stableSerialize(command.trialPlan) || stableSerialize(existing.relocationPlan) !== stableSerialize(command.relocationPlan);
      placement.trialPlan = structuredClone(command.trialPlan);
      placement.trialPlan.checkInDays.sort((a, b) => a - b);
      placement.relocationPlan = structuredClone(command.relocationPlan);
      if (changed) { placement.answers = []; resetConsent(placement); }
      note = `Agreed a ${command.trialPlan.durationDays}-day trial, scheduled check-ins, and a safe relocation plan. ${changed ? "Fresh consent is required for this plan." : "The reviewed plan is unchanged."}`;
    } else if (command.type === "refresh-review") {
      if (existing.status !== "review") fail("INVALID_TRANSITION", "Only an open placement review can be refreshed. An active stay must use its safe exit when conditions no longer hold.", 409);
      const reviewHome = existing.home.templateId ? state.homes.find((home) => home.id === existing.home.templateId)?.preferences ?? existing.home : existing.home;
      const evaluation = evaluatePair(state, { home: reviewHome, spiritIds: existing.spiritIds, acceptedClauseIds: command.acceptedClauseIds });
      if (evaluation.status !== "eligible") fail("MATCH_NOT_ELIGIBLE", "This proposed group is no longer eligible. Close the review or choose another group.");
      placement.home = structuredClone(reviewHome);
      placement.evaluation = structuredClone(evaluation);
      placement.acceptedClauseIds = [...evaluation.acceptedClauseIds];
      placement.answers = [];
      resetConsent(placement);
      note = "Reviewed current source records and agreements. Every required party must give fresh consent.";
    } else {
      if (!PLACEMENT_TRANSITIONS[existing.status].includes(command.to)) fail("INVALID_TRANSITION", `A placement in ${existing.status} cannot move to ${command.to}.`, 409);
      if (command.to === "trial" || command.to === "settled") {
        requireCurrentSources(state, existing);
        validateConsent(state, existing);
        validateTrialPlan(existing.trialPlan!);
        validateRelocationPlan(existing.relocationPlan!);
        validateIntroductionAnswers(existing);
        if (command.to === "settled") text(command.note, "Trial outcome review", 20, 2000);
      }
      if (command.to === "relocating") validateRelocationPlan(existing.relocationPlan!);
      placement.status = command.to;
      note = command.note.trim();
    }
    placement.note = note;
  }
  const event: PlacementEvent = {
    id: `hearth-event-${command.requestId}`, placementId: placement.id, action: command.type, fromStatus, toStatus: placement.status,
    actor, at: context.now, note, requestId: command.requestId, requestPayload,
    ...(command.type === "create" ? {} : { expectedRev: command.expectedRev }),
  };
  return {
    state: { ...state, placements: command.type === "create" ? [...state.placements, placement] : state.placements.map((entry) => entry.id === placement.id ? placement : entry), events: [...state.events, event] },
    placement, event, replayed: false,
  };
}
