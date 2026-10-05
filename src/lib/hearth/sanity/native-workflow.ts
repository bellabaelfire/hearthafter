import type {SanityClient} from "@sanity/client";
import {hearthDocumentId} from "./config";
import {createEngine, instancesQuery, refDataset, resolveFieldEntry} from "@sanity/workflow-engine";
import {defineAction, defineActivity, defineField, defineStage, defineTransition, defineWorkflow} from "@sanity/workflow-engine/define";

export const HEARTH_WORKFLOW_NAME = "placement-readiness";
export const HEARTH_WORKFLOW_TAG = "production";
export const HEARTH_PLACEMENT_TYPE = "hearthPlacement";
export const hearthPlacementDocumentId = (id: string) => hearthDocumentId(HEARTH_PLACEMENT_TYPE, id);

const human = '$actor.kind == "person"';
const readyForApproval = [
  human,
  '$fields.subject.status == "review"',
  '$fields.subject._rev == $fields.reviewedRevision',
  '$fields.subject.evaluation.status == "eligible"',
  '$fields.subject.consents.household.decision == "granted"',
  'count(array::unique($fields.subject.spiritIds)) >= 2',
  '$fields.subject.trialReadiness.ready == true',
  'defined($fields.subject.trialReadiness.sourceFingerprint)',
  '$fields.subject.trialReadiness.sourceFingerprint == $fields.subject.evaluation.sourceSnapshot.fingerprint',
  'defined($fields.subject.trialPlan)',
  'defined($fields.subject.relocationPlan)',
].join(" && ");

/**
 * Native Sanity Workflows review evidence. Guards and actor predicates are
 * advisory in early access; the application API independently enforces consent,
 * matching, introduction answers, authentication, source freshness, and placement transitions.
 * trialReadiness is a derived advisory snapshot, never server authorization.
 */
export const placementReadinessWorkflow = defineWorkflow({
  name: HEARTH_WORKFLOW_NAME,
  title: "Placement readiness",
  description: "A human reviews consent, compatibility, introduction answers, a trial stay and a return plan for a fictional household.",
  initialStage: "preparation",
  fields: [
    defineField({type: "subject", name: "subject", title: "Placement", types: [HEARTH_PLACEMENT_TYPE], required: true, initialValue: {type: "input"}}),
    defineField({type: "string", name: "reviewedRevision", title: "Submitted placement revision"}),
    defineField({type: "actor", name: "submittedBy", title: "Submitted by"}),
    defineField({type: "actor", name: "approval", title: "Human approval"}),
    defineField({type: "string", name: "decision", title: "Decision"}),
    defineField({type: "string", name: "changesReason", title: "Requested changes"}),
  ],
  start: {
    requirements: [{type: "singleSubject", name: "one-open-readiness-review", title: "This placement already has an open readiness review"}],
  },
  stages: [
    defineStage({
      name: "preparation",
      title: "Prepare the stay",
      description: "Collect every resident and household decision, with guardian agreement and child assent where required, answer required introduction questions, and complete the trial and relocation plans in the placement desk.",
      activities: [
        defineActivity({
          name: "prepare",
          title: "Submit the current placement",
          actions: [
            defineAction({
              name: "submit",
              title: "Submit for human review",
              filter: human,
              params: [{type: "string", name: "revision", title: "Current placement revision", required: true}],
              status: "done",
              ops: [
                {type: "field.set", target: {field: "reviewedRevision"}, value: {type: "param", param: "revision"}},
                {type: "field.set", target: {field: "submittedBy"}, value: {type: "actor"}},
                {type: "field.set", target: {field: "decision"}, value: {type: "literal", value: "review"}},
                {type: "field.unset", target: {field: "approval"}},
                {type: "field.unset", target: {field: "changesReason"}},
              ],
            }),
          ],
        }),
      ],
      transitions: [defineTransition({name: "to-review", title: "Ready for a reviewer", to: "review"})],
    }),
    defineStage({
      name: "review",
      title: "Human readiness review",
      description: "Approve only the submitted revision after all parties consent and the current introduction answers and care plans are ready.",
      guards: [{name: "hold-publication-during-review", match: {idRefs: [{type: "fieldRead", field: "subject"}], actions: ["publish"]}}],
      activities: [
        defineActivity({
          name: "care-review",
          title: "Review the proposed stay",
          actions: [
            defineAction({
              name: "approve",
              title: "Approve this revision",
              filter: readyForApproval,
              status: "done",
              ops: [
                {type: "field.set", target: {field: "approval"}, value: {type: "actor"}},
                {type: "field.set", target: {field: "decision"}, value: {type: "literal", value: "approved"}},
              ],
            }),
            defineAction({
              name: "request-changes",
              title: "Request changes",
              filter: human,
              params: [{type: "string", name: "reason", title: "Care or consent changes needed", required: true}],
              status: "done",
              ops: [
                {type: "field.set", target: {field: "changesReason"}, value: {type: "param", param: "reason"}},
                {type: "field.set", target: {field: "decision"}, value: {type: "literal", value: "changes-requested"}},
              ],
            }),
          ],
        }),
      ],
      transitions: [
        defineTransition({name: "approved", title: "Readiness approved", to: "approved", when: '$fields.decision == "approved"'}),
        defineTransition({name: "revise", title: "Return for changes", to: "preparation", when: '$fields.decision == "changes-requested"'}),
      ],
    }),
    defineStage({
      name: "approved",
      title: "Readiness approved",
      description: "This revision has human sign-off. Starting the trial remains a separately authorized placement action.",
    }),
  ],
});

