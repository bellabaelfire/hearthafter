import type {ConsentParty, HearthState, Placement} from "./domain";
import {PLACEMENT_STATUS_LABELS} from "./domain";
import {evaluatePair, stableSerialize} from "./matching";
import {consentParties, getIntroductionReadinessIssues, getPlacementReadinessIssues} from "./placement";



/** A readable record of the saved decisions, never a substitute for fresh consent. */
export function describeCaseRecord(state: HearthState, placement: Placement, registryAvailable: boolean) {
  let sourcesCurrent = false;
  try {
    const current = evaluatePair(state, {home: placement.home, spiritIds: placement.spiritIds, acceptedClauseIds: placement.acceptedClauseIds});
    sourcesCurrent = current.status === "eligible" && stableSerialize(current.sourceSnapshot) === stableSerialize(placement.evaluation.sourceSnapshot);
  } catch { /* A missing source is a review requirement, not an approval. */ }
  const active = ["review", "trial", "settled"].includes(placement.status);
  const current = registryAvailable && sourcesCurrent;
  const ready = current && getPlacementReadinessIssues(state, placement).length === 0;
  const label = !registryAvailable ? "Registry check unavailable" : active && !sourcesCurrent ? "Review required" : placement.status === "review" && ready ? "Ready for a trial" : PLACEMENT_STATUS_LABELS[placement.status];
  let nextStep: string;
  if (!registryAvailable) nextStep = "Reconnect to the registry before relying on this record for a new decision. The saved relocation arrangements remain available.";
  else if (active && !sourcesCurrent) nextStep = placement.status === "review" ? "Return to the case, review the changed registry details, and collect fresh introduction answers and every required decision." : "The registry details have changed. Do not treat earlier agreements as permission for a new step. Review the changes and use the saved relocation arrangements if needed.";
  else if (placement.status === "review") nextStep = ready ? "All required decisions and the shared plan are recorded. Return to the case when everyone is ready to begin the trial." : "Complete the shared plan and required conversations, then record the household decision and every required adult decision, guardian agreement and age-appropriate assent.";
  else if (placement.status === "trial") nextStep = "Follow the agreed check-ins. Record the outcome after everyone has had a chance to say whether they wish to continue.";
  else if (placement.status === "settled") nextStep = "Keep the agreed boundaries and the right to leave. Any party may request the saved relocation arrangements.";
  else if (placement.status === "relocating") nextStep = "Confirm the next place and complete the handover before closing this case.";
  else if (placement.status === "declined") nextStep = "Respect the refusal. This proposal cannot be reopened by replacing a decision. Add a closing note when ready.";
  else nextStep = "No further action is required on this case. Its recorded decisions remain part of its history.";
  const decisions = consentParties(placement).map(party => {
    const decision = placement.consents[party]?.decision ?? "pending";
    return {party, decision, label: decision === "denied" ? "Refusal recorded" : decision === "pending" ? "Decision pending" : active && !current ? "Agreement needs review" : "Agreement recorded"};
  });
  const required = (placement.evaluation.introductionQuestions ?? []).filter(question => question.requiredForTrial).length;
  const outstanding = getIntroductionReadinessIssues(placement).length;
  return {sourcesCurrent, current, ready, label, nextStep, decisions, required, outstanding, needsAttention: !registryAvailable || (active && !sourcesCurrent)};
}

/** Explicitly marked excerpts keep a case summary concise without changing the saved plan. */
export function caseExcerpt(value: string, limit = 190): string {
  const clean = value.trim().replace(/\s+/g, " ");
  if (clean.length <= limit) return clean;
  const candidate = clean.slice(0, limit - 1);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > limit * .6 ? boundary : undefined)}… [excerpt]`;
}
