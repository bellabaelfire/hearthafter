"use client";
import {useHearth} from "./hearth-provider";
/** Local PNGs belong only to the explicitly selected offline demonstration. */
export function useArtwork(){
 const {state,mode}=useHearth();
 if(!state)return null;
 if(mode==="sanity")return state.artwork??null;
 return {heroUrl:"/art/hearthafter-hero.png",overlapUrl:"/art/overlap-establishing.png",portraitAtlasUrl:"/art/spirit-portraits-atlas.png"};
}
