import type {Placement, PlacementCommand, PlacementContext, PlacementEvent} from "./domain";
import {stableSerialize} from "./matching";
import {consentParties, PlacementError} from "./placement";
import {parseSavedVisit, type SavedVisit} from "./saved-visit";

export type SavedWithdrawalCommand = Extract<PlacementCommand, {type: "record-consent"}> & {decision: "denied"};
export type SavedWithdrawalResult = {saved: SavedVisit; placement: Placement; event: PlacementEvent; replayed: boolean};
function fail(code: string, message: string, status = 422): never {throw new PlacementError(code, status, message);}
function boundedText(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) fail("VALIDATION_ERROR", `${label} must contain ${min} to ${max} characters.`);
  return value.trim();
}

/** Browser-local refusal only. It neither accepts nor constructs live registry records. */
export function applySavedWithdrawal(input: SavedVisit, command: SavedWithdrawalCommand, context: PlacementContext): SavedWithdrawalResult {
  const saved = parseSavedVisit(JSON.stringify(input));
  if (!command || command.type !== "record-consent" || command.decision !== "denied") fail("REGISTRY_REQUIRED", "Reconnect to the registry before changing this review. Only a local refusal or withdrawal is available here.");
  const requestId = boundedText(command.requestId, "Request ID", 8, 96);
  if (requestId !== command.requestId || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,95}$/.test(requestId)) fail("VALIDATION_ERROR", "Use a valid request token.");
  boundedText(command.placementId, "Placement ID", 1, 160);
  boundedText(command.expectedRev, "Expected revision", 1, 160);
  if (!/^(household|(?:spirit|guardian|assent)-[a-z0-9]+)$/.test(command.party)) fail("VALIDATION_ERROR", "Use a required consent party from this saved case.");
  const consentNote = boundedText(command.note, "Consent note", 5, 1500);
  const actor = boundedText(context?.actor, "Acting reviewer", 1, 120);
  if (typeof context?.now !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(context.now) || !Number.isFinite(Date.parse(context.now))) fail("VALIDATION_ERROR", "A valid ISO review timestamp is required.");
  const requestPayload = stableSerialize({actor, command});
  const previous = saved.events.find(event => event.requestId === requestId);
  if (previous) {
    if (previous.requestPayload !== requestPayload) fail("IDEMPOTENCY_CONFLICT", "This request ID was already used for a different operation.", 409);
    const placement = saved.placements.find(entry => entry.id === previous.placementId);
    if (!placement) fail("INCONSISTENT_STATE", "The original review event exists but its placement is unavailable.", 409);
    return {saved, placement, event: previous, replayed: true};
  }
  const existing = saved.placements.find(entry => entry.id === command.placementId);
  if (!existing) fail("NOT_FOUND", "The saved placement review could not be found.", 404);
  if (existing.rev !== command.expectedRev) fail("STALE_REVISION", "This case changed in another tab. Review its latest saved record before trying again.", 409);
  if (!["review", "trial", "settled"].includes(existing.status)) fail("INVALID_TRANSITION", "This case no longer accepts consent changes. Its saved exit plan remains available.", 409);
  if (!consentParties(existing).includes(command.party)) fail("VALIDATION_ERROR", "This consent party does not belong to the reviewed group.");
  const placement = structuredClone(existing);
  placement.rev = `rev-${requestId}`;
  placement.updatedAt = context.now;
  placement.consents[command.party] = {decision: "denied", at: context.now, note: consentNote};
  placement.status = existing.status === "review" ? "declined" : "relocating";
  placement.note = `${command.party}: denied. ${consentNote}`;
  const event: PlacementEvent = {
    id: `hearth-event-${requestId}`, placementId: placement.id, action: "record-consent", fromStatus: existing.status,
    toStatus: placement.status, actor, at: context.now, note: placement.note, requestId, requestPayload, expectedRev: command.expectedRev,
  };
  const next = parseSavedVisit(JSON.stringify({...saved, placements: saved.placements.map(entry => entry.id === placement.id ? placement : entry), events: [...saved.events, event]}));
  return {saved: next, placement, event, replayed: false};
}

export function savedResidentName(placement: Placement, id: string, index: number): string {
  return placement.evaluation.introductionQuestions.find(question => question.spiritId === id && question.spiritName.trim())?.spiritName ?? `Departed resident ${index + 1}`;
}
