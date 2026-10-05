"use client";
import Link from "next/link";
import Image from "next/image";
import {useArtwork} from "./use-artwork";
import { ArrowRight, ArrowUpRight, BookOpen, DoorOpen, Heart, Moon, Sprout } from "lucide-react";
import { SiteHeader, SiteFooter, RegistryNotice } from "@/components/site-shell";


const relationships = [
  { mark: "H", label: "HOUSEHOLD + EACH RESIDENT", title: "Every introduction matters", description: "We compare your home and daily routines with each departed resident’s preferences, space needs and boundaries. One promising connection cannot stand in for the others." },
  { mark: "G", label: "THE DEPARTED GROUP", title: "Company among the departed", description: "We review every relationship within a group, including shared history and time apart. Groups begin at two residents; a family or an existing group may need a larger placement." },
  { mark: "P", label: "PEOPLE + A MAINTAINED HOME", title: "A stable place to belong", description: "Living company connects departed residents with the present. An inhabited, maintained home offers a reliable setting, with private space, quiet hours and a supported way to leave." },
];

const agreements = [
  {
    number: "01",
    Icon: DoorOpen,
    title: "Protect private space",
    description: "Decide which rooms and moments belong to whom. A closed door is a boundary. So are personal belongings, private conversations, and time alone.",
  },
  {
    number: "02",
    Icon: Moon,
    title: "Set quiet hours",
    description: "Agree on quiet hours, shared spaces, and everyday routines. No one should have to guess when company is welcome.",
  },
  {
    number: "03",
    Icon: Heart,
    title: "Record everyone's agreement",
    description: "Record the household’s and every adult resident’s agreement separately. For a child, review guardian responsibility, age-appropriate assent and family continuity. Protect personal information and revisit boundaries together.",
  },
  {
    number: "04",
    Icon: Sprout,
    title: "Plan how a stay can end",
    description: "Make a relocation plan before a stay begins. If needs change or someone wants to leave, there should already be an agreed way forward.",
  },
];

