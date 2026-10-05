import 'server-only'
import type {SanityClient} from '@sanity/client'
import type {HearthState,Placement,PlacementCommand,PlacementEvent,PlacementResult} from '../domain'
import {stableSerialize} from '../matching'
import {applyPlacementCommand,getPlacementReadinessIssues} from '../placement'
import {hearthDocumentId} from './config'
import {decodeDocument,encodeDocument,type HearthDocument} from './documents'
import {readHearthContent} from './content'
import {HearthServiceError} from './client'
import {assertNativePlacementApproval} from './native-workflow'
import {assertBoundedJson} from './request-limits'

const KEYS:Record<PlacementCommand['type'],string[]>={
  create:['type','requestId','home','spiritIds','acceptedClauseIds','sourceSnapshot'],
  'record-consent':['type','requestId','placementId','expectedRev','party','decision','note'],
  'record-answer':['type','requestId','placementId','expectedRev','questionId','spiritId','answer','note'],
  'set-plan':['type','requestId','placementId','expectedRev','trialPlan','relocationPlan'],
  'refresh-review':['type','requestId','placementId','expectedRev','acceptedClauseIds'],
  transition:['type','requestId','placementId','expectedRev','to','note'],
}
export function validatePlacementEnvelope(value:unknown):asserts value is PlacementCommand {
  assertBoundedJson(value)
  if(!value||typeof value!=='object'||Array.isArray(value)) throw new HearthServiceError('INVALID_COMMAND',400,'Send a placement command object.')
  const record=value as Record<string,unknown>
  if(typeof record.type!=='string'||!Object.hasOwn(KEYS,record.type)||typeof record.requestId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{7,95}$/.test(record.requestId)) throw new HearthServiceError('INVALID_COMMAND',400,'A known operation and stable request ID are required.')
  const allowed=KEYS[record.type as PlacementCommand['type']]
  if(Object.keys(record).some(key=>!allowed.includes(key))) throw new HearthServiceError('INVALID_COMMAND',400,'The command contains unsupported fields.')
  const invalid=()=>{throw new HearthServiceError('INVALID_COMMAND',400,'The placement command contains invalid or unsupported fields.')}
  const object=(entry:unknown,keys:string[])=>{
    if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(key=>!keys.includes(key))) return invalid()
    return entry as Record<string,unknown>
  }
  const shortString=(entry:unknown,max:number)=>typeof entry==='string'&&entry.length>0&&entry.length<=max
  const identifiers=(entry:unknown,max:number)=>Array.isArray(entry)&&entry.length<=max&&entry.every(id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id))
  if(record.type==='create') {
    if(!identifiers(record.spiritIds,12)||(record.spiritIds as unknown[]).length<2||new Set(record.spiritIds as unknown[]).size!==(record.spiritIds as unknown[]).length||!identifiers(record.acceptedClauseIds,32)) invalid()
    const snapshot=object(record.sourceSnapshot,['fingerprint','revisions'])
    if(!shortString(snapshot.fingerprint,32_768)||!snapshot.revisions||typeof snapshot.revisions!=='object'||Array.isArray(snapshot.revisions)) invalid()
    const revisions=Object.entries(snapshot.revisions as Record<string,unknown>)
    if(revisions.length>128||revisions.some(([key,revision])=>!shortString(key,160)||!shortString(revision,160))) invalid()
  } else {
    if(typeof record.placementId!=='string'||!shortString(record.expectedRev,160)) invalid()
    try {hearthDocumentId('hearthPlacement',record.placementId as string)} catch {invalid()}
  }
  if(record.type==='refresh-review'&&!identifiers(record.acceptedClauseIds,32)) invalid()
  if(record.type==='set-plan') {
    object(record.trialPlan,['durationDays','checkInDays','successCriteria'])
    object(record.relocationPlan,['destination','coordinator','trigger','handoverNotes'])
  }
}
async function currentPlacementAndEvent(client:SanityClient,state:HearthState,command:PlacementCommand) {
  const eventId=hearthDocumentId('hearthPlacementEvent',`hearth-event-${command.requestId}`)
  const eventDocument=await client.getDocument<HearthDocument>(eventId)
  if(eventDocument) {
    const event=decodeDocument<PlacementEvent>(eventDocument)
    state={...state,events:[...state.events.filter(entry=>entry.id!==event.id),event]}
    const document=await client.getDocument<HearthDocument>(hearthDocumentId('hearthPlacement',event.placementId))
    if(document) {
      const placement=decodeDocument<Placement>(document)
      state={...state,placements:[...state.placements.filter(entry=>entry.id!==placement.id),placement]}
    }
  } else if(command.type!=='create'&&typeof command.placementId==='string') {
    const document=await client.getDocument<HearthDocument>(hearthDocumentId('hearthPlacement',command.placementId))
    if(document) {
      const placement=decodeDocument<Placement>(document)
      state={...state,placements:[...state.placements.filter(entry=>entry.id!==placement.id),placement]}
    }
  }
  return state
}
function requireSyntheticHome(state:HearthState,command:PlacementCommand) {
  if(command.type!=='create') return
  const home=state.homes.find(entry=>entry.id===command.home?.templateId)
  if(!home||stableSerialize(home.preferences)!==stableSerialize(command.home)) throw new HearthServiceError('PRESET_REQUIRED',422,'The live desk only records fictional home presets. Visitor quiz answers stay in the browser.')
}
export async function commitPlacementCommand(client:SanityClient,command:PlacementCommand,actor:string):Promise<PlacementResult> {
  validatePlacementEnvelope(command)
  let state=await currentPlacementAndEvent(client,await readHearthContent(client),command)
  const context={actor,now:new Date().toISOString()}
  let result=applyPlacementCommand(state,command,context)
  if(result.replayed) return result
  requireSyntheticHome(state,command)
  // Re-read published sources immediately before the commit. Source edits invalidate consent
  // in the domain engine; placement + audit writes below are atomic and revision-guarded.
  // This does not claim an atomic lock across independently editable source documents.
  state=await currentPlacementAndEvent(client,await readHearthContent(client),command)
  requireSyntheticHome(state,command)
  result=applyPlacementCommand(state,command,context)
  if(result.replayed) return result
  const nativeApproval=command.type==='transition'&&command.to==='trial'?await assertNativePlacementApproval(client,command.placementId,command.expectedRev):undefined
  const placementDocument={...encodeDocument('hearthPlacement',result.placement),trialReadiness:{ready:getPlacementReadinessIssues(result.state,result.placement).length===0,sourceFingerprint:result.placement.evaluation.sourceSnapshot.fingerprint}}
  const eventDocument={...encodeDocument('hearthPlacementEvent',result.event),...(nativeApproval?{nativeApproval}:{})}
  let transaction=client.transaction().create(eventDocument)
  if(command.type==='create') transaction=transaction.create(placementDocument)
  else {
    const {_id,_type,...fields}=placementDocument
    void _type
    transaction=transaction.patch(_id,patch=>patch.ifRevisionId(command.expectedRev).set(fields))
  }
  try {
    await transaction.commit({visibility:'sync',autoGenerateArrayKeys:true})
  } catch(error) {
    // A network timeout can follow a successful commit. A deterministic event is the receipt.
    const receipt=await client.getDocument<HearthDocument>(eventDocument._id).catch(()=>null)
    if(receipt) {
      const fresh=await currentPlacementAndEvent(client,await readHearthContent(client),command)
      const replay=applyPlacementCommand(fresh,command,context)
      if(replay.replayed) return replay
    }
    throw error
  }
  const refreshed=await currentPlacementAndEvent(client,await readHearthContent(client),command)
  const persisted=applyPlacementCommand(refreshed,command,context)
  return {...persisted,replayed:false}
}
