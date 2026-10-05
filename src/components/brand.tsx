import Link from "next/link";
import {useId} from "react";

const FOREST="#284a3b";
const IVORY="#fcf8eb";
const GOLD="#cba75b";

/** The home's doorway is an agreement between living and departed residents. */
function SharedHome(){
 return <>
  <path d="M32 1c.7 2.8 1.5 3.6 4 4-2.5.4-3.3 1.2-4 4-.7-2.8-1.5-3.6-4-4 2.5-.4 3.3-1.2 4-4Z" fill={GOLD}/>
  <path d="M16 21V12h5v5l9-6a3.5 3.5 0 0 1 4 0l23 17a2 2 0 0 1-1 4h-4v20a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V32H8a2 2 0 0 1-1-4l9-7Z" fill={FOREST} stroke={GOLD} strokeWidth=".85" strokeLinejoin="round"/>
  <circle cx="22" cy="32" r="4" fill={IVORY}/>
  <path d="M16 52v-7c0-4 2-6 6-6 3 0 5 2 8 5l4 2-2.5 3-4.5-3v6H16Z" fill={IVORY}/>
  <path d="M37 52V33a6 6 0 0 1 12 0v19l-3-2.4-3 2.4-3-2.4-3 2.4Z" fill={IVORY}/>
  <path d="M41 33v1.6m4-1.6v1.6" stroke={FOREST} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="m38 41-5 3" fill="none" stroke={IVORY} strokeWidth="4.4" strokeLinecap="round"/>
  <path d="m28 44 4-3 4 2 3 3-3 3-4-2-4-3Z" fill={GOLD} stroke={FOREST} strokeWidth="1.15" strokeLinejoin="round"/>
  <path d="m31 44 3-3 2 1" fill="none" stroke={FOREST} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
 </>;
}

function Laurel(){
 return <g fill={GOLD} stroke={GOLD} strokeLinejoin="round"><path d="M66 140c-19-12-23-29-17-46" fill="none" strokeWidth="1.15"/><path d="M49 111c-7-3-10-8-8-13 6 2 9 7 8 13Zm-1 10c-8-1-12-6-12-11 7 1 11 5 12 11Zm5 10c-8 1-13-3-15-8 7-1 12 3 15 8Zm8 8c-8 3-14 1-17-4 7-3 13-1 17 4Zm-11-29c-1-7 1-12 6-15 2 7 0 12-6 15Zm1 12c0-8 3-12 9-14 0 7-3 11-9 14Zm6 11c2-7 6-11 12-11-2 7-6 10-12 11Z" strokeWidth=".3"/></g>;
}

export function OfficeMark({className=""}:{className?:string}){
 return <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={"office-mark "+className}><SharedHome/></svg>;
}

export function OfficeSeal({className=""}:{className?:string}){
 const identity=useId().replace(/:/g,"");
 const upper=identity+"-office-name";
 const lower=identity+"-office-purpose";
 return <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false" className={"office-seal "+className}>
  <defs><path id={upper} d="M19 102a81 81 0 0 1 162 0"/><path id={lower} d="M19 103a81 81 0 0 0 162 0"/></defs>
  <circle cx="100" cy="100" r="96" fill={FOREST} stroke={GOLD} strokeWidth="1.6"/>
  <circle cx="100" cy="100" r="90.5" fill="none" stroke={GOLD} strokeWidth=".9"/>
  <circle cx="100" cy="100" r="71" fill={IVORY} stroke={GOLD} strokeWidth="1.6"/>
  <circle cx="100" cy="100" r="67.5" fill="none" stroke={GOLD} strokeWidth=".5"/>
  <text fill={IVORY} fontFamily="Georgia, serif" fontSize="8" letterSpacing=".7" textAnchor="middle"><textPath href={"#"+upper} startOffset="50%">OFFICE OF LIVING &amp; DEPARTED AFFAIRS</textPath></text>
  <text fill={IVORY} fontFamily="Georgia, serif" fontSize="6.5" letterSpacing=".6" textAnchor="middle"><textPath href={"#"+lower} startOffset="50%">COMMUNITY · COEXISTENCE · SUPPORT</textPath></text>
  <circle cx="17.5" cy="104" r="1.6" fill={GOLD}/><circle cx="182.5" cy="104" r="1.6" fill={GOLD}/>
  <g fill="none" stroke={GOLD} strokeWidth=".6" opacity=".32"><path d="M100 38v14M79 43l5 12M61 55l10 9M47 75l14 5M44 96l14-1M121 43l-5 12M139 55l-10 9M153 75l-14 5M156 96l-14-1"/></g>
  <Laurel/><g transform="translate(200 0) scale(-1 1)"><Laurel/></g>
  <g transform="translate(56 48) scale(1.375)"><SharedHome/></g>
  <text x="100" y="145" fill={FOREST} fontFamily="Georgia, serif" fontSize="7.6" fontWeight="bold" letterSpacing="1.05" textAnchor="middle">STABLE HOMES</text>
  <text x="100" y="155" fill={FOREST} fontFamily="Georgia, serif" fontSize="5.8" letterSpacing=".7" textAnchor="middle">BRIGHTER TOMORROWS</text>
 </svg>;
}

export function Brand({light=false}:{light?:boolean}){
 return <Link className={"brand"+(light?" brand-light":"")} href="/" aria-label="Hearthafter home"><OfficeMark/><span>hearth<span className="brand-after">after</span><small>GOOD COMPANY. A PLACE TO HAUNT.</small></span></Link>;
}
