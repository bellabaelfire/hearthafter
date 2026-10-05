import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {OfficeMark} from "@/components/brand";
import {SiteHeader,SiteFooter} from "@/components/site-shell";
export default function NotFound(){return <><SiteHeader/><main id="main" className="content-state"><OfficeMark className="state-mark"/><span className="eyebrow">OFFICE FILE / 404</span><h1>This file isn't here.</h1><p>The address does not match a page in the service. You can return home or meet the departed residents in the register, without starting an application.</p><div className="state-actions"><Link className="button button-pine" href="/">Return to the service <ArrowRight size={16}/></Link><Link className="underlined-link" href="/spirits">Browse the spirit register</Link></div></main><SiteFooter/></>;}
