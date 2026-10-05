import type { HearthState, HostPreferences, Placement } from "./domain";
import { evaluatePair, stableSerialize } from "./matching";

export type HomePreferenceField = Exclude<keyof HostPreferences, "templateId">;
export interface HouseholdTermChange {
  field: HomePreferenceField;
  label: string;
  before: string;
  after: string;
}
export interface SourceCorrections {
  stale: boolean;
  changes: HouseholdTermChange[];
  notice: string;
}

const labels: Record<HomePreferenceField, string> = {
  departedCapacity: "Space offered to departed residents", householdConsent: "Household willingness to meet", pets: "Pets", quietHours: "Quiet hours",
  privateRetreat: "Private retreat", stepFreeAccess: "Step-free access", hasGarden: "Permitted garden access",
  activityPreference: "Household pace", companyPreference: "Amount of company", nightPresence: "Nighttime presence",
  relocationWillingness: "Support for a safe move", welcomedInterests: "Shared interests",
  recordingPolicy: "Recording arrangements", sharedEvenings: "Shared evenings each week",
  respectBoundaries: "Privacy, identity and freedom to decline",
};
const hour = (value: number) => `${String(Math.floor(value)).padStart(2, "0")}:${value % 1 ? "30" : "00"}`;
function valueLabel(field: HomePreferenceField, value: HostPreferences[HomePreferenceField]): string {
  if (value === null || value === undefined) return "Not yet confirmed";
  if (field === "recordingPolicy") return value === "none" ? "No cameras or recording devices active" : "A camera or recording device remains active";
  if (field === "quietHours") return value === "none" ? "No set quiet hours" : `${hour((value as {start:number}).start)} to ${hour((value as {end:number}).end)}`;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "No interests selected";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field === "pets") return ({none:"No pets",cats:"Cats",dogs:"Dogs",both:"Cats and dogs",other:"Other pets"} as Record<string,string>)[String(value)];
  return String(value).replace(/^./, letter => letter.toUpperCase());
}
function comparisonValue(field: HomePreferenceField, value: HostPreferences[HomePreferenceField]): unknown {
  if (value == null) return null;
  return field === "welcomedInterests" && Array.isArray(value) ? [...new Set(value)].sort() : value;
}

/** Explain only values actually retained in the review. Revisions alone never prove which facts changed. */
export function getSourceCorrections(state: HearthState, placement: Placement): SourceCorrections {
  const currentHome = placement.home.templateId ? state.homes.find(home => home.id === placement.home.templateId) : undefined;
  const changes: HouseholdTermChange[] = [];
  if (currentHome) {
    for (const field of Object.keys(labels) as HomePreferenceField[]) {
      const previous = placement.home[field];
      const current = currentHome.preferences[field];
      if (stableSerialize(comparisonValue(field, previous)) !== stableSerialize(comparisonValue(field, current))) {
        changes.push({field, label:labels[field], before:valueLabel(field, previous), after:valueLabel(field, current)});
      }
    }
  }
  let stale = changes.length > 0;
  try {
    const current = evaluatePair(state, {home:placement.home, spiritIds:placement.spiritIds, acceptedClauseIds:placement.acceptedClauseIds});
    stale ||= stableSerialize(current.sourceSnapshot) !== stableSerialize(placement.evaluation.sourceSnapshot);
  } catch {
    // A missing or invalid record cannot certify that the saved review is current.
    stale = true;
  }
  const notice = !stale ? "" : changes.length
    ? "This review was opened with different household terms. Check the saved and current terms before deciding what happens next."
    : "A source record has changed or is unavailable since this review. Check the current records before continuing; the saved review does not show which facts changed.";
  return {stale, changes, notice};
}
