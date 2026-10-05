import {defineArrayMember, defineField, defineType} from "sanity";
import {INTEREST_OPTIONS, PLACEMENT_STATUS_LABELS} from "../lib/hearth/domain";
import {SnapshotInput} from "./SnapshotInput";

const str = (name: string, title?: string) => defineField({name, title, type: "string"});
const text = (name: string, title?: string) => defineField({name, title, type: "text", rows: 4});
const strings = (name: string, title?: string) => defineField({name, title, type: "array", of: [defineArrayMember({type: "string"})]});
const list = (name: string, values: readonly string[], title?: string) => defineField({name, title, type: "string", options: {list: [...values]}});
const idField = defineField({name: "id", title: "Stable record ID", type: "string", readOnly: true, description: "Used by matching and placement records. Created by the seed or application API."});
const refs = (name: string, types: string[], title: string) => defineField({
  name, title, type: "array", readOnly: true,
  description: "Native links generated from the authoritative record IDs.",
  of: [defineArrayMember({type: "reference", to: types.map((type) => ({type}))})],
});
const snapshot = (name: string, title: string) => defineField({
  name, title, type: "object", readOnly: true,
  // Values are machine-owned domain objects. The custom input reads all stored
  // keys without trying to edit dynamic maps or object/string unions.
  fields: [defineField({name: "summary", type: "string", hidden: true})],
  components: {input: SnapshotInput},
});
const formatHour = (hour: unknown) => typeof hour === "number" && Number.isFinite(hour)
  ? [Math.floor(hour), Math.round((hour % 1) * 60)].map((part) => String(part).padStart(2, "0")).join(":")
  : "?";
const hours = defineField({
  name: "audibleHours", title: "Audible hours", type: "object",
  validation: (Rule) => Rule.custom((value) => !value || value.start !== value.end || "Start and end hours must differ."),
  description: "Leave empty when this spirit makes no audible sound. Use whole or half hours from 0 to 23.5 on a 24-hour clock; start and end must differ.",
  fields: [
    defineField({name: "start", type: "number", validation: (Rule) => Rule.required().min(0).max(23.5).custom((value) => value === undefined || Number.isInteger(value * 2) || "Use whole or half hours, such as 6 or 6.5.")}),
    defineField({name: "end", type: "number", validation: (Rule) => Rule.required().min(0).max(23.5).custom((value) => value === undefined || Number.isInteger(value * 2) || "Use whole or half hours, such as 6 or 6.5.")}),
  ],
});
const householdPreferences = defineField({
  name: "preferences", title: "Household preferences", type: "object", readOnly: true,
  description: "Approved fictional preset snapshot. These stored presets use explicit quiet-hour ranges; anonymous guest choices remain local.",
  components: {input: SnapshotInput},
  fields: [
    defineField({name:"departedCapacity",title:"Departed resident capacity",type:"number",description:"Maximum supported residents with appropriate space and retreat. Missing preserves old records; new presets should explicitly state capacity.",validation:Rule=>Rule.integer().min(0).max(12)}),
    str("templateId", "Household preset ID"), list("householdConsent", ["yes", "no"]),
    list("pets", ["none", "cats", "dogs", "both", "other"]),
    defineField({name: "quietHours", title: "Quiet hours", type: "object", fields: hours.fields,
      validation: hours.validation,
      preview: {select: {start: "start", end: "end"}, prepare({start, end}) {return {title: [start, end].map(formatHour).join(" - ")};}},
    }),
    defineField({name: "privateRetreat", type: "boolean"}),
    defineField({name: "stepFreeAccess", type: "boolean"}),
    defineField({name: "hasGarden", type: "boolean"}),
    list("activityPreference", ["quiet", "balanced", "lively"]),
    list("companyPreference", ["low", "medium", "high"]),
    list("nightPresence", ["welcome", "unwelcome"]),
    list("relocationWillingness", ["yes", "no"]),
    strings("welcomedInterests"), list("recordingPolicy", ["none", "active"]),
    defineField({name: "sharedEvenings", type: "number", validation: (Rule) => Rule.integer().min(0).max(7)}),
    list("respectBoundaries", ["yes", "no"]),
  ],
});
const introductionQuestions = () => defineField({
  name: "introductionQuestions", title: "Introduction questions", type: "array", initialValue: [],
  description: "Required questions need a current-source yes answer before a trial or settled placement.",
  of: [defineArrayMember({type: "object", fields: [
    defineField({name: "id", type: "string", validation: (Rule) => Rule.required()}),
    defineField({name: "question", type: "text", rows: 2, validation: (Rule) => Rule.required()}),
    text("whyItMatters", "Why it matters"),
    defineField({name: "requiredForTrial", title: "Required before a trial", type: "boolean", initialValue: false}),
    strings("sourceRefs", "Supporting record IDs"),
  ], preview: {select: {title: "question", subtitle: "id"}}})],
});
const profiles = ["hearthSpirit", "hearthHistory", "hearthTrait", "hearthBoundary"];
const preview = {select: {title: "name", subtitle: "tagline"}};
const managed = "Managed by the placement desk. Open the desk to make an authorized, audited change.";
const protectedFields = <T extends {name: string}>(fields: T[]) => fields.map((field) => ({...field, readOnly: true}));

