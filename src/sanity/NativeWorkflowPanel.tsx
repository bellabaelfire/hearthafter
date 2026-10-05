"use client";

import {useClient} from "@sanity/sdk-react";
import {
  actionRendering,
  errorMessage,
  instanceDocId,
  refDataset,
  resolveFieldEntry,
  type ActionEvaluation,
  type Engine,
} from "@sanity/workflow-engine";
import {useWorkflowInstances, useWorkflowSession} from "@sanity/workflow-sdk";
import {useId, useMemo, useRef, useState} from "react";
import {HEARTH_API_VERSION} from "../lib/hearth/sanity/config";
import {
  createHearthWorkflowEngine,
  hearthPlacementDocumentId,
  HEARTH_WORKFLOW_NAME,
  HEARTH_WORKFLOW_TAG,
} from "../lib/hearth/sanity/native-workflow";

export interface NativeWorkflowPanelProps {
  placementId: string;
  revision: string;
  disabled?: boolean;
}

const CHANGE_REASONS = [
  {value: "consent-incomplete", label: "Consent needs attention"},
  {value: "introduction-incomplete", label: "Introduction answers need attention"},
  {value: "care-plan-incomplete", label: "Care or relocation plan needs attention"},
  {value: "compatibility-review", label: "Compatibility needs another review"},
  {value: "placement-changed", label: "Placement changed after submission"},
] as const;

function readableName(name: string) {
  return name.replace(/[-_]/g, " ").replace(/^./, (first) => first.toUpperCase());
}

function actionLabel(name: string, action: ActionEvaluation) {
  const labels: Record<string, string> = {
    "prepare.submit": "Send for care review",
    "care-review.approve": "Approve current plan",
    "care-review.request-changes": "Request changes",
  };
  return labels[name] ?? action.action.title ?? readableName(action.action.name);
}

function ReviewProblem({message, detail}: {message: string; detail: string}) {
  return <div><p role="alert">{message}</p><details><summary>Review record details</summary><p>{detail}</p></details></div>;
}

function blockedReason(action: ActionEvaluation): string | undefined {
  const reason = action.disabledReason;
  if (!reason) return undefined;
  switch (reason.kind) {
    case "requirements-unmet":
      return "Complete the information needed for this review.";
    case "filter-failed": return "This review is not ready for that action.";
    case "mutation-guard-denied": return "This record is on hold. Ask an administrator before making changes.";
    case "subject-permission-denied": return "Your account cannot make the required change.";
    case "instance-completed": return "This review is complete.";
    case "instance-aborted": return "This review was stopped.";
    case "stage-terminal": return "This review stage is complete.";
    case "activity-not-active": return "This review step is no longer open.";
    case "cascade-fired": return "This step runs automatically.";
  }
}

/** Render inside the authenticated SanityApp that owns this project and dataset. */
export function NativeWorkflowPanel(props: NativeWorkflowPanelProps) {
  const client = useClient({apiVersion: HEARTH_API_VERSION});
  const {projectId, dataset} = client.config();
  if (!projectId || !dataset || projectId === "unconfigured") {
    return <section className="native-workflow-panel"><h3>Care review</h3><p>Shared care reviews are not connected. Ask an administrator to finish setup.</p></section>;
  }
  return <ConnectedWorkflowPanel key={`${projectId}.${dataset}.${props.placementId}`} {...props} projectId={projectId} dataset={dataset}/>;
}

