"use client";

import Link from "next/link";
import {ArrowLeft, ArrowRight, Check, FileText, Printer, ShieldCheck} from "lucide-react";
import {useHearth} from "./hearth-provider";
import {ContentState, RegistryNotice, SiteFooter, SiteHeader} from "./site-shell";
import {SpiritPortrait} from "./illustrations";
import {caseExcerpt, describeCaseRecord} from "@/lib/hearth/case-record";
import {consentRequirements} from "@/lib/hearth/placement";
import {PLACEMENT_STATUS_LABELS, type HearthState, type Placement} from "@/lib/hearth/domain";
import s from "./case-record.module.css";
import {OfficeSeal} from "./brand";
import {SavedCaseRecovery} from "./saved-case-recovery";

function date(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("en-GB", {day: "2-digit", month: "short", year: "numeric", timeZone: "UTC"}).format(parsed) : "Date unavailable";
}
function hour(value: number) {return `${String(Math.floor(value)).padStart(2, "0")}:${value % 1 ? "30" : "00"}`;}


export function CaseRecordPage({id}: {id: string}) {
  const {state, localReady, error, savedPlacements} = useHearth();
  const placement = savedPlacements.find(entry => entry.id === id);
  if(localReady && placement && !state) return <div className={s.page}><div className={s.screenChrome}><SiteHeader/><RegistryNotice/></div><main id="main" className={s.main}><div className={s.tools}><Link href={`/stay/${encodeURIComponent(placement.id)}`}><ArrowLeft size={16}/> Return to case</Link><button className="button button-pine button-small" disabled><Printer size={15}/> Print case record</button></div><p className={s.alert} data-testid="record-status">Registry check unavailable. Printing is paused while the saved sources and agreements remain unverified.</p><SavedCaseRecovery key={placement.id} placement={placement}/></main><div className={s.screenChrome}><SiteFooter/></div></div>;
  return <div className={s.page}><div className={s.screenChrome}><SiteHeader/><RegistryNotice/></div><main id="main" className={s.main}><ContentState>{!localReady ? <div className="content-state" role="status"><h1>Opening your case record</h1><p>Restoring the decisions saved in this browser.</p></div> : placement && state ? <CaseRecord placement={placement} state={state} registryAvailable={!error}/> : <div className={s.missing}><FileText size={34}/><span className={s.kicker}>HEARTHAFTER / CASE RECORD</span><h1>Case not found</h1><p>This browser has no saved record for this case. Return to your cases or start a household application.</p><Link className="button button-pine" href="/visits">Your cases <ArrowRight size={16}/></Link></div>}</ContentState></main><div className={s.screenChrome}><SiteFooter/></div></div>;
}