const spirit = defineType({
  name: "hearthSpirit", title: "Spirit", type: "document",
  description: "A fictional departed resident. Dependent children stay with a documented adult departed guardian. Shared matching facts affect every proposal that references this profile.",
  fields: [
    idField, str("name"), str("pronouns"),
    defineField({name: "ageAtPassing", type: "number", validation: (Rule) => Rule.required().integer().min(0)}),
    defineField({name:"requiredCompanionIds",title:"Required departed companions",type:"array",of:[defineArrayMember({type:"string"})],validation:Rule=>Rule.max(11).unique(),description:"An explicit family or support-unit boundary. These residents must be considered together; a household score cannot separate them."}),
    refs("companionRefs",["hearthSpirit"],"Required companion records"),
    defineField({name: "guardianSpiritId", title: "Departed guardian ID", type: "string", description: "A dependent child must be reviewed with this adult departed guardian in the same group.", validation: Rule => Rule.custom((value,context) => typeof context.document?.ageAtPassing === "number" && context.document.ageAtPassing < 18 && !value ? "A documented departed guardian is required for a child." : true)}),
    defineField({name: "guardianRef", title: "Departed guardian record", type: "reference", to: [{type:"hearthSpirit"}], readOnly:true, description:"Native relationship generated from the guardian ID."}),
    defineField({name: "assentRequired", title: "Age-appropriate assent required", type: "boolean", description: "Defaults to required. Set false only with a documented developmental-care reason in the introduction questions; guardian agreement remains required."}),
    defineField({name:"assentExemptionReason",title:"Developmental reason assent is not applicable",type:"text",rows:3,validation:Rule=>Rule.custom((value,context)=>context.document?.assentRequired===false && (typeof value!=="string"||value.trim().length<20||value.length>1500)?"Document a developmental-care reason of 20 to 1500 characters; guardian review and observable refusal remain required.":true)}),
    str("era"), str("formerOccupation"),
    list("portrait", ["gardener", "musician", "scholar", "sailor", "hostess", "artist", "child"]),
    str("tagline"), text("summary"), text("biography"),
    str("lifespan", "Lifespan"), str("origin", "Place of origin"), text("quote", "In their words"), strings("tags", "Profile tags"),
    defineField({name: "preferredHours", title: "Preferred hours", type: "array",
      description: "The spirit's preferred daily rhythms, expressed as 24-hour ranges in whole or half hours from 0 to 23.5. Overnight ranges may end before they start.",
      of: [defineArrayMember({type: "object",
        validation: (Rule) => Rule.custom((value) => !value || value.start !== value.end || "Start and end hours must differ."),
        fields: [
          defineField({name: "start", type: "number", validation: (Rule) => Rule.required().min(0).max(23.5).custom((value) => value === undefined || Number.isInteger(value * 2) || "Use whole or half hours, such as 6 or 6.5.")}),
          defineField({name: "end", type: "number", validation: (Rule) => Rule.required().min(0).max(23.5).custom((value) => value === undefined || Number.isInteger(value * 2) || "Use whole or half hours, such as 6 or 6.5.")}),
        ],
        preview: {select: {start: "start", end: "end"}, prepare({start, end}) {return {title: [start, end].map(formatHour).join(" - ")};}},
      })],
    }),
    defineField({name: "negotiablePreferences", title: "Negotiable preferences", type: "array", of: [defineArrayMember({type: "object",
      fields: [str("id", "Preference ID"), text("preference", "Preference"), text("possibleAgreement", "Possible agreement")],
      preview: {select: {title: "preference", subtitle: "possibleAgreement"}},
    })]}),
    strings("rememberedObjects"), strings("quirks"), strings("contradictions"), strings("currentWants"), strings("identityHistory", "Identity history"),
    strings("historyIds", "History record IDs"), strings("traitIds", "Trait IDs"), strings("boundaryIds", "Boundary IDs"),
    refs("historyRefs", ["hearthHistory"], "Linked histories"), refs("traitRefs", ["hearthTrait"], "Linked traits"),
    refs("boundaryRefs", ["hearthBoundary"], "Linked boundaries"),
    defineField({name: "affinityFacts", type: "array", of: [defineArrayMember({type: "object", fields: [str("id"), str("label"), text("detail"), strings("sourceRefs")], preview: {select: {title: "label", subtitle: "detail"}}})]}),
    list("energy", ["quiet", "balanced", "lively"]), list("company", ["low", "medium", "high"]), list("presence", ["day", "night", "both"]),
    defineField({name: "interests", type: "array", of: [defineArrayMember({type: "string"})], options: {list: [...INTEREST_OPTIONS]}}),
    defineField({name: "petCompatibility", type: "object",
      description: "True means confirmed compatibility; false is a hard exclusion. Leave an unknown value unset: an observed, affirmative introduction is required before a trial. Missing source details do not imply compatibility.",
      fields: [
      defineField({name: "cats", type: "boolean"}), defineField({name: "dogs", type: "boolean"}), defineField({name: "other", type: "boolean"}),
    ]}),
    hours, list("quietHoursFlexibility", ["can-adjust", "essential"]),
    list("spiritConsent", ["yes", "no", "pending"]), strings("homeNeeds"), introductionQuestions(),
  ],
  preview,
});