export function createHearthWorkflowEngine(client: SanityClient, resource: {projectId: string; dataset: string}) {
  return createEngine({
    client: client.withConfig({projectId: resource.projectId, dataset: resource.dataset, useCdn: false}),
    workflowResource: {type: "dataset", id: `${resource.projectId}.${resource.dataset}`},
    tag: HEARTH_WORKFLOW_TAG,
  });
}

export class NativePlacementApprovalError extends Error {
  readonly code = "NATIVE_APPROVAL_REQUIRED";
  readonly status = 409;
  constructor(message = "The latest native readiness review must approve this exact placement revision.") {
    super(message);
    this.name = "NativePlacementApprovalError";
  }
}

export interface NativePlacementApproval {
  instanceId: string;
  instanceRevision: string;
  reviewedRevision: string;
  actorId: string;
}

/**
 * Read-only additional gate for the server's trial transition. The caller must
 * still independently authorize its operator, validate current source records
 * and consent/plans, and atomically compare the placement revision on commit.
 * Native history remains editable by privileged dataset writers.
 */
export async function assertNativePlacementApproval(
  client: SanityClient,
  placementId: string,
  placementRevision: string,
): Promise<NativePlacementApproval> {
  const {projectId, dataset} = client.config();
  if (!projectId || !dataset) throw new NativePlacementApprovalError("Native review requires a configured Sanity dataset.");
  const subject = refDataset({projectId, dataset, documentId: hearthPlacementDocumentId(placementId), type: HEARTH_PLACEMENT_TYPE});
  const query = instancesQuery({
    tag: HEARTH_WORKFLOW_TAG,
    filter: {document: subject.id, definition: HEARTH_WORKFLOW_NAME, includeCompleted: true, limit: 1},
  });
  const rows = await client.withConfig({useCdn: false, perspective: "raw"}).fetch<unknown[]>(query.query, query.params);
  const candidate = Array.isArray(rows) ? rows[0] : undefined;
  if (!candidate || typeof candidate !== "object" || !("_id" in candidate) || typeof candidate._id !== "string") {
    throw new NativePlacementApprovalError("Start and complete a native placement-readiness review before starting a trial.");
  }

  const engine = createHearthWorkflowEngine(client, {projectId, dataset});
  const instance = await engine.getInstance({instanceId: candidate._id});
  const field = (name: string) => resolveFieldEntry(instance, {scope: "workflow", name})?.value;
  const subjectValue = field("subject");
  const approval = field("approval");
  const isSubject = subjectValue !== null && typeof subjectValue === "object" && "id" in subjectValue && "type" in subjectValue
    && subjectValue.id === subject.id && subjectValue.type === HEARTH_PLACEMENT_TYPE;
  const isHuman = approval !== null && typeof approval === "object" && "kind" in approval && "id" in approval
    && approval.kind === "person" && typeof approval.id === "string" && approval.id.length > 0;
  if (!isSubject || !isHuman || instance.definition !== HEARTH_WORKFLOW_NAME
    || instance.tag !== HEARTH_WORKFLOW_TAG || instance.currentStage !== "approved"
    || !instance.completedAt || instance.abortedAt || field("decision") !== "approved"
    || field("reviewedRevision") !== placementRevision) {
    throw new NativePlacementApprovalError();
  }
  return {instanceId: instance._id, instanceRevision: instance._rev, reviewedRevision: placementRevision, actorId: approval.id as string};
}
