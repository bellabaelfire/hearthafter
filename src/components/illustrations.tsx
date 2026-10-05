'use client';
import {getImageProps} from "next/image";
import {useArtwork} from "./use-artwork";

import { useId } from 'react';

const INK = '#263e37';
const CREAM = '#f4ecd9';
const GOLD = '#d4ad61';
const RUST = '#b87151';

type IllustrationProps = { className?: string };

function Sprig({ x, y, scale = 1, flip = false, color = '#527365' }: { x: number; y: number; scale?: number; flip?: boolean; color?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} stroke={INK} strokeWidth="1.15" strokeLinejoin="round">
    <path d="M0 0q-4-40 7-85" fill="none" />
    <path d="M0-14q-26-4-27-20 25-1 27 20m1-16q24-4 26-22-23 0-26 22m1-17q-23-4-24-19 22 0 24 19m2-13q20-4 24-21-22 1-24 21m2-15Q-7-87 6-101q11 15 0 26Z" fill={color} />
    <path d="M-2-17l-18-12M4-35l16-10M1-49l-16-11M7-65l15-10M7-80v-14" stroke={CREAM} strokeWidth="0.65" opacity="0.5" />
  </g>;
}

function Lantern({ x, y, size = 1, glow }: { x: number; y: number; size?: number; glow: string }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <circle cx="0" cy="10" r="24" fill={`url(#${glow})`} opacity="0.55" />
    <path d="M0-23v7m-10 7L0-18 10-9-10-9Z" fill={INK} stroke={INK} strokeWidth="1.4" />
    <path d="M-10-8h20l-3 27H-7Z" fill="#f6cc7b" stroke={INK} strokeWidth="2" />
    <path d="M0-7v26m-9-12H9M-7 19H7M-4 23h8" stroke={INK} strokeWidth="1.3" />
    <path d="M-4-4v9" stroke={CREAM} strokeWidth="1.8" opacity="0.8" />
  </g>;
}

function WelcomingHost({ x, y, second = false }: { x: number; y: number; second?: boolean }) {
  const skin = second ? '#aa7656' : '#dbaf89';
  return <g transform={`translate(${x} ${y}) scale(${second ? -1 : 1} 1)`} stroke={INK} strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="0" cy="132" rx="25" ry="4" fill={INK} opacity="0.17" stroke="none" />
    {second ? <>
      <path d="M-17 80h34l-2 46H3l-3-33-4 33h-13Z" fill="#657065" strokeWidth="1.25" />
      <path d="M-17 123h12v9h-20q-1-6 8-9m20 0h12l9 7v2H3Z" fill="#34483e" strokeWidth="1.1" />
    </> : <>
      <path d="M-10 111h8v15h-8m15-15h8v15H5" fill={skin} strokeWidth="1" />
      <path d="M-11 123h9v9h-18q0-6 9-9m16 0h9l7 6v3H5Z" fill="#475a46" strokeWidth="1.1" />
      <path d="M-17 76h34l7 40q-22 7-47 0Z" fill="#476250" strokeWidth="1.3" /><path d="M-11 88l-3 24m26-24 3 24" stroke="#97a182" strokeWidth="0.8" />
    </>}
    <path d="M-7 28v12q7 7 14 0V28" fill={skin} strokeWidth="1" />
    <path d="M-19 41-29 60-43 54-48 63l23 11q5 1 8-5l6-12m29-16 12 24-3 19-10-1 1-17-7-13" fill={second ? '#527463' : '#b97b56'} strokeWidth="1.3" />
    <path d="m-44 55-5-5-5 1 3 4-7-2-2 3 12 8 4-2m61 21-2 7 3 5 5-2 3-9Z" fill={skin} strokeWidth="1" />
    <path d="M-8 36-19 42l3 43q16 6 34 0l1-43-12-6Z" fill={second ? '#527463' : '#b97b56'} strokeWidth="1.3" />
    <path d="m-8 36 8 9 7-9 5 7-11 37-12-37Z" fill="#e9d6ae" strokeWidth="0.9" />
    <path d="M0 45v38m-8-42 8 4 8-4" strokeWidth="0.8" fill="none" />
    <path d="M7 48v12" stroke="#e8dfb7" strokeWidth="1.2" /><rect x="4" y="58" width="9" height="7" rx="1" fill="#e9d6ae" strokeWidth="0.8" /><path d="M6 61h5m-5 2h3" strokeWidth="0.5" />
    <ellipse cx="0" cy="16" rx="13" ry="17" fill={skin} strokeWidth="1.25" />
    {second ? <><path d="M-13 16c-6-15 4-24 15-22 10 0 17 12 11 23l-3-10-7-5-15 7Z" fill="#38463a" strokeWidth="1" /><path d="M-11 3q9-8 18-1" stroke="#65715c" strokeWidth="0.7" fill="none" /></> : <><path d="M-13 18c-5-8-5-21 6-23 10-7 24 2 22 14l-4 8-2-11q-13 3-18-4-2 7-4 9Z" fill="#a7b09a" strokeWidth="1" /><circle cx="14" cy="3" r="6" fill="#a7b09a" strokeWidth="0.9" /><path d="M-10 2q10-5 18 3" stroke={CREAM} strokeWidth="0.65" fill="none" /></>}
    <path d="M-8 13h4m7 0h4" strokeWidth="1.1" /><path d="M-1 15l-2 6 4 1m-5 4q5 4 9-1" fill="none" strokeWidth="0.9" />
    {!second && <><circle cx="-6" cy="15" r="4" stroke="#716b48" strokeWidth="0.7" /><circle cx="6" cy="15" r="4" stroke="#716b48" strokeWidth="0.7" /><path d="M-2 15h4" stroke="#716b48" strokeWidth="0.7" /></>}
    <path d="M-14 50l-2 19m30-17 2 18" stroke={second ? '#89a28b' : '#dbad7e'} strokeWidth="0.75" fill="none" />
  </g>;
}

function PorchSpirit({ x, y, second = false }: { x: number; y: number; second?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${second ? -1 : 1} 1)`} opacity="0.82" stroke="#6f8875" strokeLinecap="round" strokeLinejoin="round">
    <path d="M-11 30c-21 6-25 25-20 47 4 21-6 23-13 29 16 2 21-8 28-6 9 2 8 13 23 12 13 0 19-9 29-9-20-10-16-22-15-39 1-19-5-28-18-33Z" fill="#e2e6cf" strokeWidth="1.25" />
    <path d="M-20 72q9 20 1 28m22-23q-6 20 12 27" fill="none" stroke="#b5c4a9" strokeWidth="0.9" />
    <path d="M17 44q9 14 21 7l7-7 5 3-7 13q-19 13-33-2" fill="#e2e6cf" strokeWidth="1.15" />
    <path d="m42 47 1-7 4-1 2 5 4-3 2 3-6 7" fill="#e2e6cf" strokeWidth="0.9" />
    <path d="M-14 36-21 44l8 9-5 12 14 23 13-22-4-12 8-10-9-9" fill={second ? '#becfb9' : '#d3cfad'} strokeWidth="0.9" />
    <path d="M-5 37v45" strokeWidth="0.75" /><circle cx="-2" cy="59" r="1.2" fill="#95a588" stroke="none" /><circle cx="-2" cy="70" r="1.2" fill="#95a588" stroke="none" />
    <ellipse cy="17" rx="15" ry="20" fill="#e9ecd9" strokeWidth="1.2" />
    {second ? <><path d="M-14 15q-8-19 7-22 15-8 25 9-3 11-5 14l-2-12q-15 6-21-2Z" fill="#bfceb9" strokeWidth="0.9" /><path d="M-10 33q10 8 21-1" stroke="#a6b89f" strokeWidth="0.9" fill="none" /></> : <><path d="M-17 5q18-11 35 1l-3 7-32-1Z" fill="#afbea7" strokeWidth="1" /><path d="M-11 5l2-14q10-6 20 1l4 13" fill="#c2cdb1" strokeWidth="1" /></>}
    <path d="M-9 16h4m9 0h4M0 18l-2 5 4 1m-6 5q5 4 9-1" fill="none" stroke={INK} strokeWidth="1" />
  </g>;
}
function HouseWindow({ x, y, width = 53, height = 80, glow, shutters = false }: { x: number; y: number; width?: number; height?: number; glow: string; shutters?: boolean }) {
  const arch = width / 2;
  return <g transform={`translate(${x} ${y})`} stroke={INK} strokeLinejoin="round">
    {shutters && <g fill="#547166" strokeWidth="1.6"><path d={`M-15 8h11v${height - 4}h-11Z`} /><path d={`M${width + 4} 8h11v${height - 4}h-11Z`} />{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M-13 ${17 + i * 8}h7m${width + 10} 0h7`} strokeWidth="0.8" />)}</g>}
    <path d={`M-5 ${height + 3}V${arch}a${arch + 5} ${arch + 5} 0 0 1 ${width + 10} 0v${height - arch + 3}Z`} fill="#e5c49b" strokeWidth="1.8" />
    <path d={`M0 ${height}V${arch}a${arch} ${arch} 0 0 1 ${width} 0v${height - arch}Z`} fill={`url(#${glow})`} strokeWidth="1.5" />
    <path d={`M${arch} 0v${height}M0 ${arch + 11}h${width}M0 ${height - 21}h${width}`} fill="none" strokeWidth="2" />
    <path d={`M4 ${arch + 15}q8 8 9 ${height - arch - 20}M${width - 4} ${arch + 15}q-8 8-9 ${height - arch - 20}`} fill="none" stroke="#bc895e" strokeWidth="4" opacity="0.6" />
    <path d={`M-9 ${height + 4}h${width + 18}v6H-9Z`} fill="#d0b18a" strokeWidth="1.5" />
    <path d={`M6 ${arch - 2}q0-12 10-16`} stroke={CREAM} strokeWidth="2" opacity="0.7" fill="none" />
  </g>;
}

