"use client";

import {useState} from "react";
import Link from "next/link";
import {ArrowLeft,DoorOpen,FileCheck2,ShieldCheck} from "lucide-react";
import type {ConsentParty,Placement} from "@/lib/hearth/domain";
import {PLACEMENT_STATUS_LABELS} from "@/lib/hearth/domain";
import {consentRequirements} from "@/lib/hearth/placement";
import {savedResidentName} from "@/lib/hearth/saved-case-recovery";
import {newRequestId,useHearth} from "./hearth-provider";
import s from "./saved-case-recovery.module.css";

export function SavedRegistryNotice(){
 return <div className={s.notice} role="status"><ShieldCheck size={21}/><div><strong>Saved record · current sources unverified</strong><p>The live registry has not been verified. These details are the record saved in this browser and may be out of date. New agreements and starting or settling a stay are paused until current records return.</p></div></div>;
}
export function SavedCaseRecovery({placement}:{placement:Placement}){
 const {withdrawSaved,savedEvents}=useHearth();
 const requirements=consentRequirements(placement);
 const [party,setParty]=useState<ConsentParty>(requirements[0].party);
 const [note,setNote]=useState("");
 const [feedback,setFeedback]=useState<{error:boolean;text:string}|null>(null);
 const canWithdraw=["review","trial","settled"].includes(placement.status);
 const plan=placement.relocationPlan;
 const events=savedEvents.filter(event=>event.placementId===placement.id).slice().reverse();
 function withdraw(){
  try{
   withdrawSaved({type:"record-consent",decision:"denied",party,note,placementId:placement.id,expectedRev:placement.rev,requestId:newRequestId()});
   setFeedback({error:false,text:"Refusal or withdrawal recorded in this browser. Follow the saved exit arrangements below; no coordinator has been contacted."});
  }catch(error){setFeedback({error:true,text:error instanceof Error?error.message:"The withdrawal could not be recorded."});}
 }
 return <div className={s.recovery}>
  <Link className={s.back} href="/visits"><ArrowLeft size={15}/> Your saved cases</Link>
  <header className={s.heading}><span className="eyebrow">SAVED CASE / {placement.id.slice(-6).toUpperCase()}</span><h1>Your saved <em>case</em></h1><p>{placement.spiritIds.map((id,index)=>savedResidentName(placement,id,index)).join(" · ")}</p><strong>{PLACEMENT_STATUS_LABELS[placement.status]}</strong><p>Saved <time dateTime={placement.updatedAt}>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(placement.updatedAt))}</time></p></header>
  <SavedRegistryNotice/>
  {feedback&&<div className={s.notice} role={feedback.error?"alert":"status"}>{feedback.text}</div>}
  <section className={s.panel} aria-labelledby="saved-exit-heading"><div className={s.title}><DoorOpen size={24}/><h2 id="saved-exit-heading">Your saved safe exit</h2></div>
   {plan?<dl><div><dt>Destination</dt><dd>{plan.destination||"No destination was saved."}</dd></div><div><dt>Coordinator</dt><dd>{plan.coordinator||"No coordinator was saved."}</dd></div><div><dt>When to leave</dt><dd>{plan.trigger||"No trigger was saved."}</dd></div><div><dt>Handover arrangements</dt><dd>{plan.handoverNotes||"No handover arrangements were saved."}</dd></div></dl>:<p>No relocation plan was saved for this review. The saved record cannot confirm a destination or coordinator.</p>}
   <p className={s.small}>These are saved arrangements. Current availability and contact details have not been verified.</p>
  </section>
  <section className={s.panel} aria-labelledby="saved-trial-heading"><div className={s.title}><FileCheck2 size={23}/><h2 id="saved-trial-heading">Your saved trial plan</h2></div>{placement.trialPlan?<dl><div><dt>Duration</dt><dd>{placement.trialPlan.durationDays} days</dd></div><div><dt>Check-ins</dt><dd>Days {placement.trialPlan.checkInDays.join(", ")}</dd></div><div><dt>Success criteria</dt><dd>{placement.trialPlan.successCriteria}</dd></div></dl>:<p>No trial plan was saved.</p>}</section>
  <section className={s.panel} aria-labelledby="saved-decisions-heading"><h2 id="saved-decisions-heading">Saved decisions</h2><dl>{requirements.map(requirement=><div key={requirement.party}><dt>{requirement.label}</dt><dd>{placement.consents[requirement.party].decision}<p>{placement.consents[requirement.party].note}</p></dd></div>)}</dl>
   <div className={s.blocked}><button className="button" disabled>Record agreement</button>{placement.status==="review"&&<button className="button" disabled>Begin trial stay</button>}{placement.status==="trial"&&<button className="button" disabled>Confirm settled placement</button>}</div><p className={s.small}>Current registry records are required before these steps can continue.</p>
  </section>
  {canWithdraw&&<section className={s.panel} aria-labelledby="saved-withdraw-heading"><h2 id="saved-withdraw-heading">{placement.status==="review"?"Record a local refusal":"Withdraw from this stay"}</h2><p>Each person keeps the right to refuse or withdraw. This records the decision in this browser and preserves the saved exit plan. It does not contact anyone or arrange a move.</p><label>Whose decision?<select value={party} onChange={event=>setParty(event.target.value as ConsentParty)}>{requirements.map(requirement=><option key={requirement.party} value={requirement.party}>{requirement.label}</option>)}</select></label><label>Refusal or withdrawal note<textarea value={note} minLength={5} maxLength={1500} onChange={event=>setNote(event.target.value)} placeholder="Record the person's own decision."/></label><button className="button button-pine" disabled={note.trim().length<5} onClick={withdraw}>{placement.status==="review"?"Record refusal locally":"Record withdrawal locally"}</button></section>}
  <section className={s.panel} aria-labelledby="saved-notes-heading"><h2 id="saved-notes-heading">Saved case notes</h2><p>{placement.note}</p>{events.length>0&&<ol className={s.notes}>{events.map(event=><li key={event.id}><strong>{PLACEMENT_STATUS_LABELS[event.toStatus]}</strong><p>{event.note}</p><time dateTime={event.at}>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.at))}</time></li>)}</ol>}</section>
 </div>;
}
