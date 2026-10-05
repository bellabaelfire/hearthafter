import assert from 'node:assert/strict'
import test from 'node:test'
import {createRequire} from 'node:module'
import type {HearthState, Placement} from '../src/lib/hearth/domain'
import {createInitialHearthState} from '../src/lib/hearth/fixtures'
import {rankPairs} from '../src/lib/hearth/matching'
import {applyPlacementCommand} from '../src/lib/hearth/placement'
import {DOCUMENT_TYPES,HEARTH_PUBLIC_CONTENT_QUERY,hearthDocumentId} from '../src/lib/hearth/sanity/config'
import {decodeDocument,decodeHearthState,encodeDocument,encodeState,type HearthDocument,type RawHearthState} from '../src/lib/hearth/sanity/documents'

function transport(state:HearthState):RawHearthState {
  const documents=encodeState(state).map(document=>({...document,_rev:`transport-${document.id}`}))
  return Object.fromEntries(Object.entries(DOCUMENT_TYPES).map(([key,type])=>[key,key==='matchingPolicy'||key==='artwork'?documents.find(document=>document._type===type):documents.filter(document=>document._type===type)])) as RawHearthState
}
test('public source IDs stay at root while private review IDs fit the longest command ID',()=>{
  for(const type of Object.values(DOCUMENT_TYPES).filter(type=>!['hearthPlacement','hearthPlacementEvent'].includes(type)))assert.ok(!hearthDocumentId(type,'example').includes('.'))
  const token='x'.repeat(96)
  for(const [type,id] of [['hearthPlacementEvent',`hearth-event-${token}`],['hearthPlacement',`placement-${token}`]]) {
    const documentId=hearthDocumentId(type,id)
    assert.ok(documentId.includes('.'))
    assert.ok(documentId.length<=128)
  }
  assert.throws(()=>hearthDocumentId('toString','example'))
  assert.throws(()=>hearthDocumentId('hearthSpirit','drafts.hidden'))
})
test('every seeded native reference resolves inside the same synthetic document set',()=>{
  const documents=encodeState(createInitialHearthState())
  const ids=new Set(documents.map(document=>document._id))
  assert.equal(ids.size,documents.length)
  function visit(value:unknown):void {
    if(Array.isArray(value)){value.forEach(visit);return}
    if(value&&typeof value==='object') {
      const entry=value as Record<string,unknown>
      if(entry._type==='reference')assert.ok(ids.has(String(entry._ref)),`Missing reference: ${entry._ref}`)
      Object.values(entry).forEach(visit)
    }
  }
  documents.forEach(visit)
})
test('content transport removes Sanity metadata, restores unions, and uses real revisions',()=>{
  const state=createInitialHearthState()
  state.spirits[0].audibleHours='none'
  const decoded=decodeHearthState(transport(state))
  for(const key of Object.keys(DOCUMENT_TYPES) as (keyof HearthState)[]) {
    if(key==='artwork'){assert.equal(decoded.artwork,undefined);continue}
    if(key==='matchingPolicy'){assert.deepEqual(decoded[key],{...state[key],rev:`transport-${state[key].id}`});continue}
    assert.deepEqual(decoded[key],state[key].map(entry=>'rev' in entry?{...entry,rev:`transport-${entry.id}`}:entry))
  }
  assert.ok(decoded.spirits.some(spirit=>spirit.audibleHours==='none'))
})
test('placement evidence and exact idempotency receipts survive persisted round trips',()=>{
  const state=decodeHearthState(transport(createInitialHearthState()))
  const home=state.homes[0].preferences
  const evaluation=rankPairs(state,home,['quiet-hours']).find(pair=>pair.status==='eligible')!
  assert.ok(evaluation)
  const command={type:'create' as const,requestId:'transport-request-001',home,spiritIds:evaluation.spiritIds,acceptedClauseIds:evaluation.acceptedClauseIds,sourceSnapshot:evaluation.sourceSnapshot}
  const result=applyPlacementCommand(state,command,{actor:'Fictional reviewer',now:'2026-10-02T12:00:00Z'})
  const stored=encodeDocument('hearthPlacement',result.placement)
  const decoded=decodeDocument<Placement>({...stored,_rev:'actual-sanity-revision'})
  assert.deepEqual(decoded,{...result.placement,rev:'actual-sanity-revision'})
  const roundtrip=decodeHearthState(transport(result.state))
  const replay=applyPlacementCommand(roundtrip,command,{actor:'Fictional reviewer',now:'2026-10-02T13:00:00Z'})
  assert.equal(replay.replayed,true)
  assert.equal(replay.event.requestPayload,result.event.requestPayload)
  assert.equal(replay.placement.rev,`transport-${result.placement.id}`)
})
test('missing seed or transport revisions fail instead of supplying preview data',()=>{
  const raw=transport(createInitialHearthState())
  assert.throws(()=>decodeHearthState({...raw,matchingPolicy:null}),/NOT_SEEDED/)
  assert.throws(()=>decodeHearthState({...raw,matchingPolicy:{...raw.matchingPolicy!,_rev:undefined}}),/INVALID/)
  const broken={...raw,spirits:[{...raw.spirits[0],_rev:undefined} as HearthDocument]}
  assert.throws(()=>decodeHearthState(broken),/INVALID/)
})
test('the guest content projection excludes staff records even from an authenticated dataset',async()=>{
  const require=createRequire(import.meta.url)
  const groq=createRequire(require.resolve('@sanity/workflow-engine'))('groq-js')
  const documents=encodeState(createInitialHearthState())
  documents.push({_id:hearthDocumentId('hearthPlacement','staff-example'),_type:'hearthPlacement',id:'staff-example',note:'Staff-only note'})
  documents.push({_id:hearthDocumentId('hearthPlacementEvent','staff-event'),_type:'hearthPlacementEvent',id:'staff-event',actor:'Private reviewer'})
  const result=await (await groq.evaluate(groq.parse(HEARTH_PUBLIC_CONTENT_QUERY),{dataset:documents})).get()
  assert.deepEqual(result.placements,[])
  assert.deepEqual(result.events,[])
  assert.equal(result.spirits.length,documents.filter(document=>document._type==='hearthSpirit').length)
  assert.ok(!JSON.stringify(result).includes('Private reviewer'))
})