const home = defineType({
  name: "hearthHome", title: "Fictional home", type: "document",
  description: "A named fictional household preset, never an identifiable visitor or submitted guest quiz.",
  fields: [idField, str("name"), str("subtitle"), text("summary"), text("story"), strings("features"), householdPreferences, introductionQuestions()],
  preview: {select: {title: "name", subtitle: "subtitle"}},
});

const history = defineType({
  name: "hearthHistory", title: "Shared history", type: "document",
  fields: [
    idField, str("title"), str("era"), text("summary"),
    defineField({name: "events", type: "array", of: [defineArrayMember({type: "object", fields: [str("date"), str("title"), text("detail")], preview: {select: {title: "title", subtitle: "date"}}})]}),
    text("sourceNote"),
  ],
  preview: {select: {title: "title", subtitle: "era"}},
});
const trait = defineType({
  name: "hearthTrait", title: "Shared trait", type: "document",
  fields: [idField, str("label"), text("description"), strings("complements")],
  preview: {select: {title: "label", subtitle: "description"}},
});
const boundary = defineType({
  name: "hearthBoundary", title: "Boundary", type: "document",
  fields: [idField, str("label"), text("description"), list("kind", ["hard", "negotiable"]), list("rule", ["private-retreat", "step-free", "garden", "no-cats", "no-dogs", "no-other-pets", "quiet-hours", "camera-free", "shared-evenings", "respect-boundaries", "defined-quiet-hours"]),
    defineField({name: "minimum", title: "Minimum shared evenings", type: "number", hidden: ({parent}) => parent?.rule !== "shared-evenings", validation: (Rule) => Rule.integer().min(0).max(7)}),
  ],
  preview: {select: {title: "label", subtitle: "kind"}},
});
const pairRelationship = defineType({
  name: "hearthPairRelationship", title: "Pair relationship", type: "document",
  fields: [
    idField, strings("spiritIds", "Spirit IDs"), refs("spiritRefs", ["hearthSpirit"], "The two spirits"),
    list("status", ["friendly", "unacquainted", "do-not-pair"]), str("title"), text("description"), strings("sourceRefs"),
    refs("sourceDocuments", profiles, "Supporting records"),
  ],
  preview: {select: {title: "title", subtitle: "status"}},
});
const weight = (name: string) => defineField({name, type: "number", validation: (Rule) => Rule.required().min(0)});
const matchingPolicy = defineType({
  name: "hearthMatchingPolicy", title: "Matching policy", type: "document",
  description: "Trusted editorial policy. Changing weights or thresholds makes existing placement evaluations stale.",
  fields: [
    idField, str("title"), text("description"),
    defineField({name: "hostWeights", type: "object", fields: [weight("energy"), weight("company"), weight("interests"), weight("quietHours")]}),
    defineField({name: "pairWeights", type: "object", fields: [weight("complementarity"), weight("sharedInterests"), weight("presence"), weight("relationship")]}),
    weight("minimumHostScore"), weight("minimumPairScore"), weight("minimumOverallScore"),
  ],
  preview: {select: {title: "title", subtitle: "description"}},
});

