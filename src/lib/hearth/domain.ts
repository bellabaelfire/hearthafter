/** Hearthafter is a fictional matching service. Profiles are fictional characters; homes are anonymous or synthetic. */
export type Revision = string;
export type Energy = "quiet" | "balanced" | "lively";
export type Company = "low" | "medium" | "high";
export type Presence = "day" | "night" | "both";
export type SpiritPortrait = "gardener" | "musician" | "scholar" | "sailor" | "hostess" | "artist" | "child";
export interface QuietHours { start: number; end: number }
export interface HostPreferences {
  templateId?: string;
  /** Missing preserves legacy snapshots; null is explicitly unknown. */
  departedCapacity?: number | null;
  householdConsent: "yes" | "no" | null;
  pets: "none" | "cats" | "dogs" | "both" | "other" | null;
  quietHours: QuietHours | "none" | null;
  privateRetreat: boolean | null;
  stepFreeAccess: boolean | null;
  hasGarden: boolean | null;
  activityPreference: Energy | null;
  companyPreference: Company | null;
  nightPresence: "welcome" | "unwelcome" | null;
  relocationWillingness: "yes" | "no" | null;
  welcomedInterests: string[];
  recordingPolicy: "none" | "active" | null;
  sharedEvenings: number | null;
  respectBoundaries: "yes" | "no" | null;
}
export interface HomePreset {
  id: string; rev: Revision; name: string; subtitle: string; summary: string;
  story: string; features: string[]; preferences: HostPreferences;
  introductionQuestions: IntroductionQuestion[];
}
export interface HistoryEvent { date: string; title: string; detail: string }
export interface SpiritHistory {
  id: string; rev: Revision; title: string; era: string; summary: string;
  events: HistoryEvent[]; sourceNote: string;
}
export interface Trait {
  id: string; rev: Revision; label: string; description: string; complements: string[];
}
export type BoundaryRule = "private-retreat" | "step-free" | "garden" | "no-cats" | "no-dogs" | "no-other-pets" | "quiet-hours" | "camera-free" | "shared-evenings" | "respect-boundaries" | "defined-quiet-hours";
export interface Boundary {
  id: string; rev: Revision; label: string; description: string;
  kind: "hard" | "negotiable"; rule: BoundaryRule; minimum?: number;
}
export interface AffinityFact {
  id: string; label: string; detail: string; sourceRefs: string[];
}
export interface IntroductionQuestion {
  id: string; question: string; whyItMatters: string; requiredForTrial: boolean; sourceRefs: string[];
}
export interface EvaluatedIntroductionQuestion extends IntroductionQuestion { spiritId: string; spiritName: string }
export interface Spirit {
  id: string; rev: Revision; name: string; pronouns: string; ageAtPassing: number;
  /** Dependent children remain with their documented departed guardian. */
  /** Explicit family or support units cannot be split by the matcher. */
  requiredCompanionIds?: string[]; guardianSpiritId?: string; assentRequired?: boolean; assentExemptionReason?: string;
  era: string; formerOccupation: string; portrait: SpiritPortrait;
  tagline: string; summary: string; biography: string;
  identityHistory?: string[];
  rememberedObjects: string[]; quirks: string[]; contradictions: string[]; currentWants: string[];
  historyIds: string[]; traitIds: string[]; boundaryIds: string[]; affinityFacts: AffinityFact[];
  energy: Energy; company: Company; presence: Presence; interests: string[];
  /** False is a hard exclusion; null requires an observed, affirmative introduction before a trial. */
  petCompatibility: { cats: boolean | null; dogs: boolean | null; other: boolean | null };
  audibleHours: QuietHours | "none";
  quietHoursFlexibility: "can-adjust" | "essential";
  spiritConsent: "yes" | "no" | "pending";
  homeNeeds: string[];
  introductionQuestions: IntroductionQuestion[];
  lifespan?: string; origin?: string; quote?: string; tags?: string[]; preferredHours?: QuietHours[];
  negotiablePreferences?: { id: string; preference: string; possibleAgreement: string }[];
}
export interface PairRelationship {
  id: string; rev: Revision; spiritIds: [string, string];
  status: "friendly" | "unacquainted" | "do-not-pair";
  title: string; description: string; sourceRefs: string[];
}
export interface MatchingPolicy {
  id: string; rev: Revision; title: string; description: string;
  hostWeights: { energy: number; company: number; interests: number; quietHours: number };
  pairWeights: { complementarity: number; sharedInterests: number; presence: number; relationship: number };
  minimumHostScore: number; minimumPairScore: number; minimumOverallScore: number;
}
export interface MatchReason {
  code: string; label: string; detail: string; sourceRefs: string[]; impact?: number;
}
export interface QuietHoursNegotiation {
  id: "quiet-hours"; title: string; description: string;
  affectedSpiritIds: string[]; accepted: boolean; resolves: string[];
}
export interface SourceSnapshot {
  revisions: Record<string, Revision>;
  /** Canonical anonymous answers, accepted clauses, and all referenced source revisions. */
  fingerprint: string;
}
export type MatchStatus = "eligible" | "needs-negotiation" | "needs-information" | "excluded";
export interface PairEvaluation {
  spiritIds: string[]; home: HostPreferences; status: MatchStatus;
  /** First-two aliases retain compatibility with existing saved cases. */
  hostScores?: Record<string, number | null>; hostFactors?: Record<string, MatchReason[]>;
  consentRequirements?: {party: ConsentParty; spiritId?: string; kind: "household" | "adult" | "guardian" | "assent"; label: string}[];
  hostAScore: number | null; hostBScore: number | null; pairScore: number | null; overallScore: number | null;
  reasons: MatchReason[]; exclusions: MatchReason[]; unknowns: MatchReason[];
  hostAFactors: MatchReason[]; hostBFactors: MatchReason[]; pairFactors: MatchReason[];
  negotiations: QuietHoursNegotiation[]; acceptedClauseIds: string[]; sourceSnapshot: SourceSnapshot;
  introductionQuestions: EvaluatedIntroductionQuestion[];
}
export interface PairEvaluationInput {
  home: HostPreferences; spiritIds: string[]; acceptedClauseIds?: string[];
}
export type ConsentParty = "household" | `spirit-${string}` | `guardian-${string}` | `assent-${string}`;
export type ConsentDecision = "pending" | "granted" | "denied";
export interface ConsentRecord { decision: ConsentDecision; at: string | null; note: string }
export interface TrialPlan {
  durationDays: number; checkInDays: number[]; successCriteria: string;
}
export interface RelocationPlan {
  destination: string; coordinator: string; trigger: string; handoverNotes: string;
}
export type PlacementStatus = "review" | "trial" | "settled" | "declined" | "relocating" | "closed";
export interface IntroductionAnswer {
  questionId: string; spiritId: string; answer: "yes" | "no" | "unknown"; note: string; at: string; sourceFingerprint: string;
}
export interface Placement {
  id: string; rev: Revision; spiritIds: string[]; home: HostPreferences;
  acceptedClauseIds: string[]; evaluation: PairEvaluation;
  status: PlacementStatus; consents: Record<ConsentParty, ConsentRecord>;
  trialPlan: TrialPlan | null; relocationPlan: RelocationPlan | null; answers: IntroductionAnswer[];
  createdAt: string; updatedAt: string; note: string;
}
export interface PlacementEvent {
  id: string; placementId: string; action: PlacementCommand["type"];
  fromStatus: PlacementStatus | null; toStatus: PlacementStatus;
  actor: string; at: string; note: string; requestId: string; requestPayload: string;
  expectedRev?: string;
}
export interface HearthArtwork { id: string; rev: Revision; heroUrl: string; overlapUrl: string; portraitAtlasUrl: string }
export interface HearthState {
  artwork?: HearthArtwork;
  spirits: Spirit[]; homes: HomePreset[]; histories: SpiritHistory[]; traits: Trait[];
  boundaries: Boundary[]; pairRelationships: PairRelationship[]; matchingPolicy: MatchingPolicy;
  placements: Placement[]; events: PlacementEvent[];
}
export interface PlacementCommandBase { requestId: string }
export interface ExistingPlacementCommand extends PlacementCommandBase { placementId: string; expectedRev: string }
export type PlacementCommand =
  | (PlacementCommandBase & { type: "create"; home: HostPreferences; spiritIds: string[]; acceptedClauseIds: string[]; sourceSnapshot: SourceSnapshot })
  | (ExistingPlacementCommand & { type: "record-consent"; party: ConsentParty; decision: "granted" | "denied"; note: string })
  | (ExistingPlacementCommand & { type: "record-answer"; questionId: string; spiritId: string; answer: "yes" | "no" | "unknown"; note: string })
  | (ExistingPlacementCommand & { type: "set-plan"; trialPlan: TrialPlan; relocationPlan: RelocationPlan })
  | (ExistingPlacementCommand & { type: "refresh-review"; acceptedClauseIds: string[] })
  | (ExistingPlacementCommand & { type: "transition"; to: "trial" | "settled" | "relocating" | "closed"; note: string });
export interface PlacementContext { actor: string; now: string }
export interface PlacementResult { state: HearthState; placement: Placement; event: PlacementEvent; replayed: boolean }

export const HEARTH_TAGLINE = "Good company. A place to haunt.";
export const INTEREST_OPTIONS = ["gardening", "music", "books", "cooking", "craft", "stories", "stargazing", "tea", "films", "maps", "shared meals", "quiet company"] as const;
export const PLACEMENT_STATUS_LABELS: Record<PlacementStatus, string> = {
  review: "Placement review", trial: "Trial stay", settled: "Settled in", declined: "Declined", relocating: "Relocation underway", closed: "Placement closed",
};