function CaseRecord({placement, state, registryAvailable}: {placement: Placement; state: HearthState; registryAvailable: boolean}) {
  const view = describeCaseRecord(state, placement, registryAvailable);
  const spirits = placement.spiritIds.map(id => state.spirits.find(spirit => spirit.id === id));
  const household = state.homes.find(home => home.id === placement.home.templateId);
  const caseNumber = placement.id.slice(-8).toUpperCase();
  const casePath = `/stay/${encodeURIComponent(placement.id)}`;
  const names = [household?.name ?? "The living household", ...spirits.map((spirit, index) => spirit?.name ?? `Spirit ${index + 1}`)];
  const quiet = placement.home.quietHours;
  const planSaved = Boolean(placement.trialPlan && placement.relocationPlan);
  const boundaryIds = [...new Set(spirits.flatMap(spirit => spirit?.boundaryIds ?? []))];
  const boundaries = boundaryIds.map(id => state.boundaries.find(boundary => boundary.id === id)).filter(boundary => boundary !== undefined);
  return <>
    <div className={s.tools}><Link href={casePath}><ArrowLeft size={16}/> Return to case</Link><div><span>A copy for your records</span><button className="button button-pine button-small" disabled={!registryAvailable} onClick={() => window.print()}><Printer size={15}/> Print case record</button></div></div>
    <article className={s.paper} aria-label="Placement case record">
      <header className={s.letterhead}><div className={s.office}><OfficeSeal className={s.seal}/><div><span>THE OFFICE OF</span><strong>Living &amp; Departed Affairs</strong><small>Hearthafter / Residential placement</small></div></div><div className={s.formReference}><span>RESIDENT COPY</span><strong>HA / 02</strong></div></header>
      <div className={s.titleRow}><div><span className={s.kicker}>VOLUNTARY HOUSEHOLD PLACEMENT</span><h1>Placement record</h1><p>{household?.name ?? "Your household"}</p></div><div className={`${s.stamp} ${view.needsAttention ? s.attention : ""}`}><span>CASE {caseNumber}</span><strong data-testid="record-status">{view.label}</strong><small>Updated {date(placement.updatedAt)}</small></div></div>
      {view.needsAttention && <div className={s.alert} role="status"><ShieldCheck size={18}/><p>{registryAvailable ? "Registry details have changed since this case was reviewed. Earlier agreements are retained as history and need a new review before the case can advance." : "The registry could not be checked. This saved record does not confirm that its sources or agreements are current."}</p></div>}
      <dl className={s.register}><div><dt>Case opened</dt><dd>{date(placement.createdAt)}</dd></div><div><dt>Saved stage</dt><dd>{PLACEMENT_STATUS_LABELS[placement.status]}</dd></div><div><dt>Trial period</dt><dd>{placement.trialPlan ? `${placement.trialPlan.durationDays} days` : "Not yet agreed"}</dd></div><div><dt>Required conversations</dt><dd>{view.required - view.outstanding} of {view.required} confirmed{!view.current ? " / review needed" : ""}</dd></div></dl>
      <section className={s.people} aria-labelledby="record-company"><div className={s.sectionTitle}><span>01</span><h2 id="record-company">The proposed company</h2></div><div className={s.portraits}>{spirits.map((spirit, index) => <div className={s.person} key={placement.spiritIds[index]}><div className={s.portrait}>{spirit && <SpiritPortrait kind={spirit.portrait}/>}</div><div><span className={s.kicker}>{spirit?.pronouns ?? "PROFILE UNAVAILABLE"}</span><h3>{spirit?.name ?? `Spirit ${index + 1}`}</h3>{spirit?.quote ? <blockquote>“{spirit.quote}”</blockquote> : <p>{spirit?.summary ?? "Reconnect to the registry to read this profile."}</p>}</div></div>)}</div></section>
      <section className={s.decisionsSection} aria-labelledby="record-decisions"><div className={s.sectionTitle}><span>02</span><h2 id="record-decisions">Separate decisions</h2></div><div className={s.decisions}>{view.decisions.map((decision, index) => <div className={s.decision} key={decision.party}><span className={s.kicker}>{index === 0 ? "THE LIVING HOUSEHOLD" : "THE DEPARTED"}</span><h3>{consentRequirements(placement)[index]?.kind==="adult"?state.spirits.find(spirit=>spirit.id===consentRequirements(placement)[index]?.spiritId)?.name??names[index]:consentRequirements(placement)[index]?.label??names[index]}</h3><strong className={decision.decision === "denied" || decision.label === "Agreement needs review" ? s.cautionDecision : ""}>{decision.decision === "granted" && view.current && <Check size={14}/>} {decision.label}</strong><small>{placement.consents[decision.party]?.at ? `Recorded ${date(placement.consents[decision.party].at!)}` : "No decision recorded"}</small></div>)}</div><p className={s.caption}>An introduction is not an agreement to move in. Each party keeps the right to decline or leave.</p></section>
      <div className={s.planGrid}><section aria-labelledby="record-plan"><div className={s.sectionTitle}><span>03</span><h2 id="record-plan">The shared plan</h2></div>{placement.trialPlan ? <><div className={s.checkins}><strong>{placement.trialPlan.durationDays}-day trial</strong><span>Check-ins: {placement.trialPlan.checkInDays.map(day => `day ${day}`).join(", ")}</span></div><p>{caseExcerpt(placement.trialPlan.successCriteria)}</p></> : <p>The trial period and check-ins have not been agreed.</p>}<dl className={s.conditions}><div><dt>Quiet hours</dt><dd>{quiet && quiet !== "none" ? `${hour(quiet.start)} to ${hour(quiet.end)}` : quiet === "none" ? "No fixed quiet hours" : "Still to confirm"}</dd></div><div><dt>Private retreat</dt><dd>{placement.home.privateRetreat === true ? "Available to each spirit" : "Still to confirm"}</dd></div><div><dt>Recording</dt><dd>{placement.home.recordingPolicy === "none" ? "No active recording" : placement.home.recordingPolicy === "active" ? "Active recording in the home" : "Still to confirm"}</dd></div></dl>{placement.acceptedClauseIds.includes("quiet-hours") && <p className={s.caption}>The review includes a quiet-hours agreement.</p>}</section><section aria-labelledby="record-exit"><div className={s.sectionTitle}><span>04</span><h2 id="record-exit">A safe way to leave</h2></div>{placement.relocationPlan ? <dl className={s.exitPlan}><div><dt>Next place</dt><dd>{caseExcerpt(placement.relocationPlan.destination, 115)}</dd></div><div><dt>Coordinator</dt><dd>{caseExcerpt(placement.relocationPlan.coordinator, 95)}</dd></div><div><dt>When to use it</dt><dd>{caseExcerpt(placement.relocationPlan.trigger, 150)}</dd></div><div><dt>Handover</dt><dd>{caseExcerpt(placement.relocationPlan.handoverNotes, 165)}</dd></div></dl> : <p>A destination, coordinator, and handover plan are still needed before a stay can begin.</p>}</section></div>
      <section className={s.boundaries} aria-labelledby="record-boundaries"><h2 id="record-boundaries">Boundaries carried into the review</h2><p>{boundaries.length ? boundaries.map(boundary => boundary.label).join(" · ") : "Read the linked profiles before continuing."}</p>{!view.sourcesCurrent && <small>These are the current registry labels. Revisit the case to compare them with the earlier review.</small>}</section>
      <section className={s.nextStep} aria-labelledby="record-next"><div><span className={s.kicker}>THE NEXT STEP</span><h2 id="record-next">{view.label}</h2></div><p>{view.nextStep}</p></section>
      <footer className={s.documentFooter}><div><strong>Good company. A place to haunt.</strong><p>Case summary / {caseNumber} / Updated {date(placement.updatedAt)}</p></div><p>This copy records {planSaved ? "the saved plan and decisions" : "an unfinished review"}. Full notes and any unabridged plan text remain in your saved case.</p><span className={s.printOnly}>Fictional interactive experience. Browser-local case; no application has been sent.</span></footer>
    </article>
    <div className={s.afterRecord}><Link href={casePath} className="button">Continue with this case <ArrowRight size={16}/></Link><details><summary>About this copy</summary><p>This case and its decisions are saved in this browser. Printing makes a snapshot of what is shown here; it does not submit an application or create an official approval. Registry changes may require another review. Longer plan entries are marked as excerpts, with the complete text retained in the case.</p><Link href="/about">About this service</Link></details></div>
  </>;
}
