'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, CirclePlay, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react';

import styles from './intro-film.module.css';
import { OfficeMark, OfficeSeal } from './brand';

export type IntroFilmBeat = 'grid' | 'overlap' | 'review' | 'welcome' | 'hearth';
export type IntroFilmAssets = Partial<Record<IntroFilmBeat, string>>;
export type IntroFilmButtonProps = { assets?: IntroFilmAssets; className?: string; label?: string; disabled?: boolean };

const SCENE_DURATION = 12000;
const scenes: { id: IntroFilmBeat; label: string; caption: string }[] = [
  { id: 'grid', label: 'Northern Virginia', caption: 'Ashburn’s Data Center Alley demanded unprecedented electricity. New generation systems and transmission infrastructure were built to supply that immense, concentrated load.' },
  { id: 'overlap', label: 'The Overlap', caption: 'That combination produced an unforeseen physical effect. The boundary between living and departed became visible, first across Northern Virginia’s data-center corridor, then farther afield: the Overlap.' },
  { id: 'welcome', label: 'At the front door', caption: 'The departed arrived in vast numbers, from many eras. Streets and homes grew crowded with conflicting needs. Living neighbours and maintained homes could help, if everyone agreed.' },
  { id: 'review', label: 'A public service response', caption: 'The Office introduced a new voluntary placement programme to keep the peace. No departed resident is placed alone: groups begin at two. Every resident’s wishes and boundaries shape review.' },
  { id: 'hearth', label: 'Hearthafter', caption: 'Meet the departed, explore a possible household, and agree a supported trial. A suggestion is an introduction, never permission to move in. Good company. A place to haunt.' },
];
const FILM_DURATION = scenes.length * SCENE_DURATION;