test('published artwork resolves native image references into the live URL contract',async()=>{
  const require=createRequire(import.meta.url)
  const groq=createRequire(require.resolve('@sanity/workflow-engine'))('groq-js')
  const documents:Record<string,unknown>[]=encodeState(createInitialHearthState()).map(document=>({...document,_rev:`real-${document.id}`}))
  const image=(id:string)=>({_type:'image',asset:{_type:'reference',_ref:id}})
  const urls={heroUrl:'https://cdn.sanity.io/images/demo/production/hero.png',overlapUrl:'https://cdn.sanity.io/images/demo/production/overlap.png',portraitAtlasUrl:'https://cdn.sanity.io/images/demo/production/atlas.png'}
  documents.push({_id:hearthDocumentId('hearthArtwork','site'),_type:'hearthArtwork',_rev:'art-revision',id:'site',hero:image('hero-asset'),overlap:image('overlap-asset'),portraitAtlas:image('atlas-asset')})
  for(const [id,url] of [['hero-asset',urls.heroUrl],['overlap-asset',urls.overlapUrl],['atlas-asset',urls.portraitAtlasUrl]])documents.push({_id:id,_type:'sanity.imageAsset',url})
  const raw=await (await groq.evaluate(groq.parse(HEARTH_PUBLIC_CONTENT_QUERY),{dataset:documents})).get()
  assert.deepEqual(decodeHearthState(raw).artwork,{id:'site',rev:'art-revision',...urls})
  assert.equal(JSON.stringify(raw.artwork).includes('_ref'),false)
})
test('live artwork rejects local preview paths and incomplete native image projections',()=>{
  const raw=transport(createInitialHearthState())
  const artwork={_id:hearthDocumentId('hearthArtwork','site'),_type:'hearthArtwork',_rev:'real-art',id:'site',heroUrl:'/images/hero.png',overlapUrl:'https://cdn.sanity.io/images/demo/production/overlap.png',portraitAtlasUrl:'https://cdn.sanity.io/images/demo/production/atlas.png'}
  assert.throws(()=>decodeHearthState({...raw,artwork}),/INVALID/)
  assert.throws(()=>decodeHearthState({...raw,artwork:{...artwork,heroUrl:artwork.overlapUrl,portraitAtlasUrl:undefined}}),/INVALID/)
})
test('placement source revision maps use valid Content Lake attributes and preserve the exact snapshot',()=>{
  const state=decodeHearthState(transport(createInitialHearthState()))
  const home=state.homes[0].preferences
  const evaluation=rankPairs(state,home,['quiet-hours']).find(pair=>pair.status==='eligible')!
  const result=applyPlacementCommand(state,{type:'create',requestId:'sanity-attribute-regression',home,spiritIds:evaluation.spiritIds,acceptedClauseIds:evaluation.acceptedClauseIds,sourceSnapshot:evaluation.sourceSnapshot},{actor:'Synthetic reviewer',now:'2026-10-02T16:00:00Z'})
  const encoded=encodeDocument('hearthPlacement',result.placement)
  function visit(value:unknown):void {
    if(Array.isArray(value)){value.forEach(visit);return}
    if(value&&typeof value==='object')for(const [key,entry] of Object.entries(value)){assert.match(key,/^\$?[a-zA-Z0-9_-]+$/);visit(entry)}
  }
  visit(encoded)
  const storedSnapshot=(encoded.evaluation as {sourceSnapshot:{revisions:unknown}}).sourceSnapshot
  assert.ok(Array.isArray(storedSnapshot.revisions))
  const decoded=decodeDocument<Placement>({...encoded,_rev:'live-regression-revision'})
  assert.deepEqual(decoded.evaluation.sourceSnapshot,evaluation.sourceSnapshot)
  const malformed=structuredClone(encoded)
  ;((malformed.evaluation as {sourceSnapshot:{revisions:unknown[]}}).sourceSnapshot.revisions).push({source:'duplicate',revision:42})
  assert.throws(()=>decodeDocument<Placement>(malformed),/INVALID/)
})