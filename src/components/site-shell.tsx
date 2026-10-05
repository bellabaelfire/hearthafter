"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ArrowUpRight,Menu,X,RotateCcw,AlertCircle} from "lucide-react";
import {useEffect,useRef,useState} from "react";
import {Brand,OfficeMark,OfficeSeal} from "./brand";
import {useHearth} from "./hearth-provider";

export function SiteHeader(){
 const [open,setOpen]=useState(false);
 const menuRef=useRef<HTMLButtonElement>(null);
 const headerRef=useRef<HTMLElement>(null);
 const navRef=useRef<HTMLElement>(null);
 const path=usePathname();
 const {state}=useHearth();
 useEffect(()=>{
  if(!open)return;
  navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);menuRef.current?.focus();}};
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!headerRef.current?.contains(event.target))setOpen(false);};
  const wide=()=>{if(window.innerWidth>760)setOpen(false);};
  document.addEventListener("keydown",close);
  document.addEventListener("pointerdown",outside);
  window.addEventListener("resize",wide);
  return()=>{document.removeEventListener("keydown",close);document.removeEventListener("pointerdown",outside);window.removeEventListener("resize",wide);};
 },[open]);
 return <><a className="skip-link" href="#main">Skip to content</a><div className="announcement" role="region" aria-label="Office service notice"><span className="civic-label">OLDA / HOME & COMMUNITY</span><span className="announcement-note">PLACEMENT SERVICES</span></div><header ref={headerRef} className="site-header civic-header"><div className="civic-masthead"><Link href="/" className="agency-brand" aria-label="Office of Living and Departed Affairs home"><OfficeSeal/><span><small>THE OFFICE OF</small><strong>Living & Departed Affairs</strong></span></Link><div className="service-brand"><Brand/></div><button ref={menuRef} className="icon-button menu-button" aria-label={open?"Close navigation":"Open navigation"} aria-controls="main-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div><div className="civic-navband"><nav ref={navRef} className={open?"main-nav is-open":"main-nav"} aria-label="Main navigation" id="main-navigation">{[["/find","Host application"],["/spirits","Spirit register"],["/world","Living together"],["/desk","Placement desk"],["/about","Behind the service"]].map(([href,label])=><Link key={href} href={href} aria-current={path===href||path.startsWith(href+"/")?"page":undefined} onClick={()=>setOpen(false)}>{label}{href==="/desk"&&<ArrowUpRight size={12}/>}</Link>)}{state&&state.placements.length>0&&<Link href="/visits" aria-current={path.startsWith("/visits")||path.startsWith("/stay")?"page":undefined} onClick={()=>setOpen(false)}>Your cases ({state.placements.length})</Link>}</nav><span className="service-tagline">HOSTS & DEPARTED RESIDENTS</span></div></header></>;
}

export function SiteFooter(){return <footer className="site-footer civic-footer"><div className="footer-office"><OfficeSeal/><span>Office of Living & Departed Affairs<small>Hearthafter / Residential placement</small></span></div><p>Fictional interactive experience.<br/><span>BellaBaelfire / A personal project</span></p><div><Link href="/about">Behind the service <ArrowUpRight size={14}/></Link><Link href="/world#ground-rules">Placement guidance <ArrowUpRight size={14}/></Link></div></footer>;}

export function SourceBadge(){
 const {mode,loading,error}=useHearth();
 const text=loading?"Opening the registry":error?"Registry unavailable":mode==="sanity"?"Registry connected":"Local preview";
 return <Link href="/about#behind-the-service" className="source-badge" aria-label={text+". Learn how the registry works."}><span className={mode==="sanity"&&!error&&!loading?"source-dot live":"source-dot"}/>{text}</Link>;
}

export function RegistryNotice(){const {error,storageError,reload}=useHearth();return <>{error&&<div className="registry-notice" role="alert"><AlertCircle size={18}/><span>{error} Previously loaded profiles may be out of date.</span><button onClick={()=>void reload()}><RotateCcw size={14}/> Try again</button></div>}{storageError&&<div className="registry-notice" role="status"><AlertCircle size={18}/><span>{storageError}</span></div>}</>;}

export function ContentState({children}:{children:React.ReactNode}){
 const {state,loading,error,reload}=useHearth();
 if(!state)return <div className="content-state" role={loading?"status":"alert"}><OfficeMark className="state-mark"/><span className="eyebrow">THE REGISTRY</span><h1>{loading?"One moment, please.":"The registry is unavailable."}</h1><p>{loading?"We are opening the registry records.":error||"We couldn't open the registry."}</p>{!loading&&<button className="button button-pine" onClick={()=>void reload()}>Try the registry again <RotateCcw size={16}/></button>}</div>;
 return <>{children}</>;
}