export function HearthHouse({ className }: IllustrationProps) {
  const id = `hearth-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const windowGlow = `${id}-window`;
  const halo = `${id}-halo`;
  return <svg className={className} viewBox="0 0 1000 800" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#cc9775" /><stop offset="0.55" stopColor="#b6795b" /><stop offset="1" stopColor="#a6674d" /></linearGradient>
      <linearGradient id={`${id}-roof`} x1="0" y1="0" x2="0.75" y2="1"><stop stopColor="#547b70" /><stop offset="0.6" stopColor="#31594f" /><stop offset="1" stopColor="#203d36" /></linearGradient>
      <linearGradient id={windowGlow} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f5d68e" /><stop offset="0.55" stopColor="#edba60" /><stop offset="1" stopColor="#c38d49" /></linearGradient>
      <radialGradient id={halo}><stop stopColor="#efc674" stopOpacity="0.8" /><stop offset="0.45" stopColor="#e6be71" stopOpacity="0.25" /><stop offset="1" stopColor="#e6be71" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-atmosphere`}><stop stopColor="#d3d7ba" stopOpacity="0.5" /><stop offset="0.7" stopColor="#c3cba9" stopOpacity="0.15" /><stop offset="1" stopColor="#c3cba9" stopOpacity="0" /></radialGradient>
      <pattern id={`${id}-grain`} width="37" height="31" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r="0.7" fill={INK} /><circle cx="24" cy="19" r="0.7" fill={INK} /><circle cx="13" cy="29" r="0.5" fill={CREAM} /><path d="M8 18l2-1m21-13 2 1m-13 7 1 2" stroke={INK} strokeWidth="0.5" /></pattern>
      <pattern id={`${id}-scales`} width="33" height="22" patternUnits="userSpaceOnUse"><path d="M-16.5 0q16.5 23 33 0m0 0q16.5 23 33 0M0 11q16.5 23 33 0" stroke="#97aa87" strokeWidth="0.9" opacity="0.55" fill="none" /></pattern>
      <pattern id={`${id}-bricks`} width="43" height="21" patternUnits="userSpaceOnUse"><path d="M0 20h43M22 0v20M0 0v20" stroke="#623f32" strokeWidth="0.8" opacity="0.55" /><path d="M3 3h15m7 0h14" stroke="#e0b48c" strokeWidth="0.7" opacity="0.7" /></pattern>
      <clipPath id={`${id}-roof-main`}><path d="M319 371 494 174l179 197q-88-16-179-12-87-3-175 12Z" /></clipPath>
      <clipPath id={`${id}-roof-left`}><path d="m177 474 119-158 137 161q-59-13-126-10-67-3-130 7Z" /></clipPath>
      <clipPath id={`${id}-roof-tower`}><path d="m635 247 55-148 70 155-66-14Z" /></clipPath>
    </defs>

    <ellipse cx="527" cy="414" rx="393" ry="332" fill={`url(#${id}-atmosphere)`} opacity="0.5" />
    <g opacity="0.82"><circle cx="747" cy="164" r="76" fill="#e6cea0" /><circle cx="758" cy="154" r="61" stroke="#bfae83" strokeWidth="0.65" /><path d="M726 98q-55 42-31 105m62-112q-62 33-52 119" stroke={CREAM} strokeWidth="1" opacity="0.7" /><circle cx="725" cy="133" r="10" fill="#d5be93" opacity="0.55" /><circle cx="777" cy="197" r="17" fill="#d5be93" opacity="0.4" /><circle cx="758" cy="110" r="4" fill="#d5be93" opacity="0.7" /></g>
    <g stroke="#819081" strokeWidth="1" opacity="0.65" strokeLinecap="round"><path d="M310 172v12m-6-6h12M573 82v14m-7-7h14M838 290v10m-5-5h10M179 358v10m-5-5h10M827 116v8m-4-4h8M436 111v7m-3.5-3.5h7" /><circle cx="233" cy="259" r="1.5" fill="#819081" /><circle cx="861" cy="223" r="1.5" fill="#819081" /><circle cx="534" cy="132" r="1.5" fill="#819081" /><circle cx="357" cy="254" r="1.5" fill="#819081" /></g>

    <g stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      <path d="M150 685q12-31 86-43 145-25 281-21 194-4 320 52 34 14 9 30-331 95-696-18Z" fill="#aab59a" stroke="none" opacity="0.45" />
      <path d="M189 684q206-40 398-20 114 3 223 26" stroke="#829277" strokeWidth="1" opacity="0.7" />
      <path d="M488 642q-83 41-26 65t-30 60h142q78-44 7-69t-41-56Z" fill="#dfcea9" stroke="#a69c7d" strokeWidth="1.2" />
      <path d="M486 663q-42 29-4 38t37 24m-33 23q45-23 10-37m16 47q54-35 14-50" stroke="#b9aa87" strokeWidth="0.8" />
      <path d="M520 230V129h48v140" fill={RUST} strokeWidth="2.3" />
      <path d="M520 230V129h48v140" fill={`url(#${id}-bricks)`} stroke="none" />
      <path d="M514 121h60v13h-60Z" fill="#b78b69" strokeWidth="2" />
      <path d="M530 115v-14h10v14m12 0v-14h10v14" fill="#6b6e56" strokeWidth="1.5" />
      <path d="M539 94q-27-20-5-43t-7-32m30 73q-11-17 4-32t2-25" fill="none" stroke="#9caa95" strokeWidth="2" opacity="0.45" />

      <path d="M646 241h94v384l-94 14Z" fill="#b48461" strokeWidth="2.4" />
      <path d="M697 246h43v379l-43 7Z" fill="#9e694f" stroke="none" />
      <path d="M635 247 690 99l70 155-66-14Z" fill={`url(#${id}-roof)`} strokeWidth="2.6" />
      <path d="M620 78h165v180H620Z" fill={`url(#${id}-scales)`} stroke="none" clipPath={`url(#${id}-roof-tower)`} />
      <path d="M638 249q58-13 120 8m-111-1q49-9 101 7" stroke="#c5c7a7" strokeWidth="2.5" />
      <path d="M689 99V73m-8 5h17m-9-4 17-7-17-5" strokeWidth="1.8" />
      <circle cx="689" cy="62" r="3.5" fill={GOLD} strokeWidth="1" />
      <HouseWindow x={660} y={279} width={30} height={60} glow={windowGlow} />
      <HouseWindow x={705} y={288} width={22} height={58} glow={windowGlow} />
      <path d="M646 362 740 370v13l-94-9Z" fill="#dab88e" strokeWidth="1.5" />
      <path d="M653 394h32m-27 8h20m25 3h28M654 477h30m23 11h20m-69 36h27" stroke="#83583f" strokeWidth="1" opacity="0.6" />

      <path d="M347 354h300v315H347Z" fill={`url(#${id}-wall)`} strokeWidth="2.4" />
      <path d="M608 360h39v309h-39Z" fill="#7b5441" opacity="0.22" stroke="none" />
      <path d="M350 355 494 199l150 160Z" fill="#d2ad85" strokeWidth="1.8" />
      <path d="M370 349 494 214l132 142M399 351l96-119 100 121" stroke="#796650" strokeWidth="1.2" />
      <path d="M319 371 494 174l179 197q-88-16-179-12-87-3-175 12Z" fill={`url(#${id}-roof)`} strokeWidth="3" />
      <path d="M310 173h377v211H310Z" fill={`url(#${id}-scales)`} stroke="none" clipPath={`url(#${id}-roof-main)`} />
      <path d="M315 373 494 171l183 202M322 381 494 190l172 190" fill="none" stroke="#bfc6a7" strokeWidth="3" />
      <path d="M339 365 494 196l158 170" fill="none" stroke={INK} strokeWidth="1.2" />
      <path d="M492 174v-17m-6 4h12m-4-12-2-7-2 7" strokeWidth="1.6" />
      <path d="M446 326v-32l48-51 49 51v35Z" fill="#ceaa7e" strokeWidth="2" />
      <path d="m438 298 56-62 58 64" fill="none" stroke={INK} strokeWidth="4.2" />
      <path d="m442 301 52-55 54 56" fill="none" stroke="#d3ccb0" strokeWidth="2" />
      <circle cx="494" cy="294" r="25" fill={`url(#${windowGlow})`} strokeWidth="2.5" />
      <circle cx="494" cy="294" r="20" strokeWidth="0.9" />
      <path d="M469 294h50m-25-25v50m-17-43 34 36m-34 0 34-36" strokeWidth="1.1" />
      <circle cx="494" cy="294" r="6" fill="#ead59e" strokeWidth="1" />
      <path d="M460 331h69m-64 7h58" stroke="#e3c89e" strokeWidth="2.1" />
      <path d="M344 382h307v15H344Z" fill="#d7b48a" strokeWidth="1.6" />
      {Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${352 + i * 17.5} 396v10l5-4 5 4v-10`} fill="#dcc4a0" strokeWidth="0.9" />)}
      <HouseWindow x={383} y={429} width={58} height={86} glow={windowGlow} shutters />
      <HouseWindow x={551} y={429} width={58} height={86} glow={windowGlow} shutters />
      <path d="M481 403h28v53h-28Z" fill="#bd8765" strokeWidth="1" />
      <path d="m495 413 7 11-7 11-7-11Z" fill="#d0ad80" strokeWidth="0.8" />
      <path d="M371 531h253M355 419h14m-11 15h14m252-11h13M364 576h17m230 14h21m-269 16h25" stroke="#885940" strokeWidth="0.85" />
      <path d="M347 354h300v315H347Z" fill={`url(#${id}-grain)`} opacity="0.3" stroke="none" />

      <path d="M205 460h221v214H205Z" fill="#c39673" strokeWidth="2.2" />
      <path d="M206 468h28v202h-28Z" fill="#97745a" opacity="0.45" stroke="none" />
      <path d="M177 474 296 316l137 161q-59-13-126-10-67-3-130 7Z" fill={`url(#${id}-roof)`} strokeWidth="2.8" />
      <path d="M164 309h280v179H164Z" fill={`url(#${id}-scales)`} stroke="none" clipPath={`url(#${id}-roof-left)`} />
      <path d="m175 477 121-161 140 164m-250 1 110-145 128 146" fill="none" stroke="#bac2a0" strokeWidth="2.6" />
      <path d="M229 474h161m-150 5h140" stroke="#c9b28b" strokeWidth="3" />
      <path d="M266 453v-39l31-40 35 42v38Z" fill="#bc9770" strokeWidth="1.8" />
      <path d="m259 419 38-50 42 51" stroke={INK} strokeWidth="3" fill="none" />
      <HouseWindow x={280} y={402} width={34} height={42} glow={windowGlow} />
      <HouseWindow x={240} y={519} width={56} height={83} glow={windowGlow} shutters />
      <path d="M322 536h48v84h-48Z" fill="#497267" strokeWidth="2" />
      <path d="M330 545h31v30h-31Zm0 38h31v28h-31Z" stroke="#b3b895" strokeWidth="1.2" />
      <circle cx="359" cy="581" r="2.3" fill={GOLD} strokeWidth="0.6" />
      <path d="M313 623h66v9h-66Z" fill="#c8ad88" strokeWidth="1.5" />
      <path d="M211 641h214v33H211Z" fill="#8b7f66" strokeWidth="1.6" />
      <path d="M220 644v27m27-27v27m35-27v27m31-27v27m37-27v27m32-27v27m31-27v27" stroke="#536250" strokeWidth="0.9" />
      <path d="M216 493h30m-27 11h15m110-13h33m-155 123h19m150-16h16" stroke="#926b4e" strokeWidth="0.8" />
      <path d="M205 460h221v214H205Z" fill={`url(#${id}-grain)`} opacity="0.24" stroke="none" />

      <path d="M645 468h89l92 61-18 139H645Z" fill="#718d79" strokeWidth="2.2" />
      <path d="M646 474h86l79 53H646Z" fill="#c6b984" strokeWidth="1.4" />
      <path d="M646 533h161l-14 114H646Z" fill="#e6c478" fillOpacity="0.6" strokeWidth="1.8" />
      <path d="M670 475v171m29-170v169m30-166v167m-81-89h155m-153 44h149m-26-94-8 139m-35-162 38 41m-69-47 44 47m-72-49 44 49" stroke="#3e6255" strokeWidth="2.4" />
      <path d="M647 653h152v16H647Z" fill="#746f52" strokeWidth="1.2" />
      <path d="M652 544v39m52-39v39m73-42-3 37" stroke={CREAM} strokeWidth="2.2" opacity="0.6" />
      <Sprig x={668} y={645} scale={0.68} color="#667a51" /><Sprig x={728} y={645} scale={0.82} flip color="#486a52" /><Sprig x={774} y={643} scale={0.65} color="#7c8255" />
      <path d="M658 634h22l-4 16h-14Zm58 0h23l-4 16h-15Zm46 0h24l-5 16h-15Z" fill="#ba805a" strokeWidth="1" />

      <path d="M414 656V551a77 77 0 0 1 154 0v105Z" fill="#70533e" strokeWidth="2" />
      <path d="M437 650V552a54 54 0 0 1 108 0v98Z" fill="#355b4d" strokeWidth="2.2" />
      <path d="M446 551a45 45 0 0 1 90 0v18h-90Z" fill={`url(#${windowGlow})`} strokeWidth="1.5" />
      <path d="M491 507v62m-32-49 32 49 32-49M447 552h89" strokeWidth="1.2" />
      <path d="M447 580h39v61h-39Zm49 0h39v61h-39Z" stroke="#93a07c" strokeWidth="1.3" />
      <path d="M453 586h26v48h-26Zm51 0h24v48h-24Z" stroke="#182f29" strokeWidth="0.8" />
      <circle cx="525" cy="583" r="3.5" fill={GOLD} strokeWidth="1" />
      <path d="M387 558q105-8 218 0l-25-31q-90-8-170 0Z" fill="#426657" strokeWidth="2.1" />
      <path d="M389 558q108-6 214 0v10q-10 10-19 0-10 11-20 0-10 11-20 0-10 11-20 0-10 11-20 0-10 11-20 0-10 11-20 0-10 11-20 0-10 11-20 0-10 11-17 0Z" fill="#bdc0a1" strokeWidth="1.5" />
      <path d="M401 568h9v89h-9Zm181 0h9v89h-9Z" fill="#d7b889" strokeWidth="1.6" />
      <path d="M405 578v71m181-71v71M397 650h18v9h-18m181-9h-18v9h18" strokeWidth="0.8" />
      <path d="M410 583q24-3 26 23m145-23q-25-3-27 23" fill="none" stroke="#ccb58e" strokeWidth="3" />
      <path d="M400 661h194v10H400Zm-11 10h216v10H389Zm-11 10h238v10H378Z" fill="#adab8b" strokeWidth="1.5" />
      <path d="M402 666h188m-198 10h210m-221 10h232" stroke={CREAM} strokeWidth="0.7" />
      <path d="M416 524v-16q-4-14-19-10m169 26v-16q4-14 19-10" fill="none" strokeWidth="2" />
      <Lantern x={394} y={521} size={0.79} glow={halo} /><Lantern x={588} y={521} size={0.79} glow={halo} />

      <path d="M605 644q27-60 12-126t24-90m-28 165q-31-14-26-41m33-4q34-13 37-47m-27-30q-18-6-21-28" fill="none" stroke="#586b47" strokeWidth="3.2" />
      {[[615,620,-20],[622,603,40],[610,583,-40],[616,565,25],[619,542,-30],[617,519,35],[623,496,-20],[629,476,35],[628,454,-35],[596,571,-35],[596,559,30],[641,527,40],[648,512,-10]].map(([x,y,r], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 0q-19-15-23 2Q-11 15 0 0Z" fill={i % 3 === 0 ? '#7f8b5b' : '#496c4f'} strokeWidth="0.8" /><path d="M-3 0h-13" stroke="#bbc094" strokeWidth="0.5" /></g>)}

      <PorchSpirit x={358} y={564} />
      <WelcomingHost x={448} y={559} />
      <WelcomingHost x={544} y={559} second />
      <PorchSpirit x={637} y={564} second />
      <Sprig x={220} y={684} scale={1.02} flip color="#526d52" /><Sprig x={248} y={684} scale={0.82} color="#8b9565" /><Sprig x={184} y={686} scale={0.65} color="#829264" />
      <path d="M218 662h41l-7 29h-27Z" fill={RUST} strokeWidth="1.4" /><path d="M215 660h47v7h-47Z" fill="#ce9a73" strokeWidth="1.3" />
      <Sprig x={328} y={675} scale={0.48} color="#66865d" /><Sprig x={350} y={674} scale={0.64} flip color="#688565" />
      <path d="M319 656h45l-8 24h-30Z" fill="#b87852" strokeWidth="1.4" /><path d="M316 653h50v7h-50Z" fill="#d19f73" strokeWidth="1.1" />
      <Sprig x={757} y={693} scale={0.9} color="#4c6c4d" /><Sprig x={794} y={691} scale={1.05} flip color="#647f58" /><Sprig x={822} y={692} scale={0.64} color="#9aa072" />
      <path d="M772 668h42l-6 29h-29Z" fill="#b67f54" strokeWidth="1.4" /><path d="M769 665h48v8h-48Z" fill="#c7996b" strokeWidth="1.1" />
      <path d="M137 698q32-61 62-12 17-23 39 5m471 18q27-47 54-12 13-22 30 0 18-18 43 8" fill="#8b9b74" strokeWidth="1.2" />
      <path d="M146 698q-3-14 6-24m19 22q1-17 10-22m565 32 7-22m38 23 10-17m18 21 6-15" stroke="#49634d" strokeWidth="1" />
      <path d="M130 711q130-28 271 3m209 0q128-17 259 10M130 726q130-28 271 3m209 0q128-17 259 10" strokeWidth="2.5" />
      {Array.from({ length: 15 }, (_, i) => { const x = 140 + i * 18; const y = 699 + Math.pow((x - 255) / 75, 2) * 3; return <g key={`left-${i}`}><path d={`M${x} ${y - 14}v52m-3-45 3-8 3 8`} strokeWidth="1.6" /><circle cx={x} cy={y - 16} r="2.2" fill={GOLD} strokeWidth="0.7" /></g>; })}
      {Array.from({ length: 14 }, (_, i) => { const x = 618 + i * 18; const y = 708 + Math.pow((x - 719) / 85, 2) * 4; return <g key={`right-${i}`}><path d={`M${x} ${y - 14}v50m-3-43 3-8 3 8`} strokeWidth="1.6" /><circle cx={x} cy={y - 16} r="2.2" fill={GOLD} strokeWidth="0.7" /></g>; })}
      <path d="M405 751v-57m-5 0h10m204 59v-58m-5 0h10" strokeWidth="3.3" /><circle cx="405" cy="689" r="5" fill={GOLD} strokeWidth="1.3" /><circle cx="614" cy="690" r="5" fill={GOLD} strokeWidth="1.3" />
      <path d="m406 704 40 22v35m-38-45 34 18m-25-17v27m11-20v27m11-22v26m174-49-36 23v33m34-44-31 19m23-17v28m-11-19v26m-10-19v25" strokeWidth="1.5" />
      <path d="M689 680v-69q0-16 17-16h22m-2-5v12" strokeWidth="2.1" /><path d="M703 602h40v27h-40Z" fill="#bd9e70" strokeWidth="1.5" /><path d="M709 609h28m-24 6h20m-17 6h14" stroke={INK} strokeWidth="0.9" /><path d="M724 629v6m-3 0h6" strokeWidth="0.8" />
      <path d="M307 686c-10-7-12-24-4-31 5 1 8 5 9 9 7-8 17-9 22-3 5 7 3 19-4 25m-23-20-4-12-4 8m30 9 7-9 2 12m-3 13q16 0 16-10" fill="#334e40" strokeWidth="1.1" />
      <path d="m309 672 3 1m13-1 3-1" stroke={GOLD} strokeWidth="1.5" />
    </g>
    <path d="M282 758q48 9 94 7m252 0q42 0 91-8" stroke="#a5ad8d" strokeWidth="0.8" strokeDasharray="3 5" />
  </svg>;
}


export type SpiritPortraitKind = 'gardener' | 'musician' | 'scholar' | 'sailor' | 'hostess' | 'artist' | 'child';

function PortraitFace({ kind, skin }: { kind: SpiritPortraitKind; skin: string }) {
  const scholarly = kind === 'scholar';
  const sailor = kind === 'sailor';
  const hostess = kind === 'hostess';
  return <g stroke={INK} strokeLinecap="round" strokeLinejoin="round">
    {hostess && <><path d="M112 106c-20-32 4-58 21-48-5-25 32-31 36-8 23-10 47 15 31 48l-10 49h-66Z" fill="#a4b3a0" strokeWidth="1.5" /><path d="M134 56q22-20 34-4m-30 0q18-10 27 0" fill="none" stroke={CREAM} strokeWidth="1" /></>}
    {kind === 'musician' && <path d="M112 110C99 98 97 77 111 64c8-15 28-11 38-20 17 3 28 11 39 9 21 10 24 35 11 58Z" fill="#4d655a" strokeWidth="1.6" />}
    {scholarly && <path d="M111 119c-17-14-13-45 1-53 9-13 25-15 41-10 22-8 45 6 46 29l-4 40Z" fill="#bac4ae" strokeWidth="1.4" />}
    {kind === 'gardener' && <path d="M117 85c-12 6-18 28-8 45-12 9-7 29 8 31l17-21h39l22 18c16-3 17-18 8-26 9-27-7-51-24-53Z" fill="#8a9a7e" strokeWidth="1.5" />}
    {kind === 'artist' && <path d="M113 116c-20-13-17-38-6-45 6-17 25-21 34-16 18-12 44-1 48 9 21 3 26 34 10 53l-12 24h-65Z" fill="#6d7d65" strokeWidth="1.5" />}
    <path d="M120 99c-8-12-16-1-11 13 2 7 8 9 13 5m65-18c8-12 16-1 11 13-2 7-8 9-13 5" fill={`url(#${skin})`} strokeWidth="1.15" />
    <path d="M122 93c1-24 18-36 36-33 24 1 36 17 34 43l-5 31c-5 20-20 34-33 33-18-1-29-16-33-36Z" fill={`url(#${skin})`} strokeWidth="1.7" />
    <path d="M121 97q-5 34 12 52m55-51q4 28-10 47" stroke="#9ead91" strokeWidth="1" fill="none" />
    <path d="M139 162v19q16 14 30-1v-19" fill={`url(#${skin})`} strokeWidth="1.4" />
    <path d="M142 164q12 7 24 0" fill="none" stroke="#a7b293" strokeWidth="1" />
    <path d={sailor ? 'M126 99q10-7 20-2m20 0q10-5 19 3' : kind === 'artist' ? 'M127 97q10-6 19-3m20 1q10-1 17 6' : 'M127 98q10-7 20-2m19 0q9-5 17 2'} stroke={sailor ? '#536c58' : '#73866c'} strokeWidth={sailor ? 3.5 : 2.1} fill="none" />
    <path d="M131 111q7-5 13 0m24 0q6-5 12 0" fill="none" strokeWidth="1.2" />
    <ellipse cx="138" cy="111" rx="2.5" ry="3.4" fill={INK} stroke="none" /><ellipse cx="174" cy="111" rx="2.5" ry="3.4" fill={INK} stroke="none" />
    <circle cx="138.7" cy="110" r="0.7" fill={CREAM} stroke="none" /><circle cx="174.7" cy="110" r="0.7" fill={CREAM} stroke="none" />
    <path d="M155 109q-4 13-3 17 4 3 9 0" fill="none" strokeWidth="1.1" />
    <path d={kind === 'musician' ? 'M145 140q10 5 22-1' : scholarly ? 'M145 140q8 5 17 1' : kind === 'artist' ? 'M146 138q10 9 23-2' : 'M145 139q10 9 21-1'} fill="none" strokeWidth="1.25" />
    <path d="M132 120q5 2 10 0m27 0q5 2 10 0" fill="none" stroke="#8f9f80" strokeWidth="0.7" />
    <ellipse cx="132" cy="128" rx="7" ry="3.5" fill={RUST} opacity="0.22" stroke="none" /><ellipse cx="179" cy="128" rx="7" ry="3.5" fill={RUST} opacity="0.22" stroke="none" />
    {kind === 'gardener' && <>
      <path d="M124 91q13-2 17-15 5 11 15 6 12 12 35 13l1-14-17-22-39 5Z" fill="#8a9a7e" strokeWidth="1.2" />
      <path d="M126 78q9-2 14-10m6 2q10 11 23 9" stroke={CREAM} opacity="0.55" strokeWidth="0.8" fill="none" />
      <path d="M97 73q-20 5-15 14 59 24 133 0 14-9-10-17Z" fill="#c6ad73" strokeWidth="1.6" />
      <path d="M111 75l8-31q31-12 62 0l17 32q-44 15-87-1Z" fill="#d2bc87" strokeWidth="1.5" />
      <path d="M115 61q38 13 78 0l5 15q-44 15-87-1Z" fill="#6b8668" strokeWidth="1.1" />
      <path d="M126 46l-5 12m13-14-3 16m13-17-1 18m12-18 1 19m10-16 3 15m9-12 5 10M91 83q66 18 113-1" stroke="#7f8059" strokeWidth="0.7" fill="none" />
      <path d="M183 66q-1-16 11-15 2 12-11 15m0 0q16-5 17 5-12 6-17-5Z" fill="#567453" strokeWidth="0.8" /><circle cx="184" cy="68" r="4" fill="#e1c778" strokeWidth="0.7" />
    </>}
    {kind === 'musician' && <>
      <path d="M116 95c11-5 6-22 24-23 25 10 41-1 47 9l8 17c11-31-6-44-26-46-20-7-44 5-52 17Z" fill="#4d655a" strokeWidth="1.2" />
      <path d="M124 74q23-22 54-11m-43 12q26-13 42-5" stroke="#8ca087" strokeWidth="0.9" fill="none" />
      <path d="M155 132q-10-8-19 5 12 5 19-1 7 6 19-1-9-11-19-3Z" fill="#4d655a" strokeWidth="0.7" />
      <path d="M134 145q4 6 9 6m27-6q-3 5-6 6" stroke="#9dad91" strokeWidth="0.7" />
    </>}
    {scholarly && <>
      <path d="M116 97q-5-30 27-31 27-14 49 12l-1 15q-17-10-18-20-20 17-49 13l-2 20Z" fill="#bac4ae" strokeWidth="1.2" />
      <path d="M125 75q21 0 34-7m20 9 9 7" stroke={CREAM} strokeWidth="1" fill="none" />
      <circle cx="137" cy="113" r="13" stroke="#997c4f" strokeWidth="1.7" /><circle cx="175" cy="113" r="13" stroke="#997c4f" strokeWidth="1.7" />
      <path d="M150 111q6-4 12 0m-38-3-9-2m73 2 7-3" stroke="#997c4f" strokeWidth="1.5" fill="none" />
      <path d="m129 107 5-3m32 3 5-3" stroke={CREAM} strokeWidth="1.7" />
    </>}
    {sailor && <>
      <path d="M116 108q-17-25 2-40 15-17 37-8 32-2 42 21l-3 27-8-13-2-13q-26 13-53 0l-10 25Z" fill="#98ad92" strokeWidth="1.3" />
      <path d="M103 71q-20 4-14 13 62 19 120-1 14-8-8-13Z" fill="#b4a27a" strokeWidth="1.4" /><path d="M117 72l5-28q33-13 64 0l12 28q-39 11-81 0Z" fill="#bdad82" strokeWidth="1.3" /><path d="M118 63q38 12 76 0l4 9q-39 11-81 0Z" fill="#71886d" strokeWidth="1" />
      <path d="M127 48q27-9 49 0" stroke="#e2d4ab" strokeWidth="0.8" fill="none" /><path d="M121 91q10-2 15-7m31 1q8 7 18 9" stroke="#d5dfc6" strokeWidth="0.8" fill="none" /><circle cx="118" cy="122" r="2.7" fill={GOLD} strokeWidth="0.7" /><circle cx="194" cy="122" r="2.7" fill={GOLD} strokeWidth="0.7" />
    </>}
    {hostess && <>
      <path d="M118 105q-5-28 15-40 12 22 56 19l5 17-6-30-19-15-35 2-17 16Z" fill="#a4b3a0" strokeWidth="1.3" />
      <path d="M129 68q-1 16 29 21m-21-22q13 12 37 11" stroke={CREAM} strokeWidth="0.9" fill="none" />
      <circle cx="117" cy="124" r="4.1" fill="#e1ce91" strokeWidth="0.8" /><circle cx="193" cy="124" r="4.1" fill="#e1ce91" strokeWidth="0.8" />
      <path d="M126 104l-4-2m59 3 5-2" strokeWidth="1" />
      <path d="M159 53q-2-9 7-12 8 7 0 12" fill="#b47555" strokeWidth="0.8" />
    </>}
    {kind === 'artist' && <>
      <path d="M115 101q-5-20 11-25 8 18 23 9 5-13 13-12 1 23 27 20l9-13-30-24-42 6-14 13Z" fill="#6d7d65" strokeWidth="1.2" />
      <path d="M103 76c-24-23 16-39 45-37 33-16 67 10 51 32-12 9-73 19-96 5Z" fill="#aa7856" strokeWidth="1.5" />
      <path d="M108 77q38 5 86-9l-1 10q-43 12-80 8Z" fill="#795b41" strokeWidth="1.3" />
      <path d="M148 41l3-11 7 1-2 10" fill="#7d6648" strokeWidth="1" />
      <path d="M111 60q18-15 39-12m14-2q21 0 26 10" stroke="#d2ad80" strokeWidth="1" fill="none" />
      <path d="m179 132 3 1" stroke={GOLD} strokeWidth="3" /><path d="m130 142 2 2" stroke={RUST} strokeWidth="2" />
    </>}
  </g>;
}

function PortraitClothes({ kind }: { kind: SpiritPortraitKind }) {
  return <g stroke={INK} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'gardener' && <>
      <path d="M119 173 139 167l17 19 16-18 21 7 27 57-23 11-9 48-66 2-17-57-22-8Z" fill="#819472" strokeWidth="1.6" />
      <path d="m139 169-8 45 25 6 24-7-8-43m-39 23h45l7 100h-60Z" fill="#c2b184" strokeWidth="1.5" />
      <path d="M139 229h34v28q-17 12-34 0Z" fill="#9e9e73" strokeWidth="1.1" /><path d="M142 237h28m-29 15h28" stroke="#ddd0a1" strokeWidth="0.65" />
      <circle cx="135" cy="202" r="2.5" fill={GOLD} strokeWidth="0.8" /><circle cx="176" cy="201" r="2.5" fill={GOLD} strokeWidth="0.8" />
      <path d="M101 204l-10 20 18 12m91-34 12 23-19 10" stroke="#bdc4a2" strokeWidth="1" fill="none" />
      <path d="M92 237q-8 21 5 26l27 4 3-13-22-3 7-12m91-4q11 16 1 20l-24 2-2-13 16-1-4-10" fill="#e0e0c8" strokeWidth="1.4" />
    </>}
    {kind === 'musician' && <>
      <path d="M116 172 137 167l18 16 19-16 21 8 18 101-41 22-17-19-21 22-42-24Z" fill="#46665a" strokeWidth="1.6" />
      <path d="m137 168 18 16 19-16-1 77-18 24-21-24Z" fill="#e4dec1" strokeWidth="1.2" />
      <path d="m134 171-14 20 13 14-11 14 33 50m22-96 14 19-12 14 10 12-34 52" stroke="#a4ad87" strokeWidth="1.4" fill="none" />
      <path d="M154 185q-15-13-20-4v13q10 4 20-5 10 9 21 2v-11q-10-7-21 5Z" fill={RUST} strokeWidth="1.1" /><circle cx="155" cy="187" r="3" fill="#d6a276" strokeWidth="0.7" />
      {[210,225,240].map(y => <circle key={y} cx="154" cy={y} r="2" fill={GOLD} strokeWidth="0.6" />)}
      <path d="M186 217h15m-16 6h16" stroke="#bfc3a0" strokeWidth="0.8" />
      <path d="m101 203-13 43 28 14 8-15-17-8 12-26m77-8 20 26-9 16-19-11 6-7-13-13" fill="#46665a" strokeWidth="1.5" />
      <path d="M115 244q13-3 16 6l-6 12-12-3Zm85-14q14-12 18-2l-2 14-11 2Z" fill="#e0e0c8" strokeWidth="1.2" />
    </>}
    {kind === 'scholar' && <>
      <path d="M115 175 138 167l17 15 17-15 24 10 16 68-24 11-5 43h-63l-10-48-22-8Z" fill="#a4916c" strokeWidth="1.6" />
      <path d="m138 168-8 17 23 12 23-12-4-16-18 15Z" fill="#e5dcc0" strokeWidth="1.1" />
      <path d="m123 178-8 30 9 90h58l10-90-8-31-30 26Z" fill="#657f66" strokeWidth="1.4" />
      <path d="M155 204v89m-29-76 10 11-10 11 10 11m41-33-10 11 10 11-10 11" stroke="#a9b38b" strokeWidth="0.9" fill="none" />
      {[211,228,245,262,279].map(y => <circle key={y} cx="155" cy={y} r="1.8" fill={GOLD} strokeWidth="0.5" />)}
      <path d="M97 222q-13 19 0 29l29 13 9-15-25-12 5-9m86-9q18 16 6 28l-23 12-10-15 18-10-5-9" fill="#a4916c" strokeWidth="1.4" />
      <path d="M124 248q12-5 18 5l-5 14-13-4Zm61-7q-11-7-17 6l9 13 13-5Z" fill="#e0e0c8" strokeWidth="1.2" />
    </>}
    {kind === 'sailor' && <>
      <path d="M115 176 140 169l16 12 17-11 27 12 22 94-36 23-68-3-24-23Z" fill="#486d60" strokeWidth="1.6" />
      <path d="m141 169 15 14 16-13 9 71h-43Z" fill="#e0dac0" strokeWidth="1.1" />
      <path d="M151 184l-4 40m14-38 5 38" stroke="#597c68" strokeWidth="3" />
      <path d="m137 173-15 18 9 15-10 16 27 26-1 48m31-123 17 19-8 15 11 15-35 27" stroke="#a5b49a" strokeWidth="1.3" fill="none" />
      {[232,254,275].map(y => <g key={y}><circle cx="132" cy={y} r="3.1" fill={GOLD} strokeWidth="0.7" /><circle cx="179" cy={y} r="3.1" fill={GOLD} strokeWidth="0.7" /></g>)}
      <path d="m106 219-12 41 35 13 6-18-22-4 9-25m79-6 19 34-19 17-14-14 12-10-15-20" fill="#486d60" strokeWidth="1.5" />
      <path d="M126 254q16-6 19 7l-3 12-15-3Zm66-2q15-1 19 11l-14 11-12-13Z" fill="#e0e0c8" strokeWidth="1.2" />
    </>}
    {kind === 'hostess' && <>
      <path d="M120 173 139 168q17 16 32 0l24 7 22 60-25 10 9 49-44 14-47-17 9-45-27-12Z" fill="#a77158" strokeWidth="1.6" />
      <path d="m139 168-13 11 18 20 13-17 13 17 15-21-14-10q-15 16-32 0Z" fill="#ece0bf" strokeWidth="1.2" />
      <path d="M126 213q31 11 60-1l9 83q-41 22-80-3Z" fill="#d9c69b" strokeWidth="1.3" />
      <path d="M126 221q31 8 61-1m-63 46q33 14 63 0m-65 23q33 16 65 0" stroke="#a4946e" strokeWidth="0.8" fill="none" />
      <path d="M144 230h28v24q-14 6-28 0Z" stroke="#aa956a" strokeWidth="1" fill="none" /><path d="M113 186q5 15 4 34m78-32q-5 17-3 32" stroke="#d5b68e" strokeWidth="1" fill="none" />
      <path d="M105 231q-10 17 4 28l18 1 3-14-16-3 5-8m83-4q17 14 4 27l-20 3-4-14 16-4-8-8" fill="#e0e0c8" strokeWidth="1.3" />
      <ellipse cx="157" cy="188" rx="5" ry="6" fill={GOLD} strokeWidth="1" /><ellipse cx="157" cy="188" rx="2.3" ry="3.2" fill="#4b6b53" strokeWidth="0.5" />
    </>}
    {kind === 'artist' && <>
      <path d="M118 174 138 168l18 15 17-14 24 8 20 61-25 13 6 43-41 14-40-13 2-42-27-14Z" fill="#89926b" strokeWidth="1.6" />
      <path d="M120 184q36 10 73 0m-77 18q39 10 81 0m-84 18q43 10 87 0m-80 18q37 9 69 0m-71 18q35 10 72 0m-70 18q37 10 73 0" stroke="#d3cba8" strokeWidth="3" opacity="0.75" />
      <path d="M137 168q17 14 37 1l5 14q-24 17-45-1Z" fill={RUST} strokeWidth="1.3" /><path d="m152 190 17-1 14 59-18-6-7-26-9 18-12-8Z" fill="#b77855" strokeWidth="1.2" />
      <path d="m161 201 8 27m-12-18-8 16" fill="none" stroke="#deac7c" strokeWidth="0.9" />
      <path d="M102 237q-12 19 3 26l27-4-1-15-21 3 5-10m87-5q20 20 3 28l-12 3-6-14 12-4-9-9" fill="#e0e0c8" strokeWidth="1.3" />
      <path d="m128 282 3 3m52-20 3 6m-10 18 7-3m-59-76 5 2" stroke={RUST} strokeWidth="3.2" /><path d="m190 224 3 2m-62 46 3-2" stroke={GOLD} strokeWidth="3.5" />
    </>}
  </g>;
}

function PortraitProp({ kind }: { kind: SpiritPortraitKind }) {
  return <g stroke={INK} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'gardener' && <g transform="translate(157 250) rotate(-9)">
      <path d="M-10-19c-18-22-42-1-22 20m5-21c-9-11-22-1-12 12" fill="none" stroke="#526f57" strokeWidth="5" />
      <path d="M-30-13h42l-2 43h-36Z" fill="#6d8b70" strokeWidth="1.5" /><ellipse cx="-9" cy="-13" rx="21" ry="5" fill="#879977" strokeWidth="1.2" />
      <path d="M10-4 40-26l5 5-35 38" fill="#6d8b70" strokeWidth="1.3" /><ellipse cx="44" cy="-24" rx="6" ry="10" transform="rotate(-35 44 -24)" fill="#b4b58a" strokeWidth="1.2" />
      <path d="m41-28 1 1m3 0 1 1m-3 2 1 1m4-1 1 1M-25-2v23m6-23v24m7-24v24m7-24v24m7-24v24" stroke="#c2c5a0" strokeWidth="0.7" />
      <path d="M55-28l7-1m-6 8h8m-8 6 6 3" stroke="#7b9b88" strokeWidth="1" />
    </g>}
    {kind === 'musician' && <g transform="translate(162 256) rotate(-10)">
      <path d="M38-17q33 4 29 28t-27 23q-15 0-12-13 2-13 17-9" fill="none" stroke="#536a5c" strokeWidth="7" />
      <path d="M38-17q33 4 29 28t-27 23q-15 0-12-13 2-13 17-9" fill="none" stroke="#d1d0aa" strokeWidth="1" strokeDasharray="2 5" />
      <circle r="44" fill="#b3ba98" strokeWidth="1.6" /><circle r="38" fill="#8d9c80" strokeWidth="1" />
      {Array.from({length:5},(_,i)=><ellipse key={i} cx="0" cy="-23" rx="10" ry="13" transform={`rotate(${i*72})`} fill="#e0e0c8" strokeWidth="1.2" />)}
      <circle r="8" fill="#b69d63" strokeWidth="1" /><circle r="3" fill={INK} strokeWidth="0.5" /><circle r="41" stroke="#e7ddba" strokeWidth="0.7" strokeDasharray="2 3" />
    </g>}
    {kind === 'scholar' && <g transform="translate(157 255) rotate(-7)">
      <circle r="42" fill="#b59b62" strokeWidth="1.7" /><circle r="36" fill="#ddd0a4" strokeWidth="1.1" /><circle r="31" stroke="#7f825e" strokeWidth="0.75" strokeDasharray="1 4" />
      <g transform="translate(-12 -5)"><circle r="16" fill="#8b9e7e" strokeWidth="1.2" /><circle r="12" stroke="#d6d2a6" strokeWidth="2" strokeDasharray="2 3" /><circle r="5" fill="#c6ae71" strokeWidth="0.8" /><path d="M0-11v22m-11-11h22" strokeWidth="0.75" /></g>
      <g transform="translate(15 10)"><circle r="13" fill="#ba9a5b" strokeWidth="1.2" /><circle r="9" stroke="#ded1a2" strokeWidth="2" strokeDasharray="2 3" /><circle r="3" fill="#748b70" strokeWidth="0.8" /></g>
      <path d="M-1-28v20l17-7M-25 22l14-5m25-42 4 8m6 1 3 8" fill="none" strokeWidth="1.1" /><circle cx="0" cy="-9" r="2.3" fill={INK} stroke="none" />
      <path d="M-8-45v-7H8v7m-5-7v-5H-3v5" fill="#ae8d50" strokeWidth="1.1" /><path d="M-26 30q22 15 43 2" fill="none" stroke={CREAM} strokeWidth="0.8" />
    </g>}
    {kind === 'sailor' && <g transform="translate(157 255) rotate(-6)">
      <path d="m-46-30 30 7 29-8 32 8v58l-31-7-30 8-31-8Z" fill="#e1d3aa" strokeWidth="1.4" /><path d="M-16-23v59m30-67v59" stroke="#b5aa83" strokeWidth="0.8" />
      <path d="M-39-14q8-4 18 3t21-4 35 3M-37-5q9-4 17 4T3-7q16-4 29 4M-39 7q17-11 29 0t31 1m-56 6q16-5 23 3t16-2 26 4" fill="none" stroke="#9ea984" strokeWidth="0.7" />
      <path d="M-36 25q19-9 22-16T6 3q13-2 22-18" fill="none" stroke="#ad7956" strokeWidth="1.4" strokeDasharray="3 2" /><circle cx="29" cy="22" r="9" stroke="#8a8861" strokeWidth="0.8" /><path d="m29 15 2 6 5 1-5 2-2 6-2-6-5-2 5-1Z" fill="#74896e" strokeWidth="0.5" /><path d="M-39-21h11m-11 4h8" stroke="#87876a" strokeWidth="0.7" />
    </g>}
    {kind === 'hostess' && <g transform="translate(158 248)">
      <ellipse cy="17" rx="57" ry="8" fill="#b69b64" strokeWidth="1.3" /><path d="M-57 17q56 17 114 0v5q-56 17-114 0Z" fill="#987e52" strokeWidth="1.2" />
      <ellipse cx="7" cy="11" rx="27" ry="5" fill="#e7d9af" strokeWidth="0.9" /><path d="M23-19c24-9 27 18 4 19l-3-6c14-1 15-13 2-8" fill="#ddd0a7" strokeWidth="1.1" />
      <path d="M-15-22h44c-1 19-7 29-22 29s-20-10-22-29Z" fill="#e7d9af" strokeWidth="1.2" /><ellipse cx="7" cy="-22" rx="22" ry="5" fill="#ae8c59" strokeWidth="0.9" />
      <path d="M-9-11q17 7 32 0m-27 3q-4 9 4 10m5-10q4 9-4 10" fill="none" stroke="#6e876b" strokeWidth="0.8" />
      <path d="M1-34q-9-11 1-21m12 21q-7-12 3-21" fill="none" stroke="#a2ad90" strokeWidth="1" opacity="0.85" /><path d="M-39 2q-12-5-14 5h23q-1-10-9-5Z" fill="#ba8f5c" strokeWidth="0.9" /><path d="M-44 6h2m5-2h2" stroke="#7e714b" strokeWidth="1" />
    </g>}
    {kind === 'artist' && <g transform="translate(158 261) rotate(-10)">
      <path d="M-42-25h76v68l-22-7-18 6-18-7-18 5Z" fill="#d6c3a0" strokeWidth="1.3" /><path d="M-36-19h58v46l-17-2-17 6-21-5Z" fill="#e4d6b1" strokeWidth="0.8" /><path d="M-31-15q21 9 40 0l8 32-17 7-26-4Z" fill="none" stroke="#9b9671" strokeWidth="0.8" strokeDasharray="3 2" />
      <path d="M-39-23q-11-6-12 10l-2 50 11 2 2-48q0-6 5-4" fill="#d4af64" strokeWidth="1.1" /><path d="M-49-8h7m-7 8h7m-8 8h7m-7 8h7m-8 8h7m-7 8h7" stroke="#6f795b" strokeWidth="0.7" />
      <g transform="translate(32 -6) rotate(-12)"><ellipse cx="-7" cy="13" rx="6" ry="8" fill="none" stroke="#6a8270" strokeWidth="2.4" /><ellipse cx="8" cy="13" rx="6" ry="8" fill="none" stroke="#6a8270" strokeWidth="2.4" /><path d="m-4 6 10-35 2 35m-3 0-13-35 9 36" fill="#b3bd9d" strokeWidth="1.1" /><circle cy="3" r="2" fill={GOLD} strokeWidth="0.7" /></g>
      <path d="M-19-15v8m10-7v8m-10-8h10" stroke={RUST} strokeWidth="1" /><circle cx="-19" cy="-15" r="1.5" fill={RUST} stroke="none" /><circle cx="-9" cy="-14" r="1.5" fill={GOLD} stroke="none" />
    </g>}
  </g>;
}

export function SketchSpiritPortrait({ kind, className }: { kind: SpiritPortraitKind; className?: string }) {
  const id = `spirit-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const shades: Record<SpiritPortraitKind, string> = { gardener: '#c6cdb0', musician: '#d3c3a2', scholar: '#bfccb6', sailor: '#bbccc0', hostess: '#d8beaa', artist: '#d7c3a2', child: '#c6d7b4' };
  if (kind === 'child') return <ChildSpiritPortrait className={className} />;
  return <svg className={className} viewBox="0 0 320 380" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#f0edd7" /><stop offset="0.6" stopColor="#e0e0c8" /><stop offset="1" stopColor="#c4cfb6" /></linearGradient>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e8e5cd" /><stop offset="0.65" stopColor="#dbe0c5" /><stop offset="1" stopColor="#c4cfb5" stopOpacity="0.4" /></linearGradient>
      <pattern id={`${id}-grain`} width="24" height="27" patternUnits="userSpaceOnUse"><circle cx="5" cy="4" r="0.5" fill={INK} /><circle cx="18" cy="18" r="0.65" fill={INK} /><path d="m4 22 2-1m12-14 1 1" stroke={INK} strokeWidth="0.5" /></pattern>
    </defs>
    <path d="M49 323V136a111 111 0 0 1 222 0v187q-109 39-222 0Z" fill={shades[kind]} opacity="0.5" />
    <path d="M60 323V137a100 100 0 0 1 200 0v186" stroke="#9fAD91" strokeWidth="0.8" opacity="0.65" />
    <path d="M49 323V136a111 111 0 0 1 222 0v187q-109 39-222 0Z" fill={`url(#${id}-grain)`} opacity="0.2" />
    <circle cx="158" cy="135" r="87" stroke="#a5ae8e" strokeWidth="0.7" strokeDasharray="1 6" />
    <ellipse cx="159" cy="348" rx="63" ry="9" fill="#81927b" opacity="0.14" />
    <ellipse cx="158" cy="348" rx="41" ry="4" stroke="#7b8e75" strokeWidth="0.7" opacity="0.25" />
    <path d="M136 164c-29 4-46 27-43 67 2 26 10 53-1 70-8 13-3 25 14 25 15 1 19-8 26-6 10 6 15 23 36 22 17-1 22-11 32-16 12-6 31 6 37-5-21-11-24-26-21-42 13-66-7-108-44-115Z" fill={`url(#${id}-body)`} stroke="#8fa184" strokeWidth="1.15" />
    <path d="M110 280q9 35-9 40m45-23q-10 28 20 39m27-42q-6 20 13 29" stroke="#a4b393" strokeWidth="1" opacity="0.7" />
    <PortraitClothes kind={kind} />
    <PortraitFace kind={kind} skin={`${id}-skin`} />
    <PortraitProp kind={kind} />
    <g stroke="#8b9c80" strokeLinecap="round" opacity="0.85"><path d="M66 182v12m-6-6h12m181-16v8m-4-4h8M230 83v10m-5-5h10M81 285v8m-4-4h8" strokeWidth="0.9" /><circle cx="244" cy="278" r="1.4" fill={GOLD} stroke="none" /><circle cx="70" cy="126" r="1.4" fill={GOLD} stroke="none" /><circle cx="247" cy="218" r="1" fill={INK} stroke="none" /></g>
    <path d="M50 247q-12 18-3 35m220-57q13 14 7 34" stroke="#a6b195" strokeWidth="0.8" strokeDasharray="2 5" />
  </svg>;
}




/** Original code-authored child illustration; the six-person atlas is unchanged. */
export function ChildSpiritPortrait({ className }: IllustrationProps) {
  const id = `child-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <svg className={["spirit-portrait", className].filter(Boolean).join(" ")} data-portrait="child" data-portrait-source="original-vector" viewBox="0 0 512 512" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMin slice" style={{ overflow: "hidden", background: "#182f23" }}>
    <defs>
      <radialGradient id={`${id}-halo`}><stop stopColor="#708c65" stopOpacity=".45" /><stop offset="1" stopColor="#182f23" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c6d7b4" stopOpacity=".8" /><stop offset="1" stopColor="#c6d7b4" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e3e5c7" /><stop offset="1" stopColor="#b8caaa" /></linearGradient>
    </defs>
    <ellipse cx="256" cy="250" rx="225" ry="235" fill={`url(#${id}-halo)`} />
    <path d="M66 443V212a190 190 0 0 1 380 0v231" fill="none" stroke="#a2ad79" strokeWidth="1" opacity=".45" />
    <path d="M79 433V213a177 177 0 0 1 354 0v220" fill="none" stroke="#a2ad79" strokeWidth=".8" opacity=".3" />
    <g stroke="#42614c" strokeLinecap="round" strokeLinejoin="round">
      <path d="M199 282c-56 21-56 97-61 132-6 36-20 58-24 75 39-5 62-16 81-12 23 11 28 19 54 18 24-1 48-17 67-14 22 3 48 11 65 4-20-24-26-49-24-81 4-68-30-112-55-121Z" fill={`url(#${id}-mist)`} stroke="none" />
      <path d="M209 276q-41 5-59 50l-16 54 38 14 17-42-7 77q73 22 146-1l-7-76 17 42 39-14-16-54q-18-45-59-50Z" fill="#98ac83" strokeWidth="2.4" />
      <path d="m210 277 46 24 46-24-16 40-30-16-30 16Z" fill="#caba81" strokeWidth="1.7" />
      <path d="M256 303v43m-59 0-3 43m121-43 4 43" fill="none" strokeWidth="1.4" />
      <path d="M228 243v35q28 22 56 0v-35" fill={`url(#${id}-skin)`} strokeWidth="1.8" />
      <ellipse cx="184" cy="211" rx="12" ry="19" fill="#c6d5b2" strokeWidth="1.7" /><ellipse cx="328" cy="211" rx="12" ry="19" fill="#c6d5b2" strokeWidth="1.7" />
      <path d="M187 170q3-70 70-70 70 0 71 70v49q-4 60-72 63-65-5-69-63Z" fill={`url(#${id}-skin)`} strokeWidth="2.5" />
      <path d="M186 199q-21-61 14-95 31-29 79-17 49 5 57 59 7 27-8 54l-10-39q-32 9-59-17-24 29-62 21Z" fill="#748b69" strokeWidth="2.2" />
      <path d="M201 133q21-26 55-23m-40 38q29-10 40-27m9-15q33 7 45 30" fill="none" stroke="#acba90" strokeWidth="1.5" />
      <path d="M211 195q10-6 20-1m49 0q11-5 20 1" fill="none" strokeWidth="2" />
      <ellipse cx="223" cy="211" rx="4" ry="5" fill="#304e3c" stroke="none" /><ellipse cx="290" cy="211" rx="4" ry="5" fill="#304e3c" stroke="none" />
      <path d="m253 212-3 15 8 2m-17 17q15 11 31-1" fill="none" strokeWidth="1.8" />
      <g fill="#91a67e" stroke="none" opacity=".6"><circle cx="209" cy="229" r="1.4" /><circle cx="216" cy="232" r="1.4" /><circle cx="224" cy="230" r="1.4" /><circle cx="288" cy="230" r="1.4" /><circle cx="296" cy="232" r="1.4" /><circle cx="303" cy="228" r="1.4" /></g>
      <path d="m180 355 48-9 53 14 48-11 13 73-48 13-57-15-46 8Z" fill="#dbce9f" strokeWidth="2" />
      <path d="m228 346 9 74m44-60 13 75" fill="none" stroke="#a5a37a" strokeWidth="1.3" />
      <path d="m200 378 29-8 35 12 37-5 20 8m-117 14 30-8 33 11 38-4" fill="none" stroke="#87996f" strokeWidth="2" />
      <path d="m244 385 11-13 13 16-12 11Z" fill="#93aa7d" strokeWidth="1" /><path d="m290 407 12-12 9 10-12 9Z" fill="#a1b485" strokeWidth="1" />
      <path d="M161 375q8-10 22-2l14 14-6 17-20-9q-16-5-10-20m190 0q-8-10-22-2l-14 14 6 17 20-9q16-5 10-20" fill={`url(#${id}-skin)`} strokeWidth="1.8" />
    </g>
    <g fill="none" stroke="#bcc794" strokeLinecap="round" opacity=".65"><path d="M109 178v12m-6-6h12m291 127v10m-5-5h10M389 140v8m-4-4h8M102 397v7m-3.5-3.5h7" /><path d="M115 458q-19-21-11-40m304-12q10 26-4 46" strokeDasharray="2 5" /></g>
    <g fill="#d4bd7d" opacity=".55"><circle cx="135" cy="239" r="1.8" /><circle cx="371" cy="239" r="1.5" /><circle cx="378" cy="438" r="1.8" /></g>
  </svg>;
}

/** Original six portraits retain their atlas cells; the child has an original vector. */
export function SpiritPortrait({kind,className}:{kind:SpiritPortraitKind;className?:string}){
  const art=useArtwork();
  if (kind === 'child') return <ChildSpiritPortrait className={className} />;
  const positions:Record<Exclude<SpiritPortraitKind, 'child'>,[number,number]>={scholar:[0,0],musician:[1,0],hostess:[2,0],artist:[0,1],gardener:[1,1],sailor:[2,1]};
  const [column,row]=positions[kind];
  const src=art?getImageProps({src:art.portraitAtlasUrl,alt:"",width:768,height:512,quality:75}).props.src:undefined;
  return <svg className={["spirit-portrait",className].filter(Boolean).join(" ")} data-portrait={kind} viewBox="0 0 512 512" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMin slice" style={{overflow:"hidden",background:"#182f23"}}>
    {src&&<g className="portrait-presence"><image href={src} x={-column*512} y={-row*512} width="1536" height="1024" preserveAspectRatio="none"/></g>}
  </svg>;
}