function ConnectedWorkflowPanel({placementId, revision, disabled = false, projectId, dataset}: NativeWorkflowPanelProps & {projectId: string; dataset: string}) {
  const client = useClient({apiVersion: HEARTH_API_VERSION});
  const engine = useMemo(() => createHearthWorkflowEngine(client, {projectId, dataset}), [client, projectId, dataset]);
  const subject = useMemo(() => refDataset({projectId, dataset, documentId: hearthPlacementDocumentId(placementId), type: "hearthPlacement"}), [projectId, dataset, placementId]);
  const list = useWorkflowInstances({engine, filter: {document: subject.id, definition: HEARTH_WORKFLOW_NAME, includeCompleted: true, limit: 10}});
  const [selectedId, setSelectedId] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [failure, setFailure] = useState<string>();
  const startId = useRef<string | undefined>(undefined);
  const startInProgress = useRef(false);
  const headingId = useId();
  const pickerId = useId();
  const instances = list.instances ?? [];
  const activeInstance = instances.find((instance) => !instance.completedAt);
  const instanceId = selectedId ?? activeInstance?._id ?? instances[0]?._id;
  const resumingStart = Boolean(startId.current && (!activeInstance || activeInstance._id === startId.current));
  const selectionSynced = !selectedId || instances.some((instance) => instance._id === selectedId);
  const canStart = !disabled && !starting && !list.loading && !list.error && list.unreadable.length === 0 && selectionSynced && (!activeInstance || resumingStart);

  async function startReview() {
    if (!canStart || startInProgress.current) return;
    startInProgress.current = true;
    setStarting(true);
    setFailure(undefined);
    // A retry resumes the same engine start, including an ambiguous network failure.
    startId.current ??= instanceDocId(HEARTH_WORKFLOW_TAG);
    try {
      const result = await engine.startInstance({
        definition: HEARTH_WORKFLOW_NAME,
        instanceId: startId.current,
        initialFields: [{type: "subject", name: "subject", value: subject}],
        perspective: "published",
      });
      setSelectedId(result.instance._id);
      startId.current = undefined;
    } catch (cause) {
      setFailure(errorMessage(cause));
    } finally {
      startInProgress.current = false;
      setStarting(false);
    }
  }

  return <section className="native-workflow-panel" aria-labelledby={headingId} aria-busy={starting}>
    <div className="eyebrow">SHARED STAFF REVIEW</div>
    <h3 id={headingId}>Care review</h3>
    <p>Review the proposed stay, confirm everyone is ready, and record staff approval.</p>
    {disabled ? <p className="small-note">You can view this review. An authorized staff member can make changes.</p> : null}
    {list.error ? <ReviewProblem message="Care reviews could not be loaded. Please try again." detail={errorMessage(list.error)}/> : null}
    {list.unreadable.length > 0 ? <p role="alert">{list.unreadable.length} care review record(s) could not be opened. Ask an administrator for help.</p> : null}
    {list.loading ? <p role="status">Loading shared reviews...</p> : null}
    {failure ? <ReviewProblem message="The care review could not be started. Please try again." detail={failure}/> : null}
    {instances.length > 1 ? <div className="native-workflow-picker">
      <label htmlFor={pickerId}>Review history (latest ten)</label>
      <select id={pickerId} value={instanceId ?? ""} disabled={starting} onChange={(event) => setSelectedId(event.target.value)}>
        {instances.map((instance) => <option key={instance._id} value={instance._id}>{readableName(instance.currentStage)} · {new Date(instance.startedAt).toLocaleString()}</option>)}
      </select>
    </div> : null}
    {instanceId ? <WorkflowDetail key={instanceId} engine={engine} instanceId={instanceId} revision={revision} disabled={disabled || starting || Boolean(list.error) || list.loading}/> : null}
    {!instanceId && !list.loading && !list.error && list.unreadable.length === 0 ? <p>No shared care review has been started for this placement.</p> : null}
    {!activeInstance || resumingStart ? <button className="button button-small" type="button" disabled={!canStart} onClick={() => void startReview()}>
      {starting ? "Starting review..." : startId.current ? "Retry starting review" : instances.length ? "Start a new review" : "Start care review"}
    </button> : null}
  </section>;
}

