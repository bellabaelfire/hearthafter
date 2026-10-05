'use client'
import {Component,Suspense,useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {SanityApp,useClient,useDocument,useEditDocument,useQuery} from '@sanity/sdk-react'
import {useCurrentUser} from 'sanity'
import type {HearthState,PairRelationship,PlacementCommand,PlacementResult} from '@/lib/hearth/domain'
import {createInitialHearthState} from '@/lib/hearth/fixtures'
import {stableSerialize} from '@/lib/hearth/matching'
import {applyPlacementCommand} from '@/lib/hearth/placement'
import {HEARTH_API_VERSION,HEARTH_CONTENT_QUERY,hearthDocumentId} from '@/lib/hearth/sanity/config'
import {decodeHearthState,type RawHearthState} from '@/lib/hearth/sanity/documents'
import {persistPairingGuidance} from '@/lib/hearth/sanity/persist-pairing-guidance'
import DeskView,{type PlacementIntent} from './DeskView'
import {NativeWorkflowPanel} from './NativeWorkflowPanel'

const API_ORIGIN=(process.env.NEXT_PUBLIC_HEARTH_API_ORIGIN||process.env.SANITY_STUDIO_HEARTH_API_ORIGIN||'').replace(/\/$/,'')
class DeskErrorBoundary extends Component<{children:ReactNode},{error:string|null}> {
  state:{error:string|null}={error:null}
  static getDerivedStateFromError(error:Error) {return {error:error.message}}
  render(){return this.state.error?<main className="hearth-desk"><h1>The live desk could not load.</h1><p>The shared register could not be reached. Check your connection and sign-in, then try again.</p><button onClick={()=>window.location.reload()}>Retry connection</button></main>:this.props.children}
}
function RelationshipEditor({relationship,canEdit}:{relationship:PairRelationship;canEdit:boolean}) {
  const handle={documentId:hearthDocumentId('hearthPairRelationship',relationship.id),documentType:'hearthPairRelationship',liveEdit:true}
  const {data:status}=useDocument<PairRelationship['status']>({...handle,path:'status'})
  const edit=useEditDocument<PairRelationship['status']>({...handle,path:'status'})
  const [choice,setChoice]=useState<PairRelationship['status']|null>(null)
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const saving=useRef(false)
  async function save(){if(!choice||saving.current)return;saving.current=true;setBusy(true);setMessage('Saving pairing guidance.');try{await persistPairingGuidance(edit,choice);setChoice(null);setMessage('Pairing guidance saved. Recommendations are updating.')}catch{setMessage('The rule was not saved. Check your connection and editing permission.')}finally{saving.current=false;setBusy(false)}}
  return <div className="desk-editor"><div><h3>{relationship.title}</h3><p>{relationship.description}</p></div><label className="desk-field">Pairing guidance<select value={choice??status??relationship.status} onChange={event=>setChoice(event.target.value as PairRelationship['status'])} disabled={!canEdit||busy}><option value="friendly">Friendly</option><option value="unacquainted">Unacquainted</option><option value="do-not-pair">Do not pair</option></select></label><button disabled={!canEdit||busy||choice===null} onClick={()=>void save()}>Save guidance</button><p role="status">{message}</p></div>
}
function LiveDesk(){
  const {data:raw}=useQuery<RawHearthState>({query:HEARTH_CONTENT_QUERY,perspective:'published'})
  const state=useMemo(()=>decodeHearthState(raw),[raw])
  const client=useClient({apiVersion:HEARTH_API_VERSION})
  const user=useCurrentUser()
  const canEdit=Boolean(user?.roles.some(role=>role.name==='administrator'))
  const [confirmed,setConfirmed]=useState<HearthState|null>(null)
  const [relationshipId,setRelationshipId]=useState('')
  const retry=useRef<{intent:string;command:PlacementCommand}|null>(null)
  useEffect(()=>{setConfirmed(null)},[raw])
  const displayed=confirmed??state
  const relationship=displayed.pairRelationships.find(entry=>entry.id===relationshipId)||displayed.pairRelationships[0]
  async function commit(intent:PlacementIntent){
    const token=client.config().token
    if(!token)throw new Error('Your staff session is unavailable. Sign in again to record this decision.')
    const identity=stableSerialize(intent)
    const command=retry.current?.intent===identity?retry.current.command:{...intent,requestId:crypto.randomUUID()} as PlacementCommand
    retry.current={intent:identity,command}
    const response=await fetch(`${API_ORIGIN}/api/placements`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(command)})
    const result=await response.json() as PlacementResult&{error?:string}
    if(!response.ok){if(response.status<500)retry.current=null;throw new Error(result.error||'The placement could not be recorded.')}
    retry.current=null;setConfirmed(result.state);return result
  }
  return <DeskView state={displayed} mode="sanity" canEdit={canEdit} onCommand={commit} nativeReview={placement=><NativeWorkflowPanel placementId={placement.id} revision={placement.rev} disabled={!canEdit||placement.status!=='review'}/>} editor={<><label className="desk-field">Pairing rule<select value={relationship?.id||''} onChange={event=>setRelationshipId(event.target.value)}>{displayed.pairRelationships.map(entry=><option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>{relationship&&<Suspense fallback={<p>Loading live pairing rule…</p>}><RelationshipEditor key={relationship.id} relationship={relationship} canEdit={canEdit}/></Suspense>}</>}/>
}
/** A real App SDK tool, mounted within the Studio's authenticated context. */
export default function HearthDesk(){return <DeskErrorBoundary><SanityApp fallback={<div className="hearth-desk">Opening the placement desk.</div>}><Suspense fallback={<div className="hearth-desk">Loading household records and current reviews.</div>}><LiveDesk/></Suspense></SanityApp></DeskErrorBoundary>}

export function OfflineHearthDesk(){
  const [state,setState]=useState(createInitialHearthState)
  const [relationshipId,setRelationshipId]=useState('')
  const [choice,setChoice]=useState<PairRelationship['status']|null>(null)
  const relationship=state.pairRelationships.find(entry=>entry.id===relationshipId)||state.pairRelationships[0]
  async function commit(intent:PlacementIntent){const result=applyPlacementCommand(state,{...intent,requestId:crypto.randomUUID()} as PlacementCommand,{actor:'Preview reviewer',now:new Date().toISOString()});setState(result.state);return result}
  function editRelationship(){if(!relationship||!choice)return;setState(current=>({...current,pairRelationships:current.pairRelationships.map(entry=>entry.id===relationship.id?{...entry,status:choice,rev:`preview-${crypto.randomUUID()}`}:entry)}));setChoice(null)}
  return <DeskView state={state} mode="offline" canEdit onCommand={commit} editor={relationship?<div className="desk-editor"><label className="desk-field">Pairing rule<select value={relationship.id} onChange={event=>{setRelationshipId(event.target.value);setChoice(null)}}>{state.pairRelationships.map(entry=><option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label><label className="desk-field">Preview relationship<select value={choice??relationship.status} onChange={event=>setChoice(event.target.value as PairRelationship['status'])}><option value="friendly">Friendly</option><option value="unacquainted">Unacquainted</option><option value="do-not-pair">Do not pair</option></select></label><button disabled={choice===null} onClick={editRelationship}>Apply preview change</button><p className="desk-muted">This change stays in the offline preview.</p></div>:<p>Add pairing guidance to manage introductions.</p>}/>
}
