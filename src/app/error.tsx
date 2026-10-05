"use client";
import Link from "next/link";
import {RotateCcw} from "lucide-react";
import {OfficeMark} from "@/components/brand";
import {SiteHeader,SiteFooter} from "@/components/site-shell";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <><SiteHeader/><main id="main" className="content-state" role="alert"><OfficeMark className="state-mark"/><span className="eyebrow">SERVICE INTERRUPTION</span><h1>We couldn't open this page.</h1><p>Please try again. A case already saved on this device is kept separately from the page you are opening.</p><div className="state-actions"><button className="button button-pine" onClick={reset}>Try this page again <RotateCcw size={16}/></button><Link className="underlined-link" href="/">Return to the service</Link></div></main><SiteFooter/></>;}
