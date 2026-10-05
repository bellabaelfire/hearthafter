"use client";
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import type {HearthState,HostPreferences,PlacementCommand,PlacementResult,Placement,PlacementEvent} from "@/lib/hearth/domain";
import {validateHostPreferences} from "@/lib/hearth/matching";
import {applyPlacementCommand} from "@/lib/hearth/placement";
import {blankVisit as blank,parseSavedVisit as parseLocal,type SavedVisit as LocalData} from "@/lib/hearth/saved-visit";

import {applySavedWithdrawal,type SavedWithdrawalCommand,type SavedWithdrawalResult} from "@/lib/hearth/saved-case-recovery";
type HearthContextValue={
 state:HearthState|null;mode:"offline"|"sanity";loading:boolean;error:string|null;storageError:string|null;notice:string|null;
 savedPlacements:Placement[];savedEvents:PlacementEvent[];withdrawSaved:(command:SavedWithdrawalCommand)=>SavedWithdrawalResult;
 home:HostPreferences|null;setHome:(home:HostPreferences|null)=>void;localReady:boolean;
 command:(command:PlacementCommand)=>PlacementResult;reload:()=>Promise<void>;clearLocal:()=>void;
};
const KEY="hearthafter-household-v1";
const Context=createContext<HearthContextValue|null>(null);
export function HearthProvider({children}:{children:ReactNode}){
 const [content,setContent]=useState<HearthState|null>(null);
 const [mode,setMode]=useState<"offline"|"sanity">("offline");
 const [local,setLocal]=useState<LocalData>(blank);
 const [localReady,setLocalReady]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [notice,setNotice]=useState<string|null>(null);
 const [storageError,setStorageError]=useState<string|null>(null);
 const localRef=useRef(local);const contentRef=useRef(content);
 const registryAvailableRef=useRef(false);const fetchGeneration=useRef(0);
 const commitLocal=useCallback((next:LocalData,requirePersistence=false)=>{
  try{localStorage.setItem(KEY,JSON.stringify(next));setStorageError(null);}
  catch{
   const message=requirePersistence?"Your browser could not save this decision. It has not been recorded. Free browser storage and try again.":"Your browser could not save this visit. You can continue here, but changes may disappear after a reload.";
   setStorageError(message);if(requirePersistence)throw Error(message);
  }
  localRef.current=next;setLocal(next);
 },[]);
 const readLatestLocal=useCallback(()=>{
  let current:LocalData;
  try{current=parseLocal(localStorage.getItem(KEY));}catch{
   throw Error("The saved visit could not be read safely. The saved exit information remains available, but this decision was not recorded.");
  }
  if(JSON.stringify(current)!==JSON.stringify(localRef.current)){localRef.current=current;setLocal(current);}
  return current;
 },[]);
 useEffect(()=>{
  try{const saved=parseLocal(localStorage.getItem(KEY));localRef.current=saved;setLocal(saved);}
  catch{setStorageError("Your saved visit could not be restored. A fresh visit will start when you make your next change.");}
  setLocalReady(true);
  const onStorage=(event:StorageEvent)=>{if(event.key===KEY){try{const next=parseLocal(event.newValue);localRef.current=next;setLocal(next);setStorageError(null);}catch{setStorageError("Another tab saved an unreadable visit. Refresh or start a fresh visit.");}}};
  window.addEventListener("storage",onStorage);return()=>window.removeEventListener("storage",onStorage);
 },[]);
 const reload=useCallback(async()=>{
  const generation=++fetchGeneration.current;
  try{
   const response=await fetch("/api/content",{cache:"no-store"});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"The registry is temporarily unavailable.");
   if(!payload.state||!Array.isArray(payload.state.spirits)||!Array.isArray(payload.state.homes)||!payload.state.matchingPolicy)throw Error("The registry returned an incomplete response.");
   if(generation!==fetchGeneration.current)return;
   registryAvailableRef.current=true;contentRef.current=payload.state;setContent(payload.state);setMode(payload.mode);setNotice(payload.notice||null);setError(null);
  }catch(err){if(generation===fetchGeneration.current){registryAvailableRef.current=false;setError(err instanceof Error?err.message:"The registry could not be reached. Please try again.");}}
  finally{if(generation===fetchGeneration.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  const refreshWhenVisible=()=>{if(document.visibilityState==="visible")void reload();};
  void reload();
  const timer=setInterval(refreshWhenVisible,15000);
  document.addEventListener("visibilitychange",refreshWhenVisible);
  window.addEventListener("focus",refreshWhenVisible);
  return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refreshWhenVisible);window.removeEventListener("focus",refreshWhenVisible);};
 },[reload]);
 const state=useMemo(()=>content?{...content,placements:local.placements,events:local.events}:null,[content,local]);
 const setHome=useCallback((home:HostPreferences|null)=>{
  if(home)validateHostPreferences(home);
  let current=localRef.current;
  try{current=readLatestLocal();}catch(error){
   // A fresh application may replace a visit that could not be restored.
   if(current.placements.length||current.events.length)throw error;
  }
  commitLocal({...current,home});
 },[commitLocal,readLatestLocal]);
 const withdrawSaved=useCallback((operation:SavedWithdrawalCommand)=>{
  const current=readLatestLocal();
  const result=applySavedWithdrawal(current,operation,{actor:"Local demonstration reviewer",now:new Date().toISOString()});
  commitLocal(result.saved,true);
  return result;
 },[commitLocal,readLatestLocal]);
 const command=useCallback((operation:PlacementCommand)=>{
  if(!contentRef.current)throw Error("The registry must load before a placement can be reviewed.");
  const advancesReview=!(operation.type==="record-consent"&&operation.decision==="denied")&&!(operation.type==="transition"&&(operation.to==="closed"||operation.to==="relocating"));
  if(advancesReview&&!registryAvailableRef.current)throw Error("Reconnect to the registry before advancing this review. Refusal, withdrawal, and a safe exit remain available.");
  const saved=readLatestLocal();
  const current={...contentRef.current,placements:saved.placements,events:saved.events};
  const result=applyPlacementCommand(current,operation,{actor:"Local demonstration reviewer",now:new Date().toISOString()});
  commitLocal({...saved,placements:result.state.placements,events:result.state.events},true);
  return result;
 },[commitLocal,readLatestLocal]);
 const clearLocal=useCallback(()=>{commitLocal(blank());},[commitLocal]);
 return <Context.Provider value={{state,mode,loading,error,storageError,notice,home:local.home,setHome,localReady,savedPlacements:local.placements,savedEvents:local.events,withdrawSaved,command,reload,clearLocal}}>{children}</Context.Provider>;
}
export function useHearth(){const value=useContext(Context);if(!value)throw Error("HearthProvider is required.");return value;}
export function newRequestId(){return crypto.randomUUID();}
