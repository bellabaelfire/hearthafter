import 'server-only'
import type {SanityClient} from '@sanity/client'
import {HEARTH_CONTENT_QUERY,HEARTH_PUBLIC_CONTENT_QUERY} from './config'
import {decodeHearthState,type RawHearthState} from './documents'
import {getHearthClient,HearthServiceError} from './client'
async function readContent(client:SanityClient,query:string) {
  const raw=await client.fetch<RawHearthState>(query,{}, {cache:'no-store'})
  try {return decodeHearthState(raw)} catch(error) {
    if(error instanceof Error&&error.message==='HEARTH_CONTENT_NOT_SEEDED') throw new HearthServiceError('CONTENT_NOT_SEEDED',503,'The Sanity connection is ready, but Hearthafter content has not been seeded yet.')
    throw new HearthServiceError('CONTENT_INVALID',502,'Some live content is incomplete. Review the Sanity records before using the matching desk.')
  }
}
/** Staff decisions always read current sources; they never use the guest browsing cache. */
export const readHearthContent=(client:SanityClient)=>readContent(client,HEARTH_CONTENT_QUERY)

const PUBLIC_CACHE_MS=1_000
/** One fixed configuration entry per isolate, with no request-controlled key or stale-on-error fallback. */
export function createPublicHearthContentReader(clientForRead:()=>SanityClient=getHearthClient,now:()=>number=()=>performance.now()) {
  type State=Awaited<ReturnType<typeof readContent>>
  let cached:{key:string;state:State;expiresAt:number}|undefined
  let pending:{key:string;promise:Promise<State>}|undefined
  return function readPublicContent():Promise<State> {
    const client=clientForRead()
    const config=client.config()
    const key=JSON.stringify([config.projectId,config.dataset,config.apiVersion])
    if(cached?.key===key&&now()<cached.expiresAt) return Promise.resolve(cached.state)
    if(pending?.key===key) return pending.promise
    cached=undefined
    const promise=readContent(client,HEARTH_PUBLIC_CONTENT_QUERY).then(state=>{
      if(!state.artwork) throw new HearthServiceError('ARTWORK_NOT_SEEDED',503,'The live artwork has not been published yet. Complete the approved artwork upload before connecting the public site.')
      if(pending?.promise===promise) cached={key,state,expiresAt:now()+PUBLIC_CACHE_MS}
      return state
    }).finally(()=>{if(pending?.promise===promise) pending=undefined})
    pending={key,promise}
    return promise
  }
}
/** The guest API uses an unauthenticated client AND a projection that omits staff records. */
export const readPublicHearthContent=createPublicHearthContentReader()
