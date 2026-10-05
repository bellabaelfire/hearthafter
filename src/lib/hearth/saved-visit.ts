import type {HostPreferences, Placement, PlacementEvent} from "./domain";
import {consentParties} from "./placement";
import {validateHostPreferences} from "./matching";

export type SavedVisit = {version: 1; home: HostPreferences | null; placements: Placement[]; events: PlacementEvent[]};
export const MAX_SAVED_VISIT_CHARACTERS = 4 * 1024 * 1024;
export const blankVisit = (): SavedVisit => ({version: 1, home: null, placements: [], events: []});

// Browser storage is editable and can outlive a release. Validate it before any
// component reads nested decisions, dates, or evidence. This is recovery, not
// authorization: browser-local decisions never authorize a shared staff record.
type Row = Record<string, unknown>;
const statuses = ["review", "trial", "settled", "declined", "relocating", "closed"];
const actions = ["create", "record-consent", "record-answer", "set-plan", "refresh-review", "transition"];
function invalid(): never {throw new Error("This saved visit is incomplete or uses an unsupported format.");}
function check(condition: unknown): asserts condition {if (!condition) invalid();}
function row(value: unknown): Row {check(value && typeof value === "object" && !Array.isArray(value)); return value as Row;}
function text(value: unknown, maximum = 10000, minimum = 0): asserts value is string {check(typeof value === "string" && value.length >= minimum && value.length <= maximum);}
function token(value: unknown) {text(value, 160, 1); check(/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value));}
function oneOf(value: unknown, choices: string[]) {check(typeof value === "string" && choices.includes(value));}
function list(value: unknown, maximum: number): unknown[] {check(Array.isArray(value) && value.length <= maximum); return value;}
function strings(value: unknown, maximum = 200, textMaximum = 160) {for (const item of list(value, maximum)) text(item, textMaximum);}
function date(value: unknown) {text(value, 40, 1); check(/^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)));}
function home(value: unknown) {validateHostPreferences(row(value) as unknown as HostPreferences);}
function pair(value: unknown) {const ids = list(value, 12); check(ids.length >= 2 && new Set(ids).size === ids.length); ids.forEach(token);}
function snapshot(value: unknown) {
  const source = row(value); text(source.fingerprint, 200000, 1);
  const revisions = Object.entries(row(source.revisions)); check(revisions.length <= 300);
  for (const [key, revision] of revisions) {text(key, 180, 1); text(revision, 160, 1);}
}
function evaluation(value: unknown) {
  const result = row(value); pair(result.spiritIds); home(result.home);
  oneOf(result.status, ["eligible", "needs-negotiation", "needs-information", "excluded"]);
  for (const field of ["hostAScore", "hostBScore", "pairScore", "overallScore"]) {
    const score = result[field]; check(score === null || (typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100));
  }
  for (const field of ["reasons", "exclusions", "unknowns", "hostAFactors", "hostBFactors", "pairFactors"]) {
    for (const value of list(result[field], 400)) {
      const reason = row(value); text(reason.code, 160); text(reason.label, 2000); text(reason.detail); strings(reason.sourceRefs);
      check(reason.impact === undefined || (typeof reason.impact === "number" && Number.isFinite(reason.impact)));
    }
  }
  for (const value of list(result.negotiations, 20)) {
    const negotiation = row(value); oneOf(negotiation.id, ["quiet-hours"]); text(negotiation.title, 2000); text(negotiation.description);
    strings(negotiation.affectedSpiritIds); strings(negotiation.resolves); check(typeof negotiation.accepted === "boolean");
  }
  const residentIds = result.spiritIds as string[];
  if (result.consentRequirements !== undefined) {
    const requirements = list(result.consentRequirements, 25).map(row);
    check(requirements.length >= 3);
    for (const requirement of requirements) {text(requirement.party, 160, 1); check(/^(household|(?:spirit|guardian|assent)-[a-z0-9]+)$/.test(requirement.party)); oneOf(requirement.kind, ["household", "adult", "guardian", "assent"]); text(requirement.label, 500, 1); if(requirement.spiritId !== undefined) token(requirement.spiritId);}
    check(new Set(requirements.map(value => value.party)).size === requirements.length);
    check(requirements.filter(value => value.party === "household" && value.kind === "household" && value.spiritId === undefined).length === 1);
    for (const [index,id] of residentIds.entries()) {
      const suffix = index < 2 ? (index===0?"a":"b") : String(index+1);
      const own = requirements.filter(value => value.spiritId === id);
      const adult = own.length===1 && own[0].kind==="adult" && own[0].party===`spirit-${suffix}`;
      const child = own.some(value=>value.kind==="guardian"&&value.party===`guardian-${suffix}`) && own.length<=2 && own.every(value=>(value.kind==="guardian"&&value.party===`guardian-${suffix}`)||(value.kind==="assent"&&value.party===`assent-${suffix}`));
      check(adult || child);
    }
    check(requirements.every(value=>value.kind==="household"?value.party==="household":residentIds.includes(value.spiritId as string)));
  } else check(residentIds.length===2 && result.hostScores===undefined && result.hostFactors===undefined);
  if (result.hostScores !== undefined) {
    const scores = row(result.hostScores); check(Object.keys(scores).length === residentIds.length && residentIds.every(id=>Object.hasOwn(scores,id)));
    for (const [id,score] of Object.entries(scores)) {token(id); check(score === null || (typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100));}
  }
  if (result.hostFactors !== undefined) {
    const factors = row(result.hostFactors); check(Object.keys(factors).length===residentIds.length && residentIds.every(id=>Object.hasOwn(factors,id)));
    for(const values of Object.values(factors)) for(const value of list(values,200)) {const reason=row(value);text(reason.code,160);text(reason.label,2000);text(reason.detail);strings(reason.sourceRefs);check(reason.impact===undefined||(typeof reason.impact==="number"&&Number.isFinite(reason.impact)));}
  }
  strings(result.acceptedClauseIds, 20); snapshot(result.sourceSnapshot);
  const questions = list(result.introductionQuestions, 400);
  check(new Set(questions.map(value => {const question=row(value);return `${question.spiritId}:${question.id}`;})).size===questions.length);
  for (const value of questions) {
    const question = row(value); token(question.id); token(question.spiritId); text(question.spiritName, 500);
    text(question.question, 4000); text(question.whyItMatters, 4000); strings(question.sourceRefs);
    check(typeof question.requiredForTrial === "boolean");
  }
}
function placement(value: unknown) {
  const entry = row(value); token(entry.id); text(entry.rev, 160, 1); pair(entry.spiritIds); home(entry.home);
  oneOf(entry.status, statuses); strings(entry.acceptedClauseIds, 20); evaluation(entry.evaluation);
  const consents = row(entry.consents);
  check(Object.keys(consents).length <= 25);
  check(JSON.stringify(entry.spiritIds) === JSON.stringify(row(entry.evaluation).spiritIds));
  for (const party of consentParties(entry as unknown as Placement)) {
    const consent = row(consents[party]); oneOf(consent.decision, ["pending", "granted", "denied"]); text(consent.note, 2000);
    if (consent.at !== null) date(consent.at);
  }
  if (entry.trialPlan !== null) {
    const plan = row(entry.trialPlan); check(typeof plan.durationDays === "number" && Number.isInteger(plan.durationDays) && plan.durationDays >= 7 && plan.durationDays <= 30);
    for (const day of list(plan.checkInDays, 30)) check(typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= plan.durationDays);
    text(plan.successCriteria, 1500);
  }
  if (entry.relocationPlan !== null) {
    const plan = row(entry.relocationPlan); for (const field of ["destination", "coordinator", "trigger", "handoverNotes"]) text(plan[field], 1500);
  }
  for (const value of list(entry.answers, 200)) {
    const answer = row(value); token(answer.questionId); token(answer.spiritId); oneOf(answer.answer, ["yes", "no", "unknown"]);
    text(answer.note, 2000); date(answer.at); text(answer.sourceFingerprint, 200000, 1);
  }
  date(entry.createdAt); date(entry.updatedAt); text(entry.note);
}
function event(value: unknown) {
  const entry = row(value); token(entry.id); token(entry.placementId); token(entry.requestId);
  oneOf(entry.action, actions); if (entry.fromStatus !== null) oneOf(entry.fromStatus, statuses); oneOf(entry.toStatus, statuses);
  text(entry.actor, 120, 1); date(entry.at); text(entry.note); text(entry.requestPayload, 200000);
  if (entry.expectedRev !== undefined) text(entry.expectedRev, 160, 1);
}
export function parseSavedVisit(raw: string | null): SavedVisit {
  if (!raw) return blankVisit();
  check(raw.length <= MAX_SAVED_VISIT_CHARACTERS);
  const saved = row(JSON.parse(raw)); check(saved.version === 1);
  if (saved.home !== null) home(saved.home);
  const placements = list(saved.placements, 100), events = list(saved.events, 2000);
  placements.forEach(placement); events.forEach(event);
  check(new Set(placements.map(value => row(value).id)).size === placements.length);
  check(new Set(events.map(value => row(value).id)).size === events.length);
  return saved as unknown as SavedVisit;
}
