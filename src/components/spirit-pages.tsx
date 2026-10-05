'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, ChevronRight, Clock3, HeartHandshake, House, Info, Leaf, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react';
import { useHearth } from '@/components/hearth-provider';
import { ContentState, RegistryNotice, SiteFooter, SiteHeader, SourceBadge } from '@/components/site-shell';
import { SpiritPortrait } from '@/components/illustrations';
import type { HearthState, Spirit, SpiritHistory } from '@/lib/hearth/domain';
import styles from './spirit-pages.module.css';

const energyLabels = { quiet: 'Quiet routine', balanced: 'Balanced routine', lively: 'Lively routine' };
const companyLabels = { low: 'A little company', medium: 'Togetherness and time apart', high: 'Plenty of company' };
const presenceLabels = { day: 'Daytime', night: 'Night-time', both: 'Day and night' };
const consentLabels = { yes: 'Open to introductions', pending: 'Considering an introduction', no: 'Not seeking a placement' };
const publicRecordTitle = (title: string) => title.replace(/^Fictional in-world record:\s*/i, '');
const recordProvenance = (detail: string) => detail.match(/\n\s*\n(Record [A-Z0-9-]+\.[^\n]*)$/)?.[1];
const publicRecordDetail = (detail: string) => detail.replace(/\n\s*\nRecord [A-Z0-9-]+\.[^\n]*$/, '');
const titleCase = (value: string) => value ? value[0].toUpperCase() + value.slice(1) : value;
const clockTime = (hour: number) => `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;

const textParagraphs = (text: string) => text.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
const comparableText = (text: string) => text.replace(/\s+/g, ' ').trim();
const distinctParagraphs = (items: string[]) => [...new Map(items.flatMap(textParagraphs).map(text => [comparableText(text), text])).values()];
type SpokenStatement = { prompt: string; text: string };
function spokenStatement(text: string, prompt: string): SpokenStatement | null {
  const labeled = /^([^:\n]{1,60}):\s+([\s\S]+)$/.exec(text);
  if (labeled && ['An ordinary evening', 'A welcome question', 'Please do not ask'].includes(labeled[1])) return { prompt: labeled[1], text: labeled[2] };
  return /^["“]?(?:I(?:\s|['’])|My\s|We(?:\s|['’])|Our\s)/.test(text) ? { prompt, text } : null;
}
function ProfileProse({ items }: { items: string[] }) {
  return items.length ? <div className={styles.profileProse}>{items.flatMap(textParagraphs).map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}</div> : null;
}
function PersonalStatements({ name, statements }: { name: string; statements: SpokenStatement[] }) {
  return statements.length ? <figure className={styles.inTheirWords}><figcaption><strong>In their words</strong><span>{name}</span></figcaption>{statements.map((statement, index) => <div className={styles.spokenStatement} key={`${index}-${statement.text}`}><h4>{statement.prompt}</h4><blockquote>{textParagraphs(statement.text).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</blockquote></div>)}</figure> : null;
}
function PreferenceNotes({ items }: { items: string[] }) {
  const groups: ({ kind: 'paragraph'; text: string } | { kind: 'notes'; entries: { label: string; text: string }[] })[] = [];
  for (const text of items) {
    const labeled = /^([^:\n]{1,60}):\s+([\s\S]+)$/.exec(text);
    if (!labeled) { groups.push({ kind: 'paragraph', text }); continue; }
    const entry = { label: labeled[1], text: labeled[2] };
    const previous = groups[groups.length - 1];
    if (previous?.kind === 'notes') previous.entries.push(entry);
    else groups.push({ kind: 'notes', entries: [entry] });
  }
  return <>{groups.map((group, index) => group.kind === 'notes' ? <dl className={styles.preferenceNotes} key={index}>{group.entries.map((entry, entryIndex) => <div key={entryIndex}><dt>{entry.label}</dt><dd><ProfileProse items={[entry.text]} /></dd></div>)}</dl> : <ProfileProse key={index} items={[group.text]} />)}</>;
}
function RegistryDetails({ histories = [] }: { histories?: SpiritHistory[] }) {
  const { mode, error } = useHearth();
  return <details className={styles.demoDetails}><summary>Behind these records</summary><div><SourceBadge /><p>{error ? 'The last loaded profiles came from ' : 'Profiles come from '}{mode === 'sanity' ? 'the connected Sanity registry.' : 'the local sample register.'}</p><p>Profiles refer to shared history, trait, boundary and relationship records. Your household preferences and placement activity are saved in this browser; they are not sent to a placement service.</p><Link className="underlined-link" href="/about#behind-the-service">See how the registry works <ArrowUpRight size={14} aria-hidden="true" /></Link>{histories.map(history => <section key={history.id}><h3>{history.title}</h3><p>{history.sourceNote}</p><ul>{history.events.map((event, index) => <li key={`${history.id}-${index}`}>{event.date}: {event.title}{recordProvenance(event.detail) && <span> ({recordProvenance(event.detail)})</span>}</li>)}</ul></section>)}</div></details>;
}
function ConsentBadge({ consent }: { consent: Spirit['spiritConsent'] }) {
  return <span className={`${styles.consentBadge} ${consent === 'yes' ? styles.consentReady : styles.consentWaiting}`}><span aria-hidden="true" />{consentLabels[consent]}</span>;
}
function RegistryBreadcrumb({ name }: { name?: string }) {
  return <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={12} aria-hidden="true" />{name ? <><Link href="/spirits">Spirit register</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">{name}</span></> : <span aria-current="page">Spirit register</span>}</nav>;
}
function SpiritCard({ spirit }: { spirit: Spirit }) {
  return <article className={styles.card}>
    <Link href={`/spirits/${encodeURIComponent(spirit.id)}`} className={styles.cardArt} aria-label={`Read ${spirit.name}'s profile`}><SpiritPortrait kind={spirit.portrait} className={styles.cardPortrait} /><span className={styles.artLabel}>PUBLIC SPIRIT PROFILE</span></Link>
    <div className={styles.cardBody}><ConsentBadge consent={spirit.spiritConsent} /><p className={styles.occupation}>{spirit.formerOccupation}</p><h2><Link href={`/spirits/${encodeURIComponent(spirit.id)}`}>{spirit.name}</Link></h2><p className={styles.cardTagline}>{spirit.tagline}</p><p className={styles.cardSummary}>{spirit.summary}</p><div className={styles.tags}>{(spirit.tags?.length ? spirit.tags : spirit.interests).slice(0, 3).map(interest => <span key={interest}>{titleCase(interest)}</span>)}</div><div className={styles.cardFoot}><span><Leaf size={13} aria-hidden="true" />{energyLabels[spirit.energy]}</span><Link href={`/spirits/${encodeURIComponent(spirit.id)}`} aria-label={`Read profile: ${spirit.name}`}>Read profile <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>
  </article>;
}
export function SpiritsPage() {
  const { state } = useHearth();
  return <><SiteHeader /><main id="main" className={styles.page}><ContentState>{state && <><RegistryNotice /><SpiritRegister content={state} /><RegistryDetails /></>}</ContentState></main><SiteFooter /></>;
}
function SpiritRegister({ content }: { content: HearthState }) {
  const { loading } = useHearth();
  const [query, setQuery] = useState('');
  const [energy, setEnergy] = useState('all');
  const [interest, setInterest] = useState('all');
  const interests = useMemo(() => [...new Set(content.spirits.flatMap(spirit => spirit.interests))].sort(), [content.spirits]);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return content.spirits.filter(spirit => {
      const words = [spirit.name, spirit.formerOccupation, spirit.tagline, spirit.summary, ...spirit.interests].join(' ').toLocaleLowerCase();
      return (!search || words.includes(search)) && (energy === 'all' || spirit.energy === energy) && (interest === 'all' || spirit.interests.includes(interest));
    });
  }, [content.spirits, query, energy, interest]);
  const hasFilters = query !== '' || energy !== 'all' || interest !== 'all';
  const clearFilters = () => { setQuery(''); setEnergy('all'); setInterest('all'); };
  return <>
    <RegistryBreadcrumb />
    <header className={styles.directoryHero}><div><p className={styles.eyebrow}>OFFICE OF LIVING &amp; DEPARTED AFFAIRS / PUBLIC REGISTER</p><h1>Meet the <em>spirits</em></h1></div><div className={styles.heroAside}><BookOpen size={26} strokeWidth={1.2} aria-hidden="true" /><p>Read about each spirit's life, everyday routines, and requirements. Browse freely; no application or account is needed.</p><span>Public spirit profiles · Voluntary introductions</span></div></header>
    <div className={styles.principle}><ShieldCheck size={19} strokeWidth={1.5} aria-hidden="true" /><p>No departed resident is placed alone. Groups have at least two residents; sharing a home is always a choice.</p><Link href="/world#ground-rules">Read the ground rules <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    <section className={styles.registrySection} aria-labelledby="register-title"><div className={styles.registerHeading}><h2 id="register-title">Browse profiles</h2><p>Search by name, routine, or shared interest.</p></div>
      <form className={styles.filters} role="search" onSubmit={event => event.preventDefault()}><div className={styles.searchField}><label htmlFor="spirit-search">Search the register</label><div><Search size={17} aria-hidden="true" /><input id="spirit-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, interest, or former occupation" autoComplete="off" /></div></div><div className={styles.selectField}><label htmlFor="spirit-energy">Everyday rhythm</label><div><select id="spirit-energy" value={energy} onChange={event => setEnergy(event.target.value)}><option value="all">Every rhythm</option><option value="quiet">Quiet</option><option value="balanced">Balanced</option><option value="lively">Lively</option></select><ChevronDown size={14} aria-hidden="true" /></div></div><div className={styles.selectField}><label htmlFor="spirit-interest">Shared interests</label><div><select id="spirit-interest" value={interest} onChange={event => setInterest(event.target.value)}><option value="all">All interests</option>{interests.map(item => <option value={item} key={item}>{titleCase(item)}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></div></div></form>
      <div className={styles.resultsBar}><p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'spirit' : 'spirits'}{hasFilters ? ` of ${content.spirits.length}` : ''} in the register{loading ? ' · Refreshing' : ''}</p>{hasFilters && <button type="button" onClick={clearFilters}><X size={13} aria-hidden="true" /> Clear filters</button>}</div>
      {filtered.length > 0 ? <div className={styles.cardGrid}>{filtered.map(spirit => <SpiritCard key={spirit.id} spirit={spirit} />)}</div> : <div className={styles.empty}><SlidersHorizontal size={28} strokeWidth={1.2} aria-hidden="true" /><h3>{hasFilters ? 'No matching profiles' : 'No profiles available'}</h3><p>{hasFilters ? 'Try a different search term or clear a filter to see more profiles.' : 'Profiles will appear here when they are available.'}</p>{hasFilters && <button type="button" className="button" onClick={clearFilters}>Show all spirits <ArrowRight size={16} aria-hidden="true" /></button>}</div>}
    </section>
    <section className={styles.invitation}><div className={styles.invitationIcon}><House size={32} strokeWidth={1.25} aria-hidden="true" /></div><div><p className={styles.eyebrow}>HOUSEHOLD APPLICATION</p><h2>Find spirits for <em>your household</em></h2><p>Tell us about your routine, available space, and household boundaries. We will use your answers to suggest compatible departed groups and explain what fits, what needs discussion, and what rules an arrangement out.</p></div><Link className="button button-pine" href="/find">Explore placements <ArrowRight size={17} aria-hidden="true" /></Link></section>
  </>;
}
function PetPreference({ kind, comfort }: { kind: keyof Spirit['petCompatibility']; comfort: boolean | null }) {
  const pets = kind === 'other' ? 'other pets' : kind;
  const StatusIcon = comfort === true ? Check : comfort === false ? X : Info;
  return <p><StatusIcon size={14} aria-hidden="true" />{comfort === true ? `Comfortable with ${pets}` : comfort === false ? `A home without ${pets}` : `${titleCase(pets)}: introduction needed; comfort unknown`}</p>;
}
function ProfileList({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? <ul className={styles.profileList}>{items.map((item, index) => <li key={`${index}-${item}`}><span aria-hidden="true" />{item}</li>)}</ul> : <p className={styles.softText}>{empty}</p>;
}

export function SpiritProfilePage({ id }: { id: string }) {
  const { state } = useHearth();
  return <><SiteHeader /><main id="main" className={styles.page}><ContentState>{state && <><RegistryNotice /><SpiritProfile id={id} content={state} /></>}</ContentState></main><SiteFooter /></>;
}
function SpiritProfile({ id, content }: { id: string; content: HearthState }) {
  const { loading, error } = useHearth();
  const spirit = content.spirits.find(item => item.id === id);
  if (!spirit) return <><RegistryBreadcrumb name={loading ? 'Checking the register' : error ? 'Profile not checked' : 'Profile unavailable'} /><section className={styles.empty}><BookOpen size={32} strokeWidth={1.2} aria-hidden="true" /><p className={styles.eyebrow}>THE SPIRIT REGISTER</p><h1>{loading ? 'Checking the register' : error ? 'Unable to check this profile' : 'Profile unavailable'}</h1><p>{loading ? 'We are checking the current register for this profile.' : error ? 'The registry connection is interrupted, and this profile is not in the last loaded register. Try the connection again to check whether it is available.' : 'This profile is not in the current register. You can return to meet the spirits whose public profiles are available.'}</p><Link href="/spirits" className="button button-pine">Return to the register <ArrowRight size={16} aria-hidden="true" /></Link></section><RegistryDetails /></>;
  const traits = spirit.traitIds.flatMap(traitId => content.traits.filter(trait => trait.id === traitId));
  const boundaries = spirit.boundaryIds.flatMap(boundaryId => content.boundaries.filter(boundary => boundary.id === boundaryId));
  const histories = spirit.historyIds.flatMap(historyId => content.histories.filter(history => history.id === historyId));
  const relationships = content.pairRelationships.filter(relationship => relationship.spiritIds.includes(spirit.id));
  // Older registry entries stored this identity passage among personality contradictions.
  const identityHistory = distinctParagraphs(spirit.identityHistory ?? spirit.contradictions.filter(text => /older documents use different names and pronouns/i.test(text)));
  const identityKeys = new Set(identityHistory.map(comparableText));
  const contradictions = distinctParagraphs(spirit.contradictions).filter(text => !identityKeys.has(comparableText(text)));
  const dedicatedParagraphs = new Set([...identityHistory, ...contradictions, ...spirit.currentWants, ...spirit.quirks, ...spirit.rememberedObjects].flatMap(textParagraphs).map(comparableText));
  const paragraphs = distinctParagraphs([spirit.biography]).filter(paragraph => !dedicatedParagraphs.has(comparableText(paragraph)));
  const biographyKeys = new Set(paragraphs.map(comparableText));
  const statements = [...spirit.quirks.map(text => spokenStatement(text, 'A habit to know about')), ...spirit.currentWants.map(text => spokenStatement(text, 'What matters to me'))].filter((statement): statement is SpokenStatement => statement !== null);
  const everydayHabits = spirit.quirks.filter(text => spokenStatement(text, '') === null);
  const currentWants = spirit.currentWants.filter(text => spokenStatement(text, '') === null);
  return <><RegistryBreadcrumb name={spirit.name} />
    <header className={styles.profileHero}><div className={styles.profileArt}><SpiritPortrait kind={spirit.portrait} className={styles.largePortrait} /><div className={styles.portraitCaption}><span>THE PUBLIC SPIRIT REGISTER</span></div></div><div className={styles.profileIntro}><p className={styles.eyebrow}>SPIRIT PROFILE</p><h1>{spirit.name}</h1><p className={styles.profileMeta}>{spirit.pronouns}<span aria-hidden="true">·</span>{spirit.formerOccupation}</p><p className={styles.profileEra}>{spirit.origin ? `${spirit.origin} · ` : ""}{spirit.lifespan ?? spirit.era} · {spirit.ageAtPassing} at passing</p><blockquote>{spirit.quote ?? spirit.tagline}</blockquote><p className={styles.profileSummary}>{spirit.summary}</p><div className={styles.tags}>{traits.map(trait => <span key={trait.id} title={trait.description}>{trait.label}</span>)}</div><ConsentBadge consent={spirit.spiritConsent} /><div className={styles.profileActions}><Link href="/find" className="button button-primary">Find a household match <ArrowRight size={17} aria-hidden="true" /></Link><a href="#profile-story" className="underlined-link">Read their story <ChevronDown size={15} aria-hidden="true" /></a></div><p className={styles.consentFootnote}>An introduction does not reserve a spirit or commit anyone to a placement.</p></div></header>
    <div className={styles.profileColumns}><div className={styles.storyColumn}>
      <section id="profile-story" className={styles.profileSection}><p className={styles.eyebrow}>PROFILE DETAILS</p><h2>Life and <em>preferences</em></h2><p className={styles.sectionLead}>Read their history, daily habits, and what they want from a home.</p>{identityHistory.length > 0 && <section className={styles.identityNote} aria-labelledby="identity-introduction-title"><h3 id="identity-introduction-title">Identity and introduction</h3><ProfileProse items={identityHistory} /></section>}
        <details className={styles.accordion} open><summary><span><BookOpen size={19} strokeWidth={1.4} aria-hidden="true" />Life story</span><ChevronDown size={18} aria-hidden="true" /></summary><div className={styles.accordionBody}><div className={styles.biography}>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className={styles.keepsakes}><p className={styles.eyebrow}>REMEMBERED OBJECTS</p>{spirit.rememberedObjects.length ? <ProfileProse items={spirit.rememberedObjects} /> : <p className={styles.softText}>No remembered objects have been added to this profile.</p>}</div></div></details>
        <details className={styles.accordion}><summary><span><Leaf size={19} strokeWidth={1.4} aria-hidden="true" />Habits and preferences</span><ChevronDown size={18} aria-hidden="true" /></summary><div className={styles.accordionBody}><PersonalStatements name={spirit.name} statements={statements} />{everydayHabits.length > 0 && <><h3>Everyday habits</h3><ProfileProse items={everydayHabits} /></>}{contradictions.length > 0 && <><h3>Contradictions</h3><ProfileProse items={contradictions} /></>}{currentWants.length > 0 && <><h3>What they want now</h3><PreferenceNotes items={currentWants} /></>}{!spirit.currentWants.length && <p className={styles.softText}>Their current wishes have not yet been recorded.</p>}</div></details>
        <details className={styles.accordion}><summary><span><Clock3 size={19} strokeWidth={1.4} aria-hidden="true" />Registry history</span><ChevronDown size={18} aria-hidden="true" /></summary><div className={styles.accordionBody}>{histories.length ? histories.map(history => <article className={styles.history} key={history.id}><p className={styles.eyebrow}>{history.era}</p><h3>{history.title}</h3><ProfileProse items={textParagraphs(history.summary).filter(paragraph => !biographyKeys.has(comparableText(paragraph)))} /><ol className={styles.timeline}>{history.events.map((event, index) => <li key={`${history.id}-${index}`}><span>{event.date}</span><h4>{publicRecordTitle(event.title)}</h4><ProfileProse items={[publicRecordDetail(event.detail)]} /></li>)}</ol><p className={styles.sourceNote}>An old record does not override a person's stated identity or present wishes. Disputed attributions remain unresolved.</p></article>) : <p className={styles.softText}>The registry history has not yet been added.</p>}</div></details>
        <details className={styles.accordion}><summary><span><Users size={19} strokeWidth={1.4} aria-hidden="true" />Connections and common ground</span><ChevronDown size={18} aria-hidden="true" /></summary><div className={styles.accordionBody}>{spirit.affinityFacts.map(fact => <article className={styles.affinityFact} key={fact.id}><h3>{fact.label}</h3><p>{fact.detail}</p></article>)}{relationships.map(relationship => { const otherId = relationship.spiritIds.find(spiritId => spiritId !== spirit.id); const other = content.spirits.find(item => item.id === otherId); return <article className={styles.relationship} key={relationship.id}><p className={styles.eyebrow}>{relationship.status === 'friendly' ? 'A DOCUMENTED CONNECTION' : relationship.status === 'do-not-pair' ? 'A PAIRING BOUNDARY' : 'NOT YET ACQUAINTED'}</p><h3>{relationship.title}</h3><p>{relationship.description}</p>{other && <Link href={`/spirits/${encodeURIComponent(other.id)}`}>Meet {other.name} <ArrowUpRight size={15} aria-hidden="true" /></Link>}</article>; })}{!spirit.affinityFacts.length && !relationships.length && <p className={styles.softText}>No connections have been recorded in this public profile yet.</p>}<p className={styles.sourceNote}>A recorded connection is one part of a review. It does not establish a suitable household match on its own.</p></div></details>
        <details className={styles.accordion}><summary><span><HeartHandshake size={19} strokeWidth={1.4} aria-hidden="true" />Before an introduction</span><ChevronDown size={18} aria-hidden="true" /></summary><div className={styles.accordionBody}>{(spirit.introductionQuestions ?? []).length ? spirit.introductionQuestions.map(question => <article className={styles.relationship} key={question.id}><p className={styles.eyebrow}>{question.requiredForTrial ? 'AN ANSWER IS NEEDED BEFORE A TRIAL' : 'A QUESTION FOR YOUR CONVERSATION'}</p><h3>{question.question}</h3><p>{question.whyItMatters}</p></article>) : <p className={styles.softText}>The introduction will include a conversation about privacy, everyday routines, and what each person needs to feel comfortable.</p>}{(spirit.negotiablePreferences ?? []).map(preference => <article className={styles.relationship} key={preference.id}><p className={styles.eyebrow}>A PREFERENCE TO DISCUSS</p><h3>{preference.preference}</h3><p>{preference.possibleAgreement}</p></article>)}<p className={styles.sourceNote}>These are conversation points, not assumed agreements. A trial can begin only after required questions and individual decisions are recorded. Dependent residents need guardian permission and age-appropriate assent.</p></div></details>
      </section>
      <section className={styles.profileSection} aria-labelledby="boundaries-title"><p className={styles.eyebrow}>PLACEMENT REQUIREMENTS</p><h2 id="boundaries-title">Boundaries and <em>home needs</em></h2><p className={styles.sectionLead}>A proposed home must respect essential boundaries. Preferences marked open to discussion can be agreed together, and each person can decline.</p><div className={styles.boundaries}>{boundaries.length ? boundaries.map(boundary => <article key={boundary.id} className={styles.boundary}><ShieldCheck size={20} strokeWidth={1.4} aria-hidden="true" /><div><span>{boundary.kind === 'hard' ? 'ESSENTIAL BOUNDARY' : 'OPEN TO DISCUSSION'}</span><h3>{boundary.label}</h3><p>{boundary.description}</p></div></article>) : <p className={styles.softText}>No additional boundaries are listed here. Privacy, consent, and an agreed exit plan still apply to every placement.</p>}</div><div className={styles.homeNeeds}><h3>What a home needs to offer</h3><ProfileList items={spirit.homeNeeds} empty="Specific home needs will be discussed during review." /></div></section>
    </div><aside className={styles.profileSidebar} aria-label="Preferences and placement information"><section className={styles.atGlance}><p className={styles.eyebrow}>ROUTINE AND COMPANY</p><h2>At a glance</h2><dl><div><dt>Everyday rhythm</dt><dd>{energyLabels[spirit.energy]}</dd></div><div><dt>Company</dt><dd>{companyLabels[spirit.company]}</dd></div><div><dt>Usual presence</dt><dd>{presenceLabels[spirit.presence]}</dd></div><div><dt>Preferred company hours</dt><dd>{spirit.preferredHours?.length ? spirit.preferredHours.map(hours => `${clockTime(hours.start)} to ${clockTime(hours.end)}`).join("; ") : "To be discussed together"}</dd></div><div><dt>Audible routine</dt><dd>{spirit.audibleHours === 'none' ? 'No audible routine listed' : `${clockTime(spirit.audibleHours.start)} to ${clockTime(spirit.audibleHours.end)}`}</dd></div><div><dt>Quiet-hour arrangements</dt><dd>{spirit.quietHoursFlexibility === 'can-adjust' ? 'Adjustments can be discussed' : 'This routine is essential'}</dd></div><div><dt>Shared interests</dt><dd className={styles.tags}>{spirit.interests.map(item => <span key={item}>{titleCase(item)}</span>)}</dd></div></dl><div className={styles.petNotes}><h3>Resident pets</h3><PetPreference kind="cats" comfort={spirit.petCompatibility.cats} /><PetPreference kind="dogs" comfort={spirit.petCompatibility.dogs} /><PetPreference kind="other" comfort={spirit.petCompatibility.other} /><p>Arrange a calm first meeting with any pets before a stay.</p></div></section><section className={styles.consentCard}><HeartHandshake size={27} strokeWidth={1.3} aria-hidden="true" /><h2>Consent and review</h2><p>Living households choose whether to host. Each adult departed resident chooses whether to join them; dependent residents need guardian permission and age-appropriate assent. Decisions are confirmed again for the proposed group and home.</p><p>A declined introduction is a valid outcome. Reviews can be appealed, and every trial needs a way to end kindly.</p><Link href="/world#ground-rules">The shared ground rules <ArrowUpRight size={15} aria-hidden="true" /></Link></section></aside></div>
    <div className={styles.backToRegister}><Link href="/spirits"><ArrowRight size={16} className={styles.backArrow} aria-hidden="true" />Back to the spirit register</Link></div><RegistryDetails histories={histories} />
  </>;
}