function WorkflowDetail({engine, instanceId, revision, disabled}: {engine: Engine; instanceId: string; revision: string; disabled: boolean}) {
  const session = useWorkflowSession({engine, instanceId});
  const [pending, setPending] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reason, setReason] = useState<string>(CHANGE_REASONS[0].value);
  const operationInProgress = useRef(false);
  const reasonId = useId();

  if (session.invalid) return <ReviewProblem message="This care review could not be opened. Ask an administrator for help." detail={session.invalid.reason}/>;
  if (session.error) return <ReviewProblem message="The care review could not be loaded. Please try again." detail={errorMessage(session.error)}/>;
  if (session.evaluationError) return <ReviewProblem message="The care review could not be checked. Please try again." detail={errorMessage(session.evaluationError)}/>;
  if (!session.ready || !session.evaluation) return <p role="status">Loading the current review stage...</p>;

  const evaluation = session.evaluation;
  const reviewedRevision = resolveFieldEntry(evaluation.instance, {scope: "workflow", name: "reviewedRevision"});
  const reviewedValue = reviewedRevision?._type === "string" ? reviewedRevision.value : undefined;
  const stale = Boolean(reviewedValue && reviewedValue !== revision);
  const changes = resolveFieldEntry(evaluation.instance, {scope: "workflow", name: "changesReason"});
  const changesLabel = changes?._type === "string" ? CHANGE_REASONS.find((entry) => entry.value === changes.value)?.label : undefined;
  const needsReason = evaluation.currentStage.activities.some((activity) => !activity.scopedOut && activity.actions.some((action) => action.action.name === "request-changes" && actionRendering(action) === "button"));

  async function fire(activity: string, action: ActionEvaluation) {
    if (disabled || operationInProgress.current || !action.allowed) return;
    const name = `${activity}.${action.action.name}`;
    const params = name === "prepare.submit" ? {revision} : name === "care-review.request-changes" ? {reason} : undefined;
    operationInProgress.current = true;
    setPending(name);
    setFailure(undefined);
    setNotice(undefined);
    try {
      await session.fireAction({activity, action: action.action.name, params});
      setNotice(name === "prepare.submit" ? "Sent for care review." : name === "care-review.approve" ? "Current plan approved." : name === "care-review.request-changes" ? "Changes requested." : "Review updated.");
    } catch (cause) {
      setFailure(errorMessage(cause));
    } finally {
      operationInProgress.current = false;
      setPending(undefined);
    }
  }

  return <div className="native-workflow-detail" aria-busy={Boolean(pending)}>
    <p className="native-workflow-stage"><strong>Review status: {evaluation.currentStage.stage.title ?? readableName(evaluation.instance.currentStage)}</strong></p>
    {stale ? <p role="status">This placement changed after review submission. {evaluation.instance.completedAt ? "Start a new review for the current placement." : "Request changes, then submit the updated placement."}</p> : null}
    {changesLabel && evaluation.instance.currentStage === "preparation" ? <p>Changes requested: {changesLabel}.</p> : null}
    {needsReason ? <div className="native-workflow-reason">
      <label htmlFor={reasonId}>Reason for requesting changes</label>
      <select id={reasonId} value={reason} disabled={disabled || Boolean(pending)} onChange={(event) => setReason(event.target.value)}>
        {CHANGE_REASONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
      </select>
    </div> : null}
    {evaluation.currentStage.activities.filter((activity) => !activity.scopedOut).map((activity) => <div className="native-workflow-activity" key={activity.activity.name}>
      <p><strong>{activity.activity.title ?? readableName(activity.activity.name)}</strong></p>
      {activity.activity.description ? <p>{activity.activity.description}</p> : null}
      <div className="native-workflow-actions">
        {activity.actions.map((action) => {
          const rendering = actionRendering(action);
          if (rendering === "absent") return null;
          const name = `${activity.activity.name}.${action.action.name}`;
          const title = actionLabel(name, action);
          if (rendering === "automation") return <p key={name}>{title} runs automatically.</p>;
          const supported = ["prepare.submit", "care-review.approve", "care-review.request-changes"].includes(name);
          const explanation = supported ? blockedReason(action) : "This step is unavailable here. Ask an administrator for help.";
          return <div key={name}>
            <button className="button button-small" type="button" disabled={disabled || Boolean(pending) || !action.allowed || !supported || (name === "prepare.submit" && !revision) || (name === "care-review.approve" && stale)} onClick={() => void fire(activity.activity.name, action)}>
              {pending === name ? "Saving..." : title}
            </button>
            {explanation ? <p className="small-note">{explanation}</p> : null}
          </div>;
        })}
      </div>
    </div>)}
    {evaluation.instance.currentStage === "review" ? <p className="small-note">Before approval, confirm all three parties consent, the match is suitable, required introduction questions are answered, and the trial and return plans are complete. Changes to the placement need a fresh review.</p> : null}
    {failure ? <p role="alert">The review decision could not be saved. Please try again.</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    <details>
      <summary>Review record details</summary>
      <dl>
        <dt>Review record ID</dt><dd>{instanceId}</dd>
        <dt>Submitted record revision</dt><dd>{reviewedValue || "Not yet submitted"}</dd>
        <dt>Current placement revision</dt><dd>{revision}</dd>
      </dl>
      {failure ? <p>{failure}</p> : null}
    </details>
  </div>;
}
