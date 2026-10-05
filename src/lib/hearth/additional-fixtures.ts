import type { HearthState, Spirit } from "./domain";

/** An additive, wholly fictional family and two synthetic living households. */
export const ASTER_FAMILY_IDS = ["spirit_mara_aster", "spirit_leon_aster", "spirit_kit_aster"] as const;
export const ADDITIONAL_HOME_IDS = ["household_robin_esme", "household_lantern_students"] as const;
export type AdditionalFixtures = Pick<HearthState, "spirits" | "homes" | "histories" | "traits" | "boundaries" | "pairRelationships">;
const revision = (id: string) => `hearthafter-additional-1-${id}`;
const familyBoundaries = ["boundary_aster_private_retreat", "boundary_aster_camera_free", "boundary_aster_quiet_plan", "boundary_aster_own_choices", "boundary_aster_two_evenings"];
const familyInterests: Record<string, string[]> = {
  spirit_mara_aster: ["maps", "stories", "books"],
  spirit_leon_aster: ["cooking", "stories", "craft"],
  spirit_kit_aster: ["maps", "craft", "stories"],
};
const sharedProfile: Pick<Spirit, "presence" | "boundaryIds" | "petCompatibility" | "quietHoursFlexibility" | "spiritConsent" | "negotiablePreferences"> = {
  presence: "day", boundaryIds: familyBoundaries,
  petCompatibility: { cats: null, dogs: null, other: null }, quietHoursFlexibility: "can-adjust",
  // Willingness to have an introduction only. Every placement decision starts pending.
  spiritConsent: "yes",
  negotiablePreferences: [{ id: "aster_evening_invitation", preference: "Two ordinary early evenings together each week.", possibleAgreement: "Choose two sustainable early-evening invitations; anyone may decline on the day without losing their place." }],
};
const additions: AdditionalFixtures = {
  spirits: [
    {
      ...sharedProfile, id: "spirit_mara_aster", rev: revision("spirit_mara_aster"), name: "Mara Aster", pronouns: "she/her", ageAtPassing: 38, requiredCompanionIds: ["spirit_leon_aster", "spirit_kit_aster"],
      era: "1977–2015", lifespan: "1977–2015", origin: "Bellwether, a fictional riverside town", formerOccupation: "Public-library access coordinator", portrait: "scholar",
      tagline: "A plan with room to change it", quote: "The point of a timetable is to leave enough afternoon for something unplanned.",
      tags: ["Aster family of three", "Kit’s documented guardian", "Early-evening company"],
      summary: "A thoughtful organiser who likes bus maps, short mysteries and an afternoon that occasionally escapes the plan. Mara is applying with her partner Leon and their nine-year-old child Kit.",
      biography: "Mara coordinated the home-delivery shelf at Bellwether’s public library. She knew which readers wanted a recommendation and which only wanted their books delivered without a conversation. She also organised the town’s first large-print bus leaflet, then spent a wet Saturday admitting that her own connecting route did not work.\n\nAt home she and Leon shared the ordinary work of raising Kit: lunch boxes, unfinished projects and the negotiation over one more page. Mara kept a paper calendar because its empty squares looked reassuring. Leon kept adding small occasions to it. They were partners in life and have chosen to apply together after the Overlap. Their biographies record their lives rather than asking visitors to revisit the circumstances of their deaths.\n\nMara is Kit’s documented departed guardian. She and Leon want a care plan that preserves their family relationship while respecting the living household’s separate responsibilities. She wants to learn the current library catalogue on a borrowed tablet, with notifications off and nobody photographing the lesson. She is interested in a first conversation; she has not consented to a placement.",
      identityHistory: ["Mara uses her own stated name and pronouns. Her role as Kit’s guardian does not make her the household’s carer or administrator."],
      rememberedObjects: ["A blue library-date stamp, kept as a memory rather than a tool anyone must acquire.", "A paper bus map with one carefully corrected connection."],
      quirks: ["Leaves an empty square on every weekly plan for something that has not occurred to her yet.", "Wants to learn a tablet’s back button before opening anything interesting."],
      contradictions: ["Enjoys a clear plan and is secretly delighted when a good invitation changes it."],
      currentWants: ["An early evening of parallel reading, with permission to put the book down.", "A slow introduction to a current library catalogue; teaching or clerical work is never rent.", "Kit’s views heard directly, without asking the child to take responsibility for adult feelings.", "A confirmed interim welcome where Kit can remain with their guardian if a trial ends."],
      historyIds: ["history_mara_aster"], traitIds: ["trait_aster_patient_structure"],
      affinityFacts: [
        { id: "fact_mara_routine", label: "A modern routine to learn", detail: "Mara would like a short, unrecorded lesson in the library’s tablet catalogue, followed by tea and separate reading.", sourceRefs: ["spirit:spirit_mara_aster", "history:history_mara_aster"] },
        { id: "fact_mara_guardian", label: "Kit’s documented guardian", detail: "Mara continues as Kit’s guardian; her own placement consent, her care agreement for Kit and Kit’s age-appropriate assent are separate decisions.", sourceRefs: ["spirit:spirit_mara_aster", "spirit:spirit_kit_aster", "history:history_mara_aster"] },
      ],
      energy: "quiet", company: "medium", interests: familyInterests.spirit_mara_aster,
      audibleHours: { start: 17, end: 20 }, preferredHours: [{ start: 15, end: 17 }, { start: 18, end: 20 }],
      homeNeeds: ["A protected family retreat and separate opportunities for each person to ask for quiet.", "A written quiet plan, no recording, and two sustainable early-evening invitations.", "A named coordinator to review care and the confirmed family exit together."],
      introductionQuestions: [
        { id: "question_mara_guardian_plan", question: "Have Mara, Leon and the coordinator agreed who provides Kit’s continuing care, the private retreat and an exit that keeps Kit with their guardian?", whyItMatters: "The living household does not acquire childcare duties by offering a home, and Mara’s own welcome is a separate decision from guardian care agreement.", requiredForTrial: true, sourceRefs: ["spirit:spirit_mara_aster", "spirit:spirit_leon_aster", "spirit:spirit_kit_aster"] },
      ],
    },
    {
      ...sharedProfile, id: "spirit_leon_aster", rev: revision("spirit_leon_aster"), name: "Leon Aster", pronouns: "he/him", ageAtPassing: 41, requiredCompanionIds: ["spirit_mara_aster", "spirit_kit_aster"],
      era: "1974–2015", lifespan: "1974–2015", origin: "Bellwether, a fictional riverside town", formerOccupation: "Community-centre kitchen coordinator", portrait: "artist",
      tagline: "There is usually another way", quote: "A recipe can be a suggestion. A promise needs a little more care.",
      tags: ["Aster family of three", "Small kitchen experiments", "Company without duties"],
      summary: "Leon likes a shared table, cardboard engineering and recipes with pencilled amendments. He and Mara are partners and Kit’s parents; he wants room to be a guest as well as a parent.",
      biography: "Leon coordinated the kitchen at Bellwether’s community centre, where his greatest professional achievement was an inventory that other people actually used. He enjoyed cooking but disliked being introduced as the person who would certainly feed everyone. His favourite events were the ones where he could take his coat off and sit down before being helpful.\n\nAt home, Leon and Kit built cardboard versions of the town. Their model bus station had a roof that opened to become a cinema. Mara contributed accurate route numbers; Leon contributed a park where the real town had a car park. He and Mara sometimes disagreed about when an experiment should stop taking up the table. They practised returning to that discussion after everyone had eaten.\n\nSince the Overlap, Leon has become curious about induction hobs and captioned recipe videos. He would enjoy learning beside someone without being expected to cook for them. He applies with Mara and Kit, recognising Mara’s documented guardian role and his own continuing responsibilities in their agreed family care plan. He has agreed to introductions only; the next household has not been chosen.",
      identityHistory: ["Leon calls Mara his partner and Kit his child. Neither relationship authorises other people to speak for his own placement decision."],
      rememberedObjects: ["A wooden recipe box with an index card labelled TRY LESS CUMIN.", "The cardboard cinema’s removable roof; a new piece of card would do just as well."],
      quirks: ["Reads the comments beneath a recipe only after trying the recipe.", "Makes excellent tiny cardboard chairs and rather unconvincing tiny people."],
      contradictions: ["Improvises freely with supper but writes down every promise about being home."],
      currentWants: ["To learn how an induction hob signals heat, from a comfortable agreed distance.", "Occasional captioned recipe videos with the autoplay switched off.", "A family supper invitation that does not make him the cook.", "An ordinary private way for each person to say that the arrangement is not working."],
      historyIds: ["history_leon_aster"], traitIds: ["trait_aster_resourceful_play"],
      affinityFacts: [
        { id: "fact_leon_routine", label: "An unhurried table", detail: "Leon likes early-evening kitchen conversation and making things from saved cardboard; invitations carry no obligation to provide meals or entertainment.", sourceRefs: ["spirit:spirit_leon_aster", "history:history_leon_aster", "boundary:boundary_aster_own_choices"] },
        { id: "fact_leon_family", label: "A family applying together", detail: "Leon, Mara and Kit have a shared history but retain individual preferences, separate conversations and the right to refuse.", sourceRefs: ["relationship:relationship_aster_parents", "relationship:relationship_aster_leon_kit"] },
      ],
      energy: "balanced", company: "medium", interests: familyInterests.spirit_leon_aster,
      audibleHours: { start: 17, end: 20.5 }, preferredHours: [{ start: 17, end: 20.5 }],
      homeNeeds: ["A real private retreat, a camera-free common room and predictable quiet hours.", "Two possible early evenings together, with ordinary family care discussed separately from hosting."],
      introductionQuestions: [
        { id: "question_leon_no_service", question: "Has everyone agreed that Leon’s kitchen knowledge is an optional shared interest, and that the living household and departed parents retain their own care responsibilities?", whyItMatters: "A meal invitation must not become unpaid cooking, supervision or emotional care as a condition of welcome.", requiredForTrial: true, sourceRefs: ["spirit:spirit_leon_aster", "boundary:boundary_aster_own_choices"] },
      ],
    },
    {
      ...sharedProfile, id: "spirit_kit_aster", rev: revision("spirit_kit_aster"), name: "Kit Aster", pronouns: "they/them", ageAtPassing: 9,
      guardianSpiritId: "spirit_mara_aster", assentRequired: true, requiredCompanionIds: ["spirit_mara_aster", "spirit_leon_aster"],
      era: "2006–2015", lifespan: "2006–2015", origin: "Bellwether, a fictional riverside town", formerOccupation: "Primary-school pupil and enthusiastic model-town maker", portrait: "child",
      tagline: "The map needs a secret park", quote: "You can look at it. You don’t have to say it’s finished.",
      tags: ["Aster family of three", "Age 9 · guardian and assent", "Cardboard worlds"],
      summary: "Kit is nine, curious about maps and determined that every model town needs somewhere to play. They are applying with their parents, Mara and Leon, and can say no at any point.",
      biography: "Kit liked the Bellwether library’s map drawer because it was large enough to require both hands. Their own maps included quiet places behind the obvious ones: a park under the bus station and a small bridge that went nowhere until someone needed it. They enjoyed making things with Leon and choosing books with Mara, but did not want every finished thing displayed to visitors.\n\nKit remains a dependent child after the Overlap. Mara is their documented guardian, with Leon participating in the agreed family care plan. Kit is interested in meeting a household together, not in being sent to a home alone or becoming a companion assigned to a living child. They would like to try a simple, offline drawing app with a parent present. The camera and microphone remain switched off.\n\nThe first meeting should be short, with Kit able to show a drawing or say nothing. An age-appropriate conversation with the coordinator, access to their guardian and a practised stop signal must precede any trial. Their willingness to meet is not placement assent, and a guardian’s agreement cannot overrule their refusal.",
      identityHistory: ["Kit uses they/them. A child’s stated name and pronouns are respected without requiring a performance or an explanation."],
      rememberedObjects: ["A folded map with a secret park beneath the bus station.", "A green pencil worn flat on one side; drawing supplies are welcome, never a condition of arrival."],
      quirks: ["Builds bus shelters before houses because people should not have to wait in the rain.", "Likes the sound of a printer finishing but wants to know before it starts."],
      contradictions: ["Loves telling a long story and sometimes prefers to show it without answering questions."],
      currentWants: ["To make a flipbook animation of an imagined town in a drawing app with a parent; no camera or microphone.", "A protected shelf where an unfinished model may stay unfinished.", "Short invitations with the option to leave, and a STOP card that works without an explanation.", "To be asked directly whether a meeting feels comfortable, without having to protect adults from disappointment."],
      historyIds: ["history_kit_aster"], traitIds: ["trait_aster_open_curiosity"],
      affinityFacts: [
        { id: "fact_kit_play", label: "An ordinary afternoon", detail: "Maps, folded card and an optional shared story are a promising invitation. Kit’s work is not an exhibition and Kit is not responsible for entertaining another child.", sourceRefs: ["spirit:spirit_kit_aster", "history:history_kit_aster", "boundary:boundary_aster_own_choices"] },
        { id: "fact_kit_assent", label: "A child’s own answer", detail: "Kit’s age-appropriate assent is required separately from Mara’s guardian care agreement. Refusal stops the proposed stay; the family needs a confirmed safe exit together.", sourceRefs: ["spirit:spirit_kit_aster", "spirit:spirit_mara_aster"] },
      ],
      energy: "lively", company: "high", interests: familyInterests.spirit_kit_aster,
      audibleHours: { start: 16, end: 19 }, preferredHours: [{ start: 16, end: 19 }],
      homeNeeds: ["A documented guardian in the same placement and a reviewed, age-appropriate care plan.", "A private family retreat, an unrecorded presence area and predictable quiet hours.", "No expectation of friendship, supervision or performance for the household’s children or guests."],
      introductionQuestions: [
        { id: "question_kit_assent_and_stop", question: "Has Kit had a short, age-appropriate conversation with access to Mara, tried their STOP signal, and freely said that they want to try this particular home?", whyItMatters: "Kit’s own assent cannot be supplied by a parent, inferred from quietness or exchanged for a high match score.", requiredForTrial: true, sourceRefs: ["spirit:spirit_kit_aster", "spirit:spirit_mara_aster"] },
      ],
    },
  ],
  homes: [
    {
      id: "household_robin_esme", rev: revision("household_robin_esme"), name: "Robin & Esme’s small-garden house", subtitle: "One adult, one child, room for a family",
      summary: "A fictional single-parent household with an eleven-year-old, a quiet back room and space for up to three departed residents.",
      story: "Robin lives with eleven-year-old Esme in a modest house near the library. There are school mornings, a shared evening meal and weekends when the model railway stays out on the table. Robin is the sole living adult and remains responsible for Esme’s care. Esme’s comfort is discussed directly, with no expectation that a departed child become a friend on demand. The household offers up to three departed places, a separate quiet family room and time for two or three early-evening invitations. The Aster family is one possible introduction, subject to everyone’s own decisions and the coordinator’s care review.",
      features: ["Single adult and an eleven-year-old", "Up to three departed residents", "Separate quiet family room", "Small open-air garden", "No recording in presence areas"],
      preferences: { templateId: "household_robin_esme", departedCapacity: 3, householdConsent: "yes", pets: "none", quietHours: { start: 21, end: 7 }, privateRetreat: true, stepFreeAccess: true, hasGarden: true, activityPreference: "balanced", companyPreference: "medium", nightPresence: "welcome", relocationWillingness: "yes", welcomedInterests: ["maps", "books", "stories", "craft", "cooking"], recordingPolicy: "none", sharedEvenings: 3, respectBoundaries: "yes" },
      introductionQuestions: [
        { id: "question_robin_esme_living_child", question: "Have Robin and the coordinator heard Esme’s own comfort and concerns, agreed privacy and a stop signal, and confirmed that friendship with any departed child is optional?", whyItMatters: "The sole living adult’s agreement does not speak for the child’s experience. Neither family provides childcare or companionship as payment for the welcome.", requiredForTrial: true, sourceRefs: ["home:household_robin_esme"] },
        { id: "question_robin_esme_retreat", question: "Has everyone seen the retreat and agreed who may enter, how the two families keep their own care responsibilities, and how either can end a meeting?", whyItMatters: "A quiet room and clear responsibilities need to work in practice before any trial.", requiredForTrial: true, sourceRefs: ["home:household_robin_esme", "boundary:boundary_aster_private_retreat"] },
      ],
    },
    {
      id: "household_lantern_students", rev: revision("household_lantern_students"), name: "The Lantern House student share", subtitle: "Four adult students, a settled shared home",
      summary: "Four fictional adult students with different timetables, a spare retreat and an agreed welcome for up to three departed residents.",
      story: "Amal, Bea, Finn and Jo are adult students sharing a year-round house. Their fridge calendar includes shifts, exams, film nights and the evenings when nobody wants to talk. They have agreed space for up to three departed residents and a quiet room that will stay a retreat rather than become a study annex. A daytime craft table and three modest early-evening invitations offer ordinary company. Every roommate agrees to the proposal in principle; a trial still needs individual conversations, a named coordinator and coverage through holidays. If a departed child joins with their guardian, the parents retain care responsibilities and the students are not substitute carers.",
      features: ["Four adult student roommates", "Up to three departed residents", "Year-round occupancy plan", "Protected retreat and step-free common room", "Film nights with recording switched off"],
      preferences: { templateId: "household_lantern_students", departedCapacity: 3, householdConsent: "yes", pets: "none", quietHours: { start: 22, end: 7 }, privateRetreat: true, stepFreeAccess: true, hasGarden: true, activityPreference: "balanced", companyPreference: "medium", nightPresence: "welcome", relocationWillingness: "yes", welcomedInterests: ["books", "tea", "films", "stories", "craft", "maps", "cooking"], recordingPolicy: "none", sharedEvenings: 3, respectBoundaries: "yes" },
      introductionQuestions: [
        { id: "question_lantern_students_all_residents", question: "Has each of the four adult roommates freely agreed to the particular group, the protected retreat, guest rules and the camera-free presence areas?", whyItMatters: "One roommate cannot speak for everyone; a shared lease is not collective permission for a stay.", requiredForTrial: true, sourceRefs: ["home:household_lantern_students"] },
        { id: "question_lantern_students_holidays", question: "Have the household and coordinator confirmed exam and holiday routines, continuing occupancy, care responsibilities if relevant, and an accepted interim destination?", whyItMatters: "A promising term-time routine does not establish continuity through absences, and the students are not being recruited as carers.", requiredForTrial: true, sourceRefs: ["home:household_lantern_students"] },
      ],
    },
  ],
  histories: [
    { id: "history_mara_aster", rev: revision("history_mara_aster"), title: "Mara’s library calendar", era: "1977–2015", summary: "A fictional life in public access work, parenthood and learning to leave room in the plan.", events: [{ date: "2001", title: "The delivery shelf", detail: "Mara joined Bellwether’s library and listened before deciding what a home delivery service should offer." }, { date: "2006", title: "Kit arrives", detail: "Mara and Leon became parents, sharing care and discovering that a timetable could contain a surprise." }, { date: "After the Overlap", title: "A family application", detail: "Mara’s guardian relationship with Kit was documented; introductions and placement decisions remain separate." }], sourceNote: "Original fictional example written for Hearthafter; Bellwether and this family are invented, not archival or genealogical records." },
    { id: "history_leon_aster", rev: revision("history_leon_aster"), title: "Leon’s useful recipe box", era: "1974–2015", summary: "A fictional community-centre worker and parent who enjoys making things without always being on duty.", events: [{ date: "1999", title: "A table for everyone", detail: "Leon helped the community centre organise accessible suppers, including clear invitations for people who preferred quiet company." }, { date: "2013", title: "The cardboard cinema", detail: "He and Kit gave their model bus station a removable cinema roof. Mara supplied route numbers and a place to store it." }, { date: "After the Overlap", title: "A place to sit down", detail: "Leon applied with Mara and Kit while making clear that cooking and entertaining were optional interests." }], sourceNote: "Original fictional example written for Hearthafter; no real person, institution or family history is represented." },
    { id: "history_kit_aster", rev: revision("history_kit_aster"), title: "Kit’s town with a secret park", era: "2006–2015", summary: "A fictional nine-year-old’s maps, unfinished models and continuing family relationships.", events: [{ date: "2012", title: "A drawer of maps", detail: "Kit discovered the library map drawer and began drawing places where people could stop and rest." }, { date: "2014", title: "A model can stay unfinished", detail: "Their family made a protected shelf for the cardboard town, without turning each visit into a presentation." }, { date: "After the Overlap", title: "A say in the welcome", detail: "Kit asked to meet a household with their parents. Mara’s guardian care agreement and Kit’s age-appropriate assent remain required before any trial." }], sourceNote: "Original fictional child and family. This record supplies story context, not evidence about a real child or a substitute for a reviewed care plan." },
  ],
  traits: [
    { id: "trait_aster_patient_structure", rev: revision("trait_aster_patient_structure"), label: "Patient structure", description: "Mara offers a clear plan and allows other people time to change their minds.", complements: ["trait_aster_resourceful_play"] },
    { id: "trait_aster_resourceful_play", rev: revision("trait_aster_resourceful_play"), label: "Resourceful play", description: "Leon can turn a small practical setback into an optional experiment without making anyone join in.", complements: ["trait_aster_patient_structure", "trait_aster_open_curiosity"] },
    { id: "trait_aster_open_curiosity", rev: revision("trait_aster_open_curiosity"), label: "Open curiosity", description: "Kit explores possibilities through stories and models, with time to answer and freedom to stop.", complements: ["trait_aster_resourceful_play"] },
  ],
  boundaries: [
    { id: "boundary_aster_private_retreat", rev: revision("boundary_aster_private_retreat"), label: "A protected family retreat", description: "A real private retreat must be available before a trial, with entry agreed and each resident free to ask for quiet.", kind: "hard", rule: "private-retreat" },
    { id: "boundary_aster_camera_free", rev: revision("boundary_aster_camera_free"), label: "An unrecorded welcome", description: "No cameras, audio recordings, streams or demonstrations in agreed presence areas; a craft activity does not permit recording a spirit.", kind: "hard", rule: "camera-free" },
    { id: "boundary_aster_quiet_plan", rev: revision("boundary_aster_quiet_plan"), label: "Predictable quiet hours", description: "Record a daily quiet window and agree how changes, visitors and noisy devices will be communicated in advance.", kind: "hard", rule: "defined-quiet-hours" },
    { id: "boundary_aster_own_choices", rev: revision("boundary_aster_own_choices"), label: "Care and company without obligations", description: "Respect each person’s stated identity and refusal. No unpaid work, assigned friendships, substitute-parent roles, childcare for the living household or performances are conditions of welcome. Guardian care and child assent require their own reviewed agreement.", kind: "hard", rule: "respect-boundaries" },
    { id: "boundary_aster_two_evenings", rev: revision("boundary_aster_two_evenings"), label: "Two sustainable early-evening invitations", description: "Offer at least two ordinary early-evening gatherings a week, with the freedom to decline on the day.", kind: "hard", rule: "shared-evenings", minimum: 2 },
  ],
  pairRelationships: [
    { id: "relationship_aster_parents", rev: revision("relationship_aster_parents"), spiritIds: ["spirit_mara_aster", "spirit_leon_aster"], status: "friendly", title: "A plan, with room for an experiment", description: "Mara and Leon are partners and Kit’s parents. They share stories and the work of parenting, while Mara prefers a clear timetable and Leon enjoys an optional detour. Both want separate invitations and individual placement decisions.", sourceRefs: ["history:history_mara_aster", "history:history_leon_aster", "trait:trait_aster_patient_structure", "trait:trait_aster_resourceful_play"] },
    { id: "relationship_aster_mara_kit", rev: revision("relationship_aster_mara_kit"), spiritIds: ["spirit_mara_aster", "spirit_kit_aster"], status: "friendly", title: "The map drawer and a patient pause", description: "Mara is Kit’s documented guardian. They share maps and stories, although Kit’s lively curiosity and Mara’s measured pace need space alongside each other. The relationship does not substitute for Kit’s assent or a reviewed continuing-care plan.", sourceRefs: ["history:history_mara_aster", "history:history_kit_aster", "spirit:spirit_mara_aster", "spirit:spirit_kit_aster"] },
    { id: "relationship_aster_leon_kit", rev: revision("relationship_aster_leon_kit"), spiritIds: ["spirit_leon_aster", "spirit_kit_aster"], status: "friendly", title: "An unfinished town is still a good afternoon", description: "Leon and Kit enjoy stories and making cardboard places together. Leon is Kit’s parent and participates in the family care plan with Mara, the documented guardian. Shared play is optional, and Kit may stop or choose quiet without explaining.", sourceRefs: ["history:history_leon_aster", "history:history_kit_aster", "spirit:spirit_mara_aster", "trait:trait_aster_resourceful_play", "trait:trait_aster_open_curiosity"] },
  ],
};

/** Clone so callers cannot alter the fixture catalog through a review or a test. */
export function createAdditionalFixtures(): AdditionalFixtures { return structuredClone(additions); }

/** Append only: the six original profiles and their existing source records retain their content. */
export function appendAdditionalFixtures(state: HearthState): HearthState {
  const extra = createAdditionalFixtures();
  for (const collection of Object.keys(extra) as (keyof AdditionalFixtures)[]) {
    const target = state[collection] as { id: string }[];
    for (const entry of extra[collection]) {
      if (target.some(existing => existing.id === entry.id)) throw new Error(`Duplicate fictional fixture: ${entry.id}`);
      target.push(entry);
    }
  }
  return state;
}
