import type {HearthState, Placement, PlacementEvent, Spirit} from '../domain'
import {DOCUMENT_TYPES, hearthDocumentId} from './config'

export interface HearthDocument extends Record<string,unknown> { _id:string; _type:string; _rev?:string; id:string }
export type RawHearthState = {[K in keyof HearthState]: K extends 'matchingPolicy' | 'artwork' ? HearthDocument | null : HearthDocument[]}
const DERIVED_REFERENCES = new Set(['historyRefs','traitRefs','boundaryRefs','spiritRefs','sourceDocuments','homeRef','placementRef','trialReadiness','guardianRef','companionRefs'])
function clean(value:unknown):unknown {
  if(Array.isArray(value)) return value.map(clean)
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([key])=>!key.startsWith('_')&&!DERIVED_REFERENCES.has(key)).map(([key,entry])=>[key,clean(entry)]))
  return value
}
export function decodeDocument<T>(document:HearthDocument):T {
  const result=clean(document) as Record<string,unknown>
  if(document._type!=='hearthPlacementEvent') result.rev=document._rev || String(result.rev || '')
  if(document._type==='hearthSpirit' && (result.audibleHours===null || result.audibleHours===undefined)) result.audibleHours='none'
  if(document._type==='hearthPlacement') {
    const snapshot=(result.evaluation as Record<string,unknown>)?.sourceSnapshot as Record<string,unknown>|undefined
    if(Array.isArray(snapshot?.revisions)) {
      const entries=snapshot.revisions as {source?:unknown;revision?:unknown}[]
      if(entries.some(entry=>!entry||typeof entry.source!=='string'||!entry.source||typeof entry.revision!=='string'||!entry.revision)||new Set(entries.map(entry=>entry.source)).size!==entries.length) throw new Error('HEARTH_CONTENT_INVALID')
      snapshot.revisions=Object.fromEntries(entries.map(entry=>[entry.source as string,entry.revision as string]))
    }
  }
  return result as T
}
export function decodeHearthState(raw:RawHearthState):HearthState {
  if(!raw || !raw.matchingPolicy) throw new Error('HEARTH_CONTENT_NOT_SEEDED')
  if(typeof raw.matchingPolicy.id!=='string'||typeof raw.matchingPolicy._rev!=='string') throw new Error('HEARTH_CONTENT_INVALID')
  const output:Record<string,unknown>={}
  for(const key of Object.keys(DOCUMENT_TYPES) as (keyof HearthState)[]) {
    const value=raw[key]
    if(key==='artwork') {
      if(value) {
        const art=value as HearthDocument
        if(typeof art._rev!=='string'||['heroUrl','overlapUrl','portraitAtlasUrl'].some(key=>typeof art[key]!=='string'||!/^https:\/\/cdn\.sanity\.io\/images\//.test(art[key] as string))) throw new Error('HEARTH_CONTENT_INVALID')
        output[key]=decodeDocument(art)
      }
    } else if(key==='matchingPolicy') output[key]=decodeDocument(raw.matchingPolicy)
    else {
      if(!Array.isArray(value)) throw new Error('HEARTH_CONTENT_INVALID')
      output[key]=value.map(document=>{
        if(!document || typeof document.id!=='string' || typeof document._rev!=='string') throw new Error('HEARTH_CONTENT_INVALID')
        return decodeDocument(document)
      })
    }
  }
  return output as unknown as HearthState
}
function keysForArrays(value:unknown):unknown {
  if(Array.isArray(value)) return value.map((entry,index)=>entry&&typeof entry==='object'&&!Array.isArray(entry)?{...keysForArrays(entry) as Record<string,unknown>,_key:`entry-${index}`} : keysForArrays(entry))
  if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([,entry])=>entry!==undefined).map(([key,entry])=>[key,keysForArrays(entry)]))
  return value
}
function reference(type:string,id:string) {return {_type:'reference',_ref:hearthDocumentId(type,id)}}
function refs(type:string,ids:string[]) {return ids.map((id,index)=>({...reference(type,id),_key:`ref-${index}`}))}
export function encodeDocument(type:string,value:{id:string}):HearthDocument {
  const fields=keysForArrays(value) as Record<string,unknown>
  delete fields.rev
  if(type==='hearthSpirit') {
    const spirit=value as Spirit
    if(spirit.audibleHours==='none') fields.audibleHours=null
    if(spirit.requiredCompanionIds) fields.companionRefs=refs('hearthSpirit',spirit.requiredCompanionIds)
    if(spirit.guardianSpiritId) fields.guardianRef=reference('hearthSpirit',spirit.guardianSpiritId)
    fields.historyRefs=refs('hearthHistory',spirit.historyIds)
    fields.traitRefs=refs('hearthTrait',spirit.traitIds)
    fields.boundaryRefs=refs('hearthBoundary',spirit.boundaryIds)
  }
  if(type==='hearthPairRelationship'||type==='hearthPlacement') fields.spiritRefs=refs('hearthSpirit',(value as {id:string;spiritIds:string[]}).spiritIds)
  if(type==='hearthPlacement') {
    const placement=value as Placement
    // Content Lake attribute names cannot contain the colon in domain source keys.
    const snapshot=(fields.evaluation as Record<string,unknown>).sourceSnapshot as Record<string,unknown>
    snapshot.revisions=Object.entries(placement.evaluation.sourceSnapshot.revisions).map(([source,revision],index)=>({_key:`revision-${index}`,source,revision}))
    if(placement.home.templateId) fields.homeRef=reference('hearthHome',placement.home.templateId)
  }
  if(type==='hearthPlacementEvent') fields.placementRef=reference('hearthPlacement',(value as PlacementEvent).placementId)
  return {...fields,_id:hearthDocumentId(type,value.id),_type:type,id:value.id}
}
export function encodeState(state:HearthState):HearthDocument[] {
  return (Object.keys(DOCUMENT_TYPES) as (keyof HearthState)[]).flatMap(key=>{
    // Artwork references are prepared by the uploader; domain URLs are read projections.
    if(key==='artwork') return []
    const values=key==='matchingPolicy'?[state.matchingPolicy]:state[key]
    return (values as {id:string}[]).map(value=>encodeDocument(DOCUMENT_TYPES[key],value))
  })
}