function FilmSeal(){return <OfficeSeal/>}
function PowerNetwork(){return <svg className={styles.powerNetwork} viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true"><g className={styles.networkBase}><path d="M0 290 180 250 310 305 470 240 640 265 790 210 1000 260M0 330 180 285 310 340 470 275 640 300 790 245 1000 295M180 250 180 400 250 430M470 240 470 390 600 430M790 210 790 360 950 400"/><path d="m165 225 15-36 15 36-28 160h26m-34-120h42m-48 42h54m-62 42h70m-47-90 35 42-43 42 51 39M455 217l15-36 15 36-28 160h26m-34-120h42m-48 42h54m-62 42h70m-47-90 35 42-43 42 51 39M775 187l15-36 15 36-28 160h26m-34-120h42m-48 42h54m-62 42h70m-47-90 35 42-43 42 51 39"/></g><g className={styles.networkSignal}><path pathLength="1" d="M0 290 180 250 310 305 470 240 640 265 790 210 1000 260"/><path pathLength="1" d="M0 330 180 285 310 340 470 275 640 300 790 245 1000 295"/></g><g className={styles.networkNodes}>{[[180,250],[470,240],[790,210]].map(([x,y])=><g key={x}><circle cx={x} cy={y} r="5"/><circle cx={x} cy={y} r="13" fill="none"/></g>)}</g></svg>}
function SceneArt({ beat, assets }: { beat: IntroFilmBeat; assets: IntroFilmAssets }) {
 const landscape=assets.overlap||assets.grid;const porch=assets.welcome||assets.hearth;
 if(beat==='grid')return <div className={styles.newsScene} aria-hidden="true">{landscape&&<Image src={landscape} alt="" fill sizes="(max-width: 680px) 100vw, 1010px" loading="eager" className={styles.gridBackdrop}/>}<div className={styles.cartographicGrid}/><PowerNetwork/><div className={styles.archiveTag}>OFFICE ARCHIVE / FIELD REEL 01</div><div className={styles.locationTitle}><span>ASHBURN / DATA CENTER ALLEY</span><strong>Northern<br/><em>Virginia.</em></strong></div><span className={styles.mapFoot}>GENERATION + TRANSMISSION / CONCENTRATED DEMAND</span><div className={styles.frameCorners}/></div>;
 if(beat==='overlap')return <div className={styles.newsScene} aria-hidden="true">{landscape&&<Image src={landscape} alt="" fill sizes="(max-width: 680px) 100vw, 1010px" loading="eager" className={styles.overlapBackdrop}/>}<div className={styles.cinemaShade}/><svg className={styles.aurora} viewBox="0 0 1000 480" preserveAspectRatio="none" fill="none"><path pathLength="1" d="M-60 155C100-70 200 235 360 75S610 220 760 90 1000 70 1070 150"/><path pathLength="1" d="M-60 180C100-40 200 260 360 100S610 245 760 115 1000 95 1070 175"/></svg><span className={styles.archiveTag}>FIELD OBSERVATION / NO PREVIOUS RECORD</span><div className={styles.overlapTitle}><span>AND THEN</span><strong>The Overlap.</strong></div><div className={styles.frameCorners}/></div>;
 if(beat==='welcome')return <div className={styles.newsScene} aria-hidden="true">{porch&&<Image src={porch} alt="" fill sizes="(max-width: 680px) 100vw, 1010px" loading="eager" className={styles.porchBackdrop}/>}<div className={styles.arrivalVeil}/><div className={styles.cinemaShade}/><span className={styles.archiveTag}>HOME & COMMUNITY / FIRST INTRODUCTIONS</span><div className={styles.porchNote}><span>AT THE FRONT DOOR</span><strong>A living home<span className={styles.arrivalCount}>+ departed company</span></strong></div><div className={styles.porchRule}/><div className={styles.frameCorners}/></div>;
 if(beat==='review')return <div className={styles.bulletinScene} aria-hidden="true"><div className={styles.bulletinBacking}/><article className={styles.bulletin}><header><FilmSeal/><span>OFFICE OF LIVING &<br/>DEPARTED AFFAIRS</span><small>PUBLIC<br/>BULLETIN 01</small></header><div className={styles.bulletinRule}/><span className={styles.bulletinKicker}>RESPONSE TO THE OVERLAP</span><h3>Sharing a home<br/>requires agreement.</h3><div className={styles.threeDecisions}><span><i/>The household</span><span><i/>Each resident</span><span><i/>A shared plan</span></div><p>Participation is voluntary.<br/>No departed resident placed alone.</p><span className={styles.bulletinStamp}>VOLUNTARY<br/>PLACEMENT</span></article><span className={styles.bulletinMargin}>OLDA / RESIDENTIAL PLACEMENT</span></div>;
 return <div className={styles.serviceScene}><div className={styles.servicePaper}><div className={styles.serviceTop}><FilmSeal/><span>OFFICE OF LIVING &<br/>DEPARTED AFFAIRS</span><small>RESIDENTIAL<br/>PLACEMENT</small></div><div className={styles.serviceOpening}><span className={styles.bulletinKicker}>APPLICATIONS OPEN</span><h3>Hearth<em>after.</em></h3><p>Tell us about your household.<br/>We will help you make an introduction.</p><Link href="/find" className={styles.filmApply}>Begin host application <ArrowRight size={17}/></Link></div><div className={styles.serviceVisual} aria-hidden="true">{porch&&<Image src={porch} alt="" fill sizes="(max-width: 460px) 35vw, (max-width: 680px) 45vw, 480px" loading="eager"/>}<span>GOOD COMPANY.<br/>A PLACE TO HAUNT.</span></div><div className={styles.serviceBottom}><span>01 / YOUR HOUSEHOLD</span><span>02 / THE RESIDENTS</span><span>03 / A SHARED PLAN</span></div></div></div>;
}

export function IntroFilmButton({ assets = {}, className, label = 'Watch the Overlap', disabled = false }: IntroFilmButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const elapsedRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const captionId = useId();
  const currentIndex = Math.max(0, Math.min(scenes.length - 1, Math.floor(elapsed / SCENE_DURATION)));
  const scene = scenes[currentIndex];
  const finished = elapsed >= FILM_DURATION;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(preference.matches); if (preference.matches) setPlaying(false); };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open || !playing || reducedMotion) return;
    const startedAt = performance.now() - elapsedRef.current;
    let frame=0,lastPaint=0;
    const tick=(now:number)=>{
      const next=Math.max(0,Math.min(FILM_DURATION,now-startedAt));
      elapsedRef.current=next;
      stageRef.current?.style.setProperty('--scene-time', `${next>=FILM_DURATION?SCENE_DURATION:next%SCENE_DURATION}ms`);
      if(now-lastPaint>=80||next===FILM_DURATION){setElapsed(next);lastPaint=now;}
      if(next>=FILM_DURATION)setPlaying(false);else frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    const onVisibility=()=>{if(document.hidden)setPlaying(false);};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',onVisibility);};
  }, [open, playing, reducedMotion, run]);

  const seek = (position: number) => {
    elapsedRef.current = Math.max(0, Math.min(FILM_DURATION, position));
    setElapsed(elapsedRef.current);
    setRun(value => value + 1);
  };
  const launch = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduced);
    seek(0);
    setOpen(true);
    setPlaying(!reduced);
    dialogRef.current?.showModal();
    closeRef.current?.focus();
  };
  const close = () => { dialogRef.current?.close(); };
  const onClosed = () => { setOpen(false); setPlaying(false); triggerRef.current?.focus(); };
  const replay = () => { seek(0); setPlaying(!reducedMotion); };
  const selectScene = (index: number) => { seek(index * SCENE_DURATION); setPlaying(false); };
  useEffect(()=>{const local=elapsed>=FILM_DURATION?SCENE_DURATION:elapsed%SCENE_DURATION;stageRef.current?.style.setProperty('--scene-time', `${!playing&&local===0?SCENE_DURATION:local}ms`);},[currentIndex,playing,elapsed]);

  return <>
    <button ref={triggerRef} type="button" disabled={disabled} className={className ?? styles.trigger} onClick={launch}><CirclePlay size={18} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span><span className={styles.duration}>1:00</span></button>
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onClose={onClosed}>
      <div className={styles.film}>
        <header className={styles.header}><div><p className={styles.eyebrow}><OfficeMark /> OFFICE OF LIVING &amp; DEPARTED AFFAIRS</p><h2 id={titleId}>The Overlap</h2></div><div className={styles.topControls}>{!reducedMotion && <button type="button" className={styles.filmPause} onClick={() => finished ? replay() : setPlaying(value => !value)} aria-label={finished ? 'Replay introduction' : playing ? 'Pause introduction' : 'Play introduction'}>{playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}<span>{finished ? 'Replay' : playing ? 'Pause' : 'Play'}</span></button>}<button type="button" className={styles.skip} onClick={close}>Skip introduction <SkipForward size={15} aria-hidden="true" /></button><button ref={closeRef} type="button" className={styles.close} onClick={close} aria-label="Close introduction"><X size={20} aria-hidden="true" /></button></div></header>
        <p id={descriptionId} className={styles.filmDescription}>OFFICE ARCHIVE / A ONE-MINUTE FIELD FILM / CAPTIONED, WITHOUT SOUND</p>
        <div ref={stageRef} className={styles.stage} key={scene.id} data-paused={!playing || reducedMotion} data-scene={scene.id}><div className={styles.visualFrame}><SceneArt beat={scene.id} assets={assets} /></div><div className={styles.narrativeOverlay} data-film-caption><span className={styles.sceneLabel}>0{currentIndex + 1} / 05 · {scene.label}</span><p id={captionId} className={styles.caption} aria-live="polite" aria-atomic="true">{scene.caption}</p></div></div>
        <nav className={styles.scenes} aria-label="Introduction scenes">{scenes.map((item, index) => <button key={item.id} type="button" aria-label={`Scene ${index + 1}: ${item.label}`} aria-current={index === currentIndex ? 'step' : undefined} onClick={() => selectScene(index)}><span className={styles.sceneTrack}><span style={{ width: `${Math.max(0, Math.min(100, (elapsed - index * SCENE_DURATION) / SCENE_DURATION * 100))}%` }} /></span><span className={styles.stepNumber}>0{index + 1}</span></button>)}</nav>
        <footer className={styles.controls}><div className={styles.playbackControls}><button type="button" className={styles.replay} onClick={replay}><RotateCcw size={14} aria-hidden="true" /> Start again</button>{!reducedMotion && <span className={styles.timer} aria-label={`${Math.floor(elapsed / 1000)} of 60 seconds`}>{Math.floor(elapsed / 60000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')} / 1:00</span>}</div><div className={styles.stepControls}><button type="button" disabled={currentIndex === 0} onClick={() => selectScene(currentIndex - 1)} aria-label="Previous scene"><ArrowLeft size={16} aria-hidden="true" /></button><span>Scene {currentIndex + 1} of 5</span><button type="button" disabled={currentIndex === scenes.length - 1} onClick={() => selectScene(currentIndex + 1)} aria-label="Next scene"><ArrowRight size={16} aria-hidden="true" /></button></div></footer>
        {reducedMotion && <p className={styles.motionNote}>Reduced motion is on. Use the scene controls to read at your own pace.</p>}<details className={styles.filmTranscript}><summary>Read the full transcript</summary><ol>{scenes.map(item=><li key={item.id}><strong>{item.label}.</strong> {item.caption}</li>)}</ol><Link href="/find" className="underlined-link">Begin host application <ArrowRight size={14}/></Link></details>
      </div>
    </dialog>
  </>;
}