const placement = defineType({
  name: "hearthPlacement", title: "Placement", type: "document", readOnly: true, description: managed,
  fields: protectedFields([
    idField, defineField({name:"spiritIds",type:"array",of:[defineArrayMember({type:"string"})],validation:Rule=>Rule.required().min(2).max(12).unique(),description:"At least two departed residents. No resident is placed alone."}), refs("spiritRefs", ["hearthSpirit"], "Companions"),
    defineField({name: "homeRef", title: "Fictional household", type: "reference", to: [{type: "hearthHome"}]}),
    snapshot("home", "Anonymous household preferences"), strings("acceptedClauseIds"), snapshot("evaluation", "Compatibility evidence"),
    list("status", Object.keys(PLACEMENT_STATUS_LABELS)), snapshot("consents", "Resident, household, guardian and assent decisions"),
    snapshot("trialPlan", "Trial plan"), snapshot("relocationPlan", "Relocation plan"),
    defineField({name: "answers", title: "Introduction answers", type: "array", of: [defineArrayMember({type: "object", fields: [
      str("questionId"), str("spiritId"), list("answer", ["yes", "no", "unknown"]), text("note"),
      defineField({name: "at", type: "datetime"}), str("sourceFingerprint"),
    ], preview: {select: {title: "questionId", subtitle: "answer"}}})]}),
    defineField({name: "trialReadiness", title: "Application readiness check", type: "object",
      description: "Advisory snapshot computed by the placement API. Starting a trial rechecks current source records and every required answer.",
      fields: [defineField({name: "ready", type: "boolean"}), str("sourceFingerprint")],
    }),
    defineField({name: "createdAt", type: "datetime"}), defineField({name: "updatedAt", type: "datetime"}), text("note"),
  ]),
  preview: {
    select: {id: "id", status: "status", names: "spiritIds"},
    prepare({id, status, names}) {
      return {title: id || "Placement", subtitle: [PLACEMENT_STATUS_LABELS[status as keyof typeof PLACEMENT_STATUS_LABELS] || status, Array.isArray(names) ? names.join(" + ") : ""].filter(Boolean).join(" · ")};
    },
  },
  orderings: [{title: "Recently updated", name: "updated", by: [{field: "updatedAt", direction: "desc"}]}],
});
const event = defineType({
  name: "hearthPlacementEvent", title: "Placement event", type: "document", readOnly: true, description: managed,
  fields: protectedFields([
    idField, str("placementId"),
    defineField({name: "placementRef", title: "Placement", type: "reference", to: [{type: "hearthPlacement"}]}),
    str("action"), list("fromStatus", Object.keys(PLACEMENT_STATUS_LABELS)), list("toStatus", Object.keys(PLACEMENT_STATUS_LABELS)),
    str("actor"), defineField({name: "at", type: "datetime"}), text("note"), str("requestId"), text("requestPayload"), str("expectedRev"),
    defineField({name: "nativeApproval", title: "Native readiness approval", type: "object", fields: [str("instanceId"), str("instanceRevision"), str("reviewedRevision"), str("actorId")]}),
  ]),
  preview: {select: {title: "action", subtitle: "placementId"}},
  orderings: [{title: "Latest events", name: "latest", by: [{field: "at", direction: "desc"}]}],
});

const artwork = defineType({
  name: "hearthArtwork", title: "Site artwork", type: "document",
  description: "The seeded artwork singleton for the public fictional site. Existing dataset administrators can edit these images.",
  fields: [
    defineField({name: "id", title: "Stable artwork ID", type: "string", readOnly: true, description: "Set by the seed; keep this identifier unchanged."}),
    str("title", "Title"),
    defineField({name: "hero", title: "Hero scene", type: "image", description: "Original artwork for the public introduction."}),
    defineField({name: "overlap", title: "Companion overlap illustration", type: "image"}),
    defineField({name: "portraitAtlas", title: "Spirit portrait atlas", type: "image", description: "Keep the complete portrait grid intact; the public profiles select their portrait from this atlas."}),
  ],
  preview: {select: {title: "title", media: "hero"}, prepare({title, media}) {return {title: title || "Site artwork", media};}},
});

export const singletonDocumentTypes = new Set(["hearthArtwork"]);
export const protectedDocumentTypes = new Set(["hearthPlacement", "hearthPlacementEvent"]);
export const schemaTypes = [spirit, home, history, trait, boundary, pairRelationship, matchingPolicy, placement, event, artwork];

export const recordDocumentTypes = new Set<string>(schemaTypes.map((type) => type.name));
