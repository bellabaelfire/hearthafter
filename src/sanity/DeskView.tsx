'use client'
import {useMemo,useState,type ReactNode} from 'react'
import type {HearthState,PlacementCommand,Placement,ConsentParty,PairEvaluation,PlacementResult} from '@/lib/hearth/domain'
import {PLACEMENT_STATUS_LABELS} from '@/lib/hearth/domain'
import {rankGroups} from '@/lib/hearth/matching'
import {consentRequirements,getAvailablePlacementTransitions,getPlacementReadinessIssues} from '@/lib/hearth/placement'
import './desk.css'

export type PlacementIntent=PlacementCommand extends infer C ? C extends PlacementCommand ? Omit<C,'requestId'> : never : never
interface Props {state:HearthState;mode:'offline'|'sanity';canEdit:boolean;onCommand:(command:PlacementIntent)=>Promise<PlacementResult>;editor:ReactNode;nativeReview?:(placement:Placement)=>ReactNode}
const pairLabels:Record<PairEvaluation['status'],string>={eligible:'Ready for introduction','needs-negotiation':'Agreement needed','needs-information':'Details needed',excluded:'Not suitable'}
const actionLabels:Record<PlacementCommand['type'],string>={create:'Review opened','record-consent':'Consent recorded','record-answer':'Introduction discussed','set-plan':'Care plan agreed','refresh-review':'Records reviewed',transition:'Placement updated'}