export function WorldPage() {
 const art=useArtwork();
  return (
    <>
      <SiteHeader /><RegistryNotice/>
      <main id="main" className="world-page">
        <section className="world-intro" aria-labelledby="world-title">
          <nav className="world-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">The Overlap</span>
          </nav>
          <div className="world-hero">
            <div className="world-hero-copy">
              <p className="world-label"><span className="world-asterisk" aria-hidden="true">✳</span> GUIDANCE FOR HOUSEHOLDS</p>
              <h1 id="world-title">Living after<br /><em>the Overlap</em></h1>
              <p className="world-lead">The departed are visible again. Hearthafter helps households and spirits decide whether to share a home.</p>
              <p className="world-hero-description">Read how the Overlap began, how placements are reviewed, and what everyone must agree before a stay.</p>
              <a className="world-text-link" href="#the-overlap">How the Overlap began <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <figure className="world-figure">
              <div className="world-painting">{art?<Image src={art.overlapUrl} alt="A Northern Virginia town beneath transmission lines and an unusual luminous sky." width={1672} height={941} sizes="(max-width:600px) 90vw, 50vw"/>:<div className="art-placeholder">Loading illustration.</div>}</div>
              <figcaption><span className="world-figure-line" />Northern Virginia during the first days of the Overlap.<span className="world-figure-line" /></figcaption>
            </figure>
          </div>
          <div className="world-colophon"><span>OFFICE OF LIVING &amp; DEPARTED AFFAIRS</span><span><i aria-hidden="true" /> A FIELD GUIDE TO LIFE AFTER THE OVERLAP</span></div>
        </section>

        <section className="world-story world-section" id="the-overlap" aria-labelledby="overlap-title">
          <div className="world-section-heading">
            <p className="world-label">01 / THE OVERLAP</p>
            <h2 id="overlap-title">How the Overlap began</h2>
            <div className="world-margin-note"><BookOpen size={22} strokeWidth={1.3} aria-hidden="true" /><span>ASHBURN, VIRGINIA<br />WHERE IT ALL BEGAN</span></div>
          </div>
          <div className="world-story-copy">
            <p className="world-story-opening">The first sightings were reported near Ashburn, Virginia.</p>
            <p>Ashburn’s Data Center Alley concentrated an extraordinary demand for electricity. Unprecedented new power-generation systems, together with major transmission and grid infrastructure, were installed to supply its enormous data-center load.</p>
            <p>Something about that combination of generation technology, transmission infrastructure and extreme concentrated demand produced an unforeseen physical effect. The boundary between living and departed people became perceptible. The first widespread manifestations appeared along Northern Virginia’s data-center corridor, then spread outward as the Overlap. The precise mechanism remains unsettled.</p>
            <p>The Overlap made vast numbers of departed people visible at once, from ancient eras to recent memory. They returned with their habits, opinions and relationships intact. The living already had homes; suddenly those same streets and rooms held many more people, with conflicting routines, expectations and needs.</p>
            <p>Early reviews found that departed peer support reduced isolation and chaotic hauntings. Connection with living people helped residents remain anchored to the modern world; an occupied, maintained home supported wellbeing. To keep the peace, the Office of Living &amp; Departed Affairs has newly introduced Hearthafter: a voluntary placement programme that organizes shared homes and reviews expectations before anyone moves in.</p>

          </div>
        </section>

        <section className="world-consent" aria-labelledby="consent-title">
          <div className="world-consent-title">
            <p className="world-label">CONSENT AND REVIEW</p>
            <h2 id="consent-title">Hosting is <em>voluntary</em></h2>
            <p>No review is permission to enter someone’s home. Sharing a home depends on the household’s agreement and a separate review of every departed resident’s wishes and care needs.</p>
          </div>
          <div className="world-consent-points">
            <div><span>THE LIVING</span><p>Every household can decline.</p></div>
            <div><span>THE DEPARTED</span><p>Adults choose for themselves. Children need guardian review and age-appropriate assent.</p></div>
            <div><span>EVERYONE</span><p>A refusal ends this proposal. No departed resident is placed alone.</p></div>
          </div>
        </section>

        <section className="world-matching world-section" aria-labelledby="matching-title">
          <div className="world-wide-heading">
            <div><p className="world-label">02 / PLACEMENT REVIEW</p><h2 id="matching-title">How we review a group</h2></div>
            <p>The departed group contains at least two residents. We consider the home’s connection with each resident and every relationship within the group. Living households can be one person, a couple, a family or roommates.</p>
          </div>
          <div className="world-relationships">
            {relationships.map((relationship) => (
              <article className="world-relationship" key={relationship.mark}>
                <div className="world-relationship-top"><span className="world-relationship-mark" aria-hidden="true">{relationship.mark}</span><span className="world-label">{relationship.label}</span></div>
                <h3>{relationship.title}</h3>
                <p>{relationship.description}</p>
              </article>
            ))}
          </div>
          <div className="world-match-note"><span aria-hidden="true">✳</span><p>A suggestion opens a conversation. Adults decide individually; children need a safeguarding review with their guardian. Existing families should not be separated to fit a smaller proposal.</p></div>
        </section>

        <section id="ground-rules" className="world-rules" aria-labelledby="rules-title">
          <div className="world-rules-inner">
            <div className="world-rules-heading"><p className="world-label">03 / HOUSE AGREEMENT</p><h2 id="rules-title">Agree on the house rules</h2><p>Before a temporary stay, record the routines, boundaries, and exit plan everyone has agreed to.</p><div className="world-rules-stamp" aria-hidden="true"><span>HOUSEHOLD<br />AGREEMENT</span><Heart size={23} strokeWidth={1.2} /><em>By consent.</em></div></div>
            <div className="world-agreements">
              {agreements.map(({ number, Icon, title, description }) => (
                <article className="world-agreement" key={number}>
                  <div className="world-agreement-icon"><Icon size={23} strokeWidth={1.4} aria-hidden="true" /></div>
                  <div><span className="world-label">{number} / HOUSE AGREEMENT</span><h3>{title}</h3><p>{description}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="world-invitation world-section" aria-labelledby="invitation-title">
          <span className="world-invitation-star" aria-hidden="true">✳</span>
          <p className="world-label">NEXT STEPS</p>
          <h2 id="invitation-title">Start with <em>your household</em></h2>
          <p>Explore the departed profiles without applying, or describe your home to see possible groups and the reasons behind each suggestion.</p>
          <div className="world-invitation-actions"><Link href="/find" className="button button-primary">Explore possible groups <ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/spirits" className="world-text-link">Meet the spirits <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <span className="world-invitation-note">Requesting an introduction does not commit anyone to a placement.</span>
        </section>
      </main>
      <SiteFooter />
      <style>{`
        .world-page { overflow: hidden; }
        .world-painting{height:440px;border-radius:210px 210px 5px 5px;border:1px solid #adb89a;overflow:hidden;background:#243b30;margin:15px 0 18px}.world-painting img{width:100%;height:100%;object-fit:cover;object-position:50% 45%;display:block}@media(max-width:760px){.world-painting{height:330px}}@media(max-width:600px){.world-painting{height:360px}}
        .world-page .world-label { font: 9px/1.7 "IBM Plex Mono", monospace; letter-spacing: 1.45px; text-transform: uppercase; }
        .world-page .world-intro { max-width: 1440px; margin: 0 auto; padding: 0 7%; }
        .world-page .world-breadcrumb { display: flex; flex-wrap: wrap; gap: 12px; padding-top: 28px; font: 9px/1.5 "IBM Plex Mono", monospace; color: var(--muted); }
        .world-page .world-breadcrumb a:hover { color: var(--copper); }
        .world-page .world-breadcrumb > span[aria-hidden] { color: #a5aa98; }
        .world-page .world-hero { display: grid; grid-template-columns: 1.05fr 1fr; align-items: center; gap: 16px; padding: 42px 0 47px; }
        .world-page .world-hero-copy { position: relative; z-index: 1; padding: 10px 0 20px; }
        .world-page .world-hero-copy > .world-label { display: flex; align-items: center; gap: 10px; margin-bottom: 23px; }
        .world-page .world-asterisk { color: var(--copper); font-size: 23px; line-height: 1; }
        .world-page h1 { font-size: clamp(56px, 5.9vw, 88px); line-height: 1.04; letter-spacing: -1.6px; }
        .world-page .world-lead { font-size: 16px; line-height: 1.8; margin-top: 24px; }
        .world-page .world-hero-description { max-width: 330px; font-size: 12px; line-height: 1.85; margin: 14px 0 19px; color: var(--muted); }
        .world-page .world-text-link { display: inline-flex; align-items: center; justify-content: space-between; gap: 18px; padding: 9px 0; border-bottom: 1px solid #99a18f; font-size: 11px; font-weight: 600; }
        .world-page .world-text-link:hover { color: var(--copper); border-color: var(--copper); }
        .world-page .world-text-link svg { flex-shrink: 0; }
        .world-page .world-figure { position: relative; margin: 0; min-width: 0; width: 100%; padding-top: 18px; }
        .world-page .world-art-arch { position: absolute; inset: 4% 8% 13%; border: 1px solid #d1d3bd; border-radius: 49% 49% 2px 2px; background: linear-gradient(180deg, #e4e6d54a, #e4e6d593); }
        .world-page .world-art-arch::after { content: ""; position: absolute; inset: 12px; border: 1px solid #d1d3bd88; border-radius: inherit; }
        .world-page .world-art-label { position: relative; z-index: 1; text-align: center; font: 7px/1.8 "IBM Plex Mono", monospace; letter-spacing: 1.5px; color: var(--muted); padding-top: 21px; }
        .world-page .world-art-label span { display: block; color: var(--copper); font-size: 18px; margin-bottom: 5px; }
        .world-page .world-house { display: block; position: relative; width: 118%; height: auto; max-width: none; margin: -14px -9% -25px; }
        .world-page .world-figure figcaption { display: flex; justify-content: center; align-items: center; gap: 10px; position: relative; font: italic 16px/1.5 "Instrument Serif", Georgia, serif; text-align: center; padding-top: 5px; }
        .world-page .world-figure-line { width: 25px; height: 1px; background: #a4ac92; }
        .world-page .world-colophon { display: flex; justify-content: space-between; align-items: center; gap: 15px; border-top: 1px solid var(--line); padding: 20px 0; font: 8px/1.7 "IBM Plex Mono", monospace; letter-spacing: 1px; color: var(--muted); }
        .world-page .world-colophon > span:last-child { display: flex; gap: 8px; align-items: center; }
        .world-page .world-colophon i { width: 5px; height: 5px; background: var(--copper); border-radius: 50%; }
        .world-page .world-section { max-width: 1240px; padding: 75px 7%; margin: 0 auto; }
        .world-page h2 { font-size: clamp(40px, 4.2vw, 58px); line-height: 1.08; }
        .world-page .world-story { display: grid; grid-template-columns: 0.86fr 1.25fr; gap: 90px; padding-top: 69px; padding-bottom: 79px; }
        .world-page .world-section-heading h2 { margin-top: 20px; }
        .world-page .world-margin-note { display: flex; align-items: center; gap: 14px; margin-top: 38px; color: #586352; }
        .world-page .world-margin-note span { font: 8px/1.8 "IBM Plex Mono", monospace; letter-spacing: 1px; }
        .world-page .world-story-copy { padding-top: 1px; }
        .world-page .world-story-copy p { font-size: 13px; line-height: 1.95; color: var(--muted); margin-top: 19px; }
        .world-page .world-story-copy .world-story-opening { font: 29px/1.3 "Instrument Serif", Georgia, serif; color: var(--ink); margin-top: 0; letter-spacing: -.3px; }

        .world-page .world-consent { background: var(--pine); color: var(--paper-light); max-width: 1240px; margin: 0 auto; padding: 54px 7%; display: grid; grid-template-columns: 1.2fr 1fr; gap: 90px; position: relative; }
        .world-page .world-consent::before { content: ""; position: absolute; inset: 10px; border: 1px solid #f5f0e51c; pointer-events: none; }
        .world-page .world-consent .world-label { color: #d2d3ba; }
        .world-page .world-consent h2 { font-size: clamp(38px, 3.5vw, 49px); margin-top: 18px; }
        .world-page .world-consent h2 em { color: #e2bb86; }
        .world-page .world-consent-title > p:last-child { color: #d4d9c8; font-size: 12px; line-height: 1.9; margin-top: 20px; max-width: 390px; }
        .world-page .world-consent-points { align-self: center; }
        .world-page .world-consent-points > div { padding: 17px 0 19px; border-bottom: 1px solid #f5f0e530; }
        .world-page .world-consent-points > div:first-child { padding-top: 0; }
        .world-page .world-consent-points > div:last-child { border: 0; padding-bottom: 0; }
        .world-page .world-consent-points span { font: 8px/1.6 "IBM Plex Mono", monospace; letter-spacing: 1.2px; color: #d6c5a4; }
        .world-page .world-consent-points p { font-size: 13px; line-height: 1.7; margin-top: 6px; }
        .world-page .world-wide-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 45px; margin-bottom: 37px; }
        .world-page .world-wide-heading h2 { margin-top: 18px; }
        .world-page .world-wide-heading > p { max-width: 315px; font-size: 12px; line-height: 1.9; color: var(--muted); padding-bottom: 3px; }
        .world-page .world-relationships { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--line); }
        .world-page .world-relationship { padding: 28px 27px 12px 0; }
        .world-page .world-relationship + .world-relationship { padding-left: 27px; border-left: 1px solid var(--line); }
        .world-page .world-relationship:last-child { padding-right: 0; }
        .world-page .world-relationship-top { display: flex; align-items: center; gap: 13px; margin-bottom: 23px; }
        .world-page .world-relationship-mark { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 48px; height: 48px; border: 1px solid #b8bfa9; border-radius: 50%; font: italic 22px/1 "Instrument Serif", Georgia, serif; color: var(--copper-dark); background: #e9eada; }
        .world-page .world-relationship .world-label { font-size: 7px; letter-spacing: 1px; }
        .world-page h3 { font: 28px/1.17 "Instrument Serif", Georgia, serif; letter-spacing: -.25px; }
        .world-page .world-relationship p { font-size: 12px; line-height: 1.85; margin-top: 12px; color: var(--muted); }
        .world-page .world-match-note { display: flex; align-items: center; gap: 13px; border-top: 1px solid var(--line); margin-top: 23px; padding-top: 20px; }
        .world-page .world-match-note > span { color: var(--copper); font-size: 23px; }
        .world-page .world-match-note p { font-size: 11px; line-height: 1.8; color: var(--muted); }
        .world-page .world-rules { background: #e9ebdd; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .world-page .world-rules-inner { max-width: 1240px; margin: 0 auto; padding: 66px 7%; display: grid; grid-template-columns: 0.86fr 1.25fr; gap: 90px; }
        .world-page .world-rules-heading h2 { margin-top: 18px; }
        .world-page .world-rules-heading > p:last-of-type { font-size: 12px; line-height: 1.9; color: var(--muted); max-width: 255px; margin-top: 19px; }
        .world-page .world-rules-stamp { width: 148px; height: 148px; border: 1px solid #8d9a7f66; border-radius: 50%; margin: 40px 0 0 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; transform: rotate(-9deg); position: relative; }
        .world-page .world-rules-stamp::before { content: ""; position: absolute; inset: 6px; border: 1px dashed #8d9a7f66; border-radius: inherit; }
        .world-page .world-rules-stamp > span { font: 8px/1.7 "IBM Plex Mono", monospace; text-align: center; letter-spacing: 1px; }
        .world-page .world-rules-stamp em { font: italic 23px/1 "Instrument Serif", Georgia, serif; color: var(--copper); }
        .world-page .world-agreement { display: grid; grid-template-columns: 35px 1fr; gap: 19px; border-bottom: 1px solid #cdd3be; padding: 25px 0; }
        .world-page .world-agreement:first-child { padding-top: 0; }
        .world-page .world-agreement:last-child { padding-bottom: 0; border-bottom: 0; }
        .world-page .world-agreement-icon { padding-top: 22px; color: #6d7f62; }
        .world-page .world-agreement .world-label { font-size: 7px; color: #586352; }
        .world-page .world-agreement h3 { margin-top: 6px; font-size: 27px; }
        .world-page .world-agreement p { font-size: 12px; line-height: 1.85; color: var(--muted); margin-top: 9px; }
        .world-page .world-invitation { text-align: center; padding-top: 59px; padding-bottom: 68px; }
        .world-page .world-invitation-star { display: block; font-size: 33px; color: var(--copper); line-height: 1; margin-bottom: 23px; }
        .world-page .world-invitation h2 { margin-top: 18px; }
        .world-page .world-invitation > p:not(.world-label) { font-size: 13px; color: var(--muted); line-height: 1.8; margin-top: 20px; }
        .world-page .world-invitation-actions { display: flex; align-items: center; justify-content: center; gap: 28px; margin-top: 26px; }
        .world-page .world-invitation-note { display: block; font-size: 10px; line-height: 1.8; color: var(--muted); margin-top: 20px; }
        @media (min-width: 1440px) { .world-page .world-hero { padding-top: 55px; padding-bottom: 60px; } }
        @media (max-width: 1050px) { .world-page .world-intro { padding: 0 5%; } .world-page .world-hero { gap: 0; } .world-page .world-story, .world-page .world-rules-inner { gap: 50px; } .world-page .world-consent { gap: 50px; margin: 0 3%; padding-left: 6%; padding-right: 6%; } .world-page .world-section, .world-page .world-rules-inner { padding-left: 6%; padding-right: 6%; } .world-page .world-lead { font-size: 14px; } .world-page .world-figure figcaption { font-size: 14px; } }
        @media (max-width: 760px) { .world-page .world-hero { grid-template-columns: 1fr 0.85fr; padding-top: 30px; padding-bottom: 37px; } .world-page h1 { font-size: 55px; } .world-page .world-hero-copy > .world-label { font-size: 7px; letter-spacing: 1px; } .world-page .world-art-label { font-size: 5px; letter-spacing: 1px; padding-top: 15px; } .world-page .world-house { margin-top: -5px; margin-bottom: -13px; } .world-page .world-figure figcaption { font-size: 12px; gap: 6px; } .world-page .world-figure-line { width: 12px; } .world-page .world-colophon { font-size: 6px; letter-spacing: .8px; } .world-page .world-story, .world-page .world-rules-inner { gap: 32px; grid-template-columns: 0.9fr 1.15fr; } .world-page .world-story-copy p { font-size: 12px; } .world-page .world-story-copy .world-story-opening { font-size: 25px; } .world-page .world-consent { gap: 30px; } .world-page .world-consent h2 { font-size: 38px; } .world-page .world-consent-points p { font-size: 12px; } .world-page .world-relationship { padding-right: 18px; } .world-page .world-relationship + .world-relationship { padding-left: 18px; } .world-page .world-relationship-top { flex-direction: column; align-items: flex-start; gap: 12px; } .world-page h3 { font-size: 25px; } .world-page .world-relationship p { font-size: 11px; } .world-page .world-wide-heading { gap: 25px; } .world-page .world-wide-heading > p { max-width: 235px; } .world-page .world-agreement { gap: 10px; grid-template-columns: 25px 1fr; } .world-page .world-agreement h3 { font-size: 25px; } .world-page .world-agreement p { font-size: 11px; } }
        @media (max-width: 600px) { .world-page .world-intro { padding: 0 7%; } .world-page .world-breadcrumb { padding-top: 22px; font-size: 8px; } .world-page .world-hero { grid-template-columns: 1fr; padding: 34px 0 22px; gap: 5px; } .world-page h1 { font-size: clamp(50px, 12.6vw, 72px); letter-spacing: -1.4px; } .world-page .world-hero-copy { padding-bottom: 0; } .world-page .world-hero-copy > .world-label { margin-bottom: 20px; } .world-page .world-lead { font-size: 14px; margin-top: 20px; } .world-page .world-hero-description { max-width: 340px; margin-top: 12px; margin-bottom: 13px; } .world-page .world-figure { max-width: 390px; margin: 13px auto 0; padding-top: 6px; } .world-page .world-art-label { font-size: 6px; padding-top: 24px; letter-spacing: 1.2px; } .world-page .world-house { width: 111%; margin: -24px -5.5% -21px; } .world-page .world-figure figcaption { font-size: 15px; } .world-page .world-figure-line { width: 18px; } .world-page .world-colophon { display: block; padding: 17px 0; font-size: 7px; line-height: 1.9; } .world-page .world-colophon > span:last-child { margin-top: 5px; } .world-page .world-section { padding: 45px 7%; } .world-page .world-story { grid-template-columns: 1fr; gap: 26px; } .world-page h2 { font-size: 43px; letter-spacing: -1.2px; } .world-page .world-section-heading h2, .world-page .world-wide-heading h2 { margin-top: 14px; } .world-page .world-margin-note { margin-top: 20px; } .world-page .world-story-copy .world-story-opening { font-size: 27px; } .world-page .world-story-copy p { font-size: 12px; margin-top: 16px; } .world-page .world-consent { grid-template-columns: 1fr; gap: 28px; margin: 0 3%; padding: 36px 8%; } .world-page .world-consent h2 { font-size: 39px; } .world-page .world-consent .world-label { font-size: 7px; letter-spacing: 1.1px; } .world-page .world-consent-title > p:last-child { margin-top: 17px; } .world-page .world-consent-points > div { padding: 15px 0; } .world-page .world-consent-points p { font-size: 12px; } .world-page .world-wide-heading { display: block; margin-bottom: 26px; } .world-page .world-wide-heading > p { max-width: none; font-size: 12px; margin-top: 19px; } .world-page .world-relationships { display: block; } .world-page .world-relationship, .world-page .world-relationship + .world-relationship { padding: 25px 0; border-left: 0; border-bottom: 1px solid var(--line); } .world-page .world-relationship:last-child { padding-bottom: 4px; border-bottom: 0; } .world-page .world-relationship-top { flex-direction: row; align-items: center; margin-bottom: 16px; } .world-page .world-relationship .world-label { font-size: 8px; } .world-page .world-relationship h3 { font-size: 29px; } .world-page .world-relationship p { font-size: 12px; margin-top: 9px; } .world-page .world-match-note { align-items: flex-start; margin-top: 22px; gap: 12px; } .world-page .world-match-note p { font-size: 10px; } .world-page .world-rules-inner { grid-template-columns: 1fr; padding: 43px 7%; gap: 30px; } .world-page .world-rules-heading { position: relative; } .world-page .world-rules-heading > p:last-of-type { max-width: 220px; padding-right: 12px; } .world-page .world-rules-stamp { position: absolute; width: 100px; height: 100px; right: 0; bottom: -1px; margin: 0; gap: 5px; } .world-page .world-rules-stamp > span { font-size: 6px; } .world-page .world-rules-stamp svg { width: 18px; height: 18px; } .world-page .world-rules-stamp em { font-size: 18px; } .world-page .world-agreement { gap: 15px; grid-template-columns: 26px 1fr; padding: 23px 0; } .world-page .world-agreement:first-child { border-top: 1px solid #cdd3be; padding-top: 23px; } .world-page .world-agreement h3 { font-size: 28px; } .world-page .world-agreement p { font-size: 12px; } .world-page .world-invitation { padding-top: 43px; padding-bottom: 45px; } .world-page .world-invitation h2 { font-size: 39px; } .world-page .world-invitation h2 br { display: none; } .world-page .world-invitation > .world-label { font-size: 7px; letter-spacing: 1px; } .world-page .world-invitation-actions { flex-direction: column; gap: 15px; margin-top: 24px; } .world-page .world-invitation-note { font-size: 9px; max-width: 240px; margin: 19px auto 0; } }
        @media (max-width: 360px) { .world-page .world-rules-stamp { display: none; } .world-page .world-rules-heading > p:last-of-type { max-width: none; } .world-page .world-consent h2 { font-size: 35px; } }
      `}</style>
    </>
  );
}
