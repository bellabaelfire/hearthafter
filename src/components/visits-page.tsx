"use client";

import Link from "next/link";
import {ArrowRight,FileCheck2,Plus} from "lucide-react";
import {PLACEMENT_STATUS_LABELS} from "@/lib/hearth/domain";
import {useHearth} from "./hearth-provider";
import {SpiritPortrait} from "./illustrations";
import {RegistryNotice,SiteFooter,SiteHeader,SourceBadge} from "./site-shell";
import {SavedRegistryNotice} from "./saved-case-recovery";
import {savedResidentName} from "@/lib/hearth/saved-case-recovery";
import s from "./placement-page.module.css";

function updatedLabel(value:string){return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}

export function VisitsPage(){
 const {state,localReady,savedPlacements,error}=useHearth();
 const placements=savedPlacements.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const unverified=!state||Boolean(error);
 return <><SiteHeader/><RegistryNotice/><main id="main" className={s.main}>
  <div className={s.topline}><span className="civic-case">OLDA / YOUR SAVED VISIT</span></div>
  <header className={s.heading}><div><span className="eyebrow">CASE HISTORY</span><h1>Your <em>cases</em></h1><p>Continue a review or revisit a completed placement.<br/>Your saved cases are listed below.</p></div><div className={s.caseStamp}><FileCheck2 size={27}/><span>YOUR CASE RECORD</span><strong>{placements.length} saved {placements.length===1?"case":"cases"}</strong></div></header>

  {localReady&&unverified&&<SavedRegistryNotice/>}
  {!localReady?<div className={s.empty} role="status"><FileCheck2 size={35}/><h2>Opening your cases</h2><p>Opening your saved cases.</p></div>:placements.length===0?<div className={s.empty}><FileCheck2 size={38}/><span className="eyebrow">YOUR SAVED CASES</span><h2 className={s.visitsEmptyHeading}>No saved cases yet</h2><p>Start with a household application, meet a possible group, and open a placement review. Your case will be waiting here when you return.</p><Link className="button button-pine" href="/find">Find your company <ArrowRight size={16}/></Link></div>:<>
   <div className={s.visitsToolbar}><span>{placements.length} saved {placements.length===1?"case":"cases"}, most recently updated first</span><Link href="/find"><Plus size={14}/> Start another enquiry</Link></div>
   <div className={s.visitsGrid}>{placements.map(placement=>{
    const spirits=placement.spiritIds.map(id=>state?.spirits.find(spirit=>spirit.id===id));
    const names=spirits.map((spirit,index)=>spirit?.name??savedResidentName(placement,placement.spiritIds[index],index));
    const household=state?.homes.find(home=>home.id===placement.home.templateId);
    return <article className={s.visitCard} key={placement.id} aria-label={`Saved case for ${names.join(" and ")}`}>
     <div className={s.visitMeta}><span>CASE {placement.id.slice(-6).toUpperCase()}</span><span className={s.status}>{PLACEMENT_STATUS_LABELS[placement.status]}</span></div>
     <div className={s.visitBody}><div className={s.visitPortraits}>{spirits.map((spirit,index)=>spirit?<SpiritPortrait key={spirit.id} kind={spirit.portrait}/>:<FileCheck2 key={index} size={32}/>)}</div><div className={s.visitNames}><span className="eyebrow">{household?.name??"Your household"}</span><h2>{names.map((name,index)=><span key={placement.spiritIds[index]}>{index>0&&<><em> & </em><br/></>}{name}</span>)}</h2></div></div>
     <p className={s.visitNote}>{placement.note}</p>
     <div className={s.visitActions}><div><span>LAST UPDATED</span><time dateTime={placement.updatedAt}>{updatedLabel(placement.updatedAt)}</time></div><Link className="button button-small" href={`/stay/${encodeURIComponent(placement.id)}`} aria-label={`Continue review for ${names.join(" and ")}`}>Continue review <ArrowRight size={14}/></Link></div>
    </article>;
   })}</div>

  </>}
 <details className={s.demoDetails}><summary>Demo details</summary><SourceBadge/><p>Your cases stay in this browser. Clearing browser data or starting a fresh visit removes them. Cases from another browser or device do not appear here. No application or invitation is sent, and your decisions do not change the shared registry.</p><Link href="/about">About this service <ArrowRight size={12}/></Link></details></main><SiteFooter/></>;
}