function names(state:HearthState,ids:string[]) {return ids.map(id=>state.spirits.find(spirit=>spirit.id===id)?.name||id).join(' & ')}
function PairCard({state,pair,selected,onClick}:{state:HearthState;pair:PairEvaluation;selected:boolean;onClick:()=>void}) {
  return <button type="button" className={`desk-pair ${selected?'is-selected':''}`} onClick={onClick}><span>{names(state,pair.spiritIds)}</span><span className="desk-score">{pair.overallScore===null?'n/a':`${pair.overallScore}%`}</span><small>{pairLabels[pair.status]}</small></button>
}
export default function DeskView({state,mode,canEdit,onCommand,editor,nativeReview}:Props) {
  const [homeId,setHomeId]=useState(state.homes[0]?.id||'')
  const [pairIds,setPairIds]=useState<string>('');const [groupSize,setGroupSize]=useState(2)
  const [selectedPlacement,setSelectedPlacement]=useState<string>('')
  const [acceptQuiet,setAcceptQuiet]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [note,setNote]=useState('')
  const [duration,setDuration]=useState(14)
  const [criteria,setCriteria]=useState('Everyone reports feeling comfortable, respected, and able to use their own quiet retreat.')
  const [destination,setDestination]=useState('Hearthafter guesthouse and transition rooms')
  const [coordinator,setCoordinator]=useState('On-duty placement coordinator')
  const [trigger,setTrigger]=useState('Any party withdraws consent or asks to end the stay.')
  const [handover,setHandover]=useState('Arrange a calm handover, confirm a private room, and schedule the next check-in.')
  const home=state.homes.find(entry=>entry.id===homeId)||state.homes[0]
  const pairs=useMemo(()=>home?rankGroups(state,home.preferences,acceptQuiet?['quiet-hours']:[],groupSize):[],[state,home,acceptQuiet,groupSize])
  const pair=pairs.find(entry=>entry.spiritIds.join('|')===pairIds)||pairs[0]
  const placement=state.placements.find(entry=>entry.id===selectedPlacement)||null
  const visibleEvents=placement?state.events.filter(event=>event.placementId===placement.id):[]
  const issues=placement?getPlacementReadinessIssues(state,placement):[]
  async function run(command:PlacementIntent) {
    setBusy(true);setMessage('')
    try {const result=await onCommand(command);if(command.type==='create')setSelectedPlacement(result.placement.id);setMessage(mode==='offline'?'Offline preview updated.':'Decision recorded in the register.');setNote('')}
    catch(error) {setMessage(error instanceof Error?error.message:'The decision could not be recorded.')}
    finally {setBusy(false)}
  }
  function selectPlacement(id:string) {
    setSelectedPlacement(id);setNote('')
    const selected=state.placements.find(entry=>entry.id===id)
    if(selected?.trialPlan){setDuration(selected.trialPlan.durationDays);setCriteria(selected.trialPlan.successCriteria)}
    if(selected?.relocationPlan){setDestination(selected.relocationPlan.destination);setCoordinator(selected.relocationPlan.coordinator);setTrigger(selected.relocationPlan.trigger);setHandover(selected.relocationPlan.handoverNotes)}
  }
  const locked=busy||!canEdit
  return <main className="hearth-desk">
    <header className="desk-header"><div><a href="/">HEARTHAFTER</a><span>Office of Living and Departed Affairs</span></div><span className="desk-mode">{mode==='offline'?'Offline preview':'Live register'}</span></header>
    <div className="desk-intro"><p className="desk-eyebrow">Placement services</p><h1>Placement review.<br/><em>Continuing care.</em></h1><p>Review the household and every departed resident together. Confirm individual consent, agree a supported trial, and keep a safe way to leave.</p></div>
    {mode==='offline'&&<p className="desk-banner">Offline preview. Changes stay on this page and are not saved to the shared register.</p>}
    {!canEdit&&mode==='sanity'&&<p className="desk-banner">Read-only access. An authorized reviewer can update pairing guidance and record decisions.</p>}
    <div className="desk-grid"><section className="desk-panel"><div className="desk-section-heading"><span>01</span><h2>Find promising company</h2></div><label className="desk-field">Household<select value={home?.id||''} onChange={event=>{setHomeId(event.target.value);setPairIds('')}}>{state.homes.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><p className="desk-muted">{home?.summary}</p>
      <label className="desk-check"><input type="checkbox" checked={acceptQuiet} onChange={event=>setAcceptQuiet(event.target.checked)}/>Include the documented quiet-hours agreement in this review.</label>
      <label className="desk-field">Departed group size<select value={groupSize} onChange={event=>{setGroupSize(Number(event.target.value));setPairIds('')}}><option value={2}>Two residents</option><option value={3}>Three residents</option></select></label><p className="desk-muted">At least two departed residents share each placement. Every adult, guardian agreement and child assent is reviewed separately.</p><div className="desk-pairs">{pairs.map(entry=><PairCard key={entry.spiritIds.join('|')} state={state} pair={entry} selected={entry===pair} onClick={()=>setPairIds(entry.spiritIds.join('|'))}/>)}</div>
    </section><section className="desk-panel"><div className="desk-section-heading"><span>02</span><h2>Review the circumstances</h2></div>{pair?<><h3>{names(state,pair.spiritIds)}</h3><div className="desk-metrics">{pair.spiritIds.map((id,index)=><div key={id}><strong>{pair.hostScores?.[id]??(index===0?pair.hostAScore:index===1?pair.hostBScore:null)??'n/a'}</strong><small>Home + {state.spirits.find(spirit=>spirit.id===id)?.name}</small></div>)}<div><strong>{pair.pairScore??'n/a'}</strong><small>Resident relationships</small></div></div>
      <p className="desk-status">{pairLabels[pair.status]}</p><ul className="desk-evidence">{pair.reasons.slice(0,9).map((reason,index)=><li key={`${reason.code}-${index}`}><strong>{reason.label}</strong><span>{reason.detail}</span><details className="desk-record-details"><summary>Source records</summary><small>{reason.sourceRefs.join(' / ')}</small></details></li>)}</ul>
      <button className="desk-primary" disabled={locked||pair.status!=='eligible'} onClick={()=>void run({type:'create',home:pair.home,spiritIds:pair.spiritIds,acceptedClauseIds:pair.acceptedClauseIds,sourceSnapshot:pair.sourceSnapshot})}>Open placement review</button><p className="desk-muted">This opens a review. It does not grant consent or begin a stay.</p></>:<p>Add household and spirit records to review suitable introductions.</p>}</section></div>
    <section className="desk-panel desk-placement-panel"><div className="desk-section-heading"><span>03</span><h2>Support the whole placement</h2></div><label className="desk-field">Placement review<select value={selectedPlacement} onChange={event=>selectPlacement(event.target.value)}><option value="">Choose a review</option>{state.placements.map(entry=><option key={entry.id} value={entry.id}>{names(state,entry.spiritIds)} / {state.homes.find(home=>home.id===entry.home.templateId)?.name||'Household'} / {PLACEMENT_STATUS_LABELS[entry.status]}</option>)}</select></label>
      {placement?<div className="desk-review-grid"><div><h3>{names(state,placement.spiritIds)}</h3><p className="desk-status">{PLACEMENT_STATUS_LABELS[placement.status]}</p><p className="desk-muted">{placement.note}</p><label className="desk-field">Decision note<textarea value={note} onChange={event=>setNote(event.target.value)} placeholder="Record the discussion or the reason for this decision." maxLength={1500}/></label>
      <div className="desk-questions"><h3>Questions for the introduction</h3><p className="desk-muted">Confirm each required question with the people involved before a trial. An unresolved answer keeps the review open. If an answer changes, ask everyone to consider it again.</p>{placement.evaluation.introductionQuestions.map(question=>{
        const answer=placement.answers.find(entry=>entry.questionId===question.id&&entry.spiritId===question.spiritId)
        const current=answer?.sourceFingerprint===placement.evaluation.sourceSnapshot.fingerprint
        return <article key={`${question.spiritId}-${question.id}`}><small>{question.spiritName}{question.requiredForTrial?' / Required before trial':''}</small><h4>{question.question}</h4><p>{question.whyItMatters}</p><p className="desk-answer">{current?`Recorded: ${answer?.answer}`:'Not yet answered for this evidence.'}</p>{current&&<p className="desk-muted">{answer?.note}</p>}<div className="desk-actions">{(['yes','no','unknown'] as const).map(value=><button key={value} disabled={locked||placement.status!=='review'||note.trim().length<5} onClick={()=>void run({type:'record-answer',placementId:placement.id,expectedRev:placement.rev,questionId:question.id,spiritId:question.spiritId,answer:value,note})}>{value==='yes'?'Record yes':value==='no'?'Record no':'Still unknown'}</button>)}</div></article>
      })}</div>
      <div className="desk-consents">{consentRequirements(placement).map(requirement=><div key={requirement.party}><span><strong>{requirement.kind==='adult'?state.spirits.find(spirit=>spirit.id===requirement.spiritId)?.name||requirement.label:requirement.label}</strong><small>{placement.consents[requirement.party]?.decision??'pending'}</small></span><button disabled={locked||note.trim().length<5||!['review','trial','settled'].includes(placement.status)} onClick={()=>void run({type:'record-consent',placementId:placement.id,expectedRev:placement.rev,party:requirement.party,decision:'granted',note})}>{requirement.kind==='assent'?'Record assent':requirement.kind==='guardian'?'Record guardian agreement':'Record yes'}</button><button className="desk-quiet" disabled={locked||note.trim().length<5||!['review','trial','settled'].includes(placement.status)} onClick={()=>void run({type:'record-consent',placementId:placement.id,expectedRev:placement.rev,party:requirement.party,decision:'denied',note})}>Record no</button></div>)}</div>
      <p className="desk-muted">A no ends the proposal or starts relocation. It cannot be overridden by a stronger match score.</p>
      {issues.length>0&&<details className="desk-readiness" open><summary>Review requirements</summary><ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></details>}
      <div className="desk-actions">{placement.status==='review'&&<button disabled={locked} onClick={()=>void run({type:'refresh-review',placementId:placement.id,expectedRev:placement.rev,acceptedClauseIds:placement.acceptedClauseIds})}>Check current records</button>}{getAvailablePlacementTransitions(placement).map(to=><button className={to==='trial'||to==='settled'?'desk-primary':''} key={to} disabled={locked||note.trim().length<(to==='settled'?20:12)} onClick={()=>void run({type:'transition',placementId:placement.id,expectedRev:placement.rev,to:to as 'trial'|'settled'|'relocating'|'closed',note})}>{to==='trial'?'Begin trial':to==='settled'?'Confirm settled stay':to==='relocating'?'Arrange relocation':'Close review'}</button>)}</div>
      </div><div><h3>A trial with a safe exit</h3><label className="desk-field">Trial duration (days)<input type="number" min={7} max={30} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></label><p className="desk-muted">Check-ins on day 3 and the final day.</p><label className="desk-field">How we will know it is working<textarea value={criteria} onChange={event=>setCriteria(event.target.value)} maxLength={1500}/></label><label className="desk-field">Relocation destination<input value={destination} onChange={event=>setDestination(event.target.value)} maxLength={1500}/></label><label className="desk-field">Coordinator role<input value={coordinator} onChange={event=>setCoordinator(event.target.value)} maxLength={1500}/></label><label className="desk-field">When the exit plan starts<input value={trigger} onChange={event=>setTrigger(event.target.value)} maxLength={1500}/></label><label className="desk-field">Handover care<textarea value={handover} onChange={event=>setHandover(event.target.value)} maxLength={1500}/></label><button disabled={locked||placement.status!=='review'} onClick={()=>void run({type:'set-plan',placementId:placement.id,expectedRev:placement.rev,trialPlan:{durationDays:duration,checkInDays:[3,duration],successCriteria:criteria},relocationPlan:{destination,coordinator,trigger,handoverNotes:handover}})}>Save agreed plan</button><p className="desk-muted">A changed plan needs fresh answers and consent from everyone involved.</p>{mode==='sanity'&&nativeReview?nativeReview(placement):<p className="desk-banner">Formal care review is available when the shared register is connected. This offline preview cannot record an approval.</p>}</div></div>:<p className="desk-muted">Open a promising group above, then select its review here.</p>}
    </section>
    <section className="desk-panel"><div className="desk-section-heading"><span>04</span><h2>Pairing guidance</h2></div><p className="desk-muted">Update how these spirits are introduced. Existing reviews will need a fresh check when their supporting records change.</p>{editor}</section>
    <section className="desk-panel"><div className="desk-section-heading"><span>05</span><h2>Decision history</h2></div><ol className="desk-timeline">{visibleEvents.slice(-12).reverse().map(event=><li key={event.id}><span>{new Date(event.at).toLocaleString('en-US')}</span><div><strong>{actionLabels[event.action]}</strong><p>{event.note}</p><details className="desk-record-details"><summary>Record details</summary><small>Reviewer: {event.actor}<br/>Receipt: {event.requestId}</small></details></div></li>)}</ol>{visibleEvents.length===0&&<p className="desk-muted">{placement?'No decisions have been recorded for this review.':'Select a placement review to see its decision history.'}</p>}</section>
    <div aria-live="polite" className={message?'desk-message':''}>{busy?'Recording decision…':message}</div><footer className="desk-footer">Office of Living and Departed Affairs / Placement services</footer>
  </main>
}
