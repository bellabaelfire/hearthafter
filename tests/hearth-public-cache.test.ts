import assert from 'node:assert/strict'
import test from 'node:test'
import {createRequire} from 'node:module'
import type {SanityClient} from '@sanity/client'
import {createInitialHearthState} from '../src/lib/hearth/fixtures'
import {DOCUMENT_TYPES,HEARTH_CONTENT_QUERY,HEARTH_PUBLIC_CONTENT_QUERY} from '../src/lib/hearth/sanity/config'
import {encodeState,type RawHearthState} from '../src/lib/hearth/sanity/documents'

const nodeRequire=createRequire(import.meta.url)
const boundary=nodeRequire.resolve('server-only')
nodeRequire.cache[boundary]={id:boundary,filename:boundary,loaded:true,exports:{}} as NodeModule
const moduleUnderTest=()=>import('../src/lib/hearth/sanity/content')

function rawState(revision:string):RawHearthState {
  const documents=encodeState(createInitialHearthState()).map(document=>({...document,_rev:revision}))
  const raw=Object.fromEntries(Object.entries(DOCUMENT_TYPES).map(([key,type])=>[key,key==='matchingPolicy'||key==='artwork'?documents.find(document=>document._type===type):documents.filter(document=>document._type===type)])) as RawHearthState
  raw.artwork={_id:'ha-artwork-site',_type:'hearthArtwork',_rev:revision,id:'site',heroUrl:'https://cdn.sanity.io/images/demo/production/hero.png',overlapUrl:'https://cdn.sanity.io/images/demo/production/overlap.png',portraitAtlasUrl:'https://cdn.sanity.io/images/demo/production/atlas.png'}
  return raw
}
function mockClient(fetch:(query:string)=>Promise<RawHearthState>,dataset=()=> 'production'):SanityClient {
  return {config:()=>({projectId:'demo',dataset:dataset(),apiVersion:'2026-10-02'}),fetch} as unknown as SanityClient
}

test('three concurrent public reads share one upstream operation and one successful result',async()=>{
  const {createPublicHearthContentReader}=await moduleUnderTest()
  let calls=0
  let resolve!:(value:RawHearthState)=>void
  const upstream=new Promise<RawHearthState>(done=>{resolve=done})
  const client=mockClient(async query=>{assert.equal(query,HEARTH_PUBLIC_CONTENT_QUERY);calls++;return upstream})
  const read=createPublicHearthContentReader(()=>client,()=>0)
  const pending=[read(),read(),read()]
  assert.equal(calls,1)
  resolve(rawState('revision-one'))
  const results=await Promise.all(pending)
  assert.ok(results.every(state=>state.matchingPolicy.rev==='revision-one'))
  assert.ok(results.every(state=>state.placements.length===0&&state.events.length===0))
  assert.equal(calls,1)
})

test('public cache expires at one second from a successful read and then loads a new revision',async()=>{
  const {createPublicHearthContentReader}=await moduleUnderTest()
  let clock=0
  let calls=0
  const client=mockClient(async()=>{calls++;clock+=50;return rawState(`revision-${calls}`)})
  const read=createPublicHearthContentReader(()=>client,()=>clock)
  assert.equal((await read()).matchingPolicy.rev,'revision-1')
  clock=1049
  assert.equal((await read()).matchingPolicy.rev,'revision-1')
  assert.equal(calls,1)
  clock=1050
  assert.equal((await read()).matchingPolicy.rev,'revision-2')
  assert.equal(calls,2)
})

test('an expired public cache never substitutes old data for a failed or invalid read',async()=>{
  const {createPublicHearthContentReader}=await moduleUnderTest()
  let clock=0
  let calls=0
  const client=mockClient(async()=>{
    calls++
    if(calls===2) throw Error('upstream temporarily unavailable')
    if(calls===3) return {...rawState('invalid'),artwork:null}
    return rawState(`revision-${calls}`)
  })
  const read=createPublicHearthContentReader(()=>client,()=>clock)
  assert.equal((await read()).matchingPolicy.rev,'revision-1')
  clock=1000
  await assert.rejects(read(),/upstream temporarily unavailable/)
  await assert.rejects(read(),/artwork has not been published/)
  assert.equal((await read()).matchingPolicy.rev,'revision-4')
  assert.equal(calls,4)
})

test('staff source checks bypass a populated browsing cache and configured datasets do not share results',async()=>{
  const {createPublicHearthContentReader,readHearthContent}=await moduleUnderTest()
  let dataset='production'
  let calls=0
  const queries:string[]=[]
  const client=mockClient(async query=>{queries.push(query);return rawState(`revision-${++calls}`)},()=>dataset)
  const read=createPublicHearthContentReader(()=>client,()=>0)
  assert.equal((await read()).matchingPolicy.rev,'revision-1')
  assert.equal((await readHearthContent(client)).matchingPolicy.rev,'revision-2')
  assert.equal((await readHearthContent(client)).matchingPolicy.rev,'revision-3')
  assert.equal((await read()).matchingPolicy.rev,'revision-1')
  dataset='other'
  assert.equal((await read()).matchingPolicy.rev,'revision-4')
  assert.deepEqual(queries,[HEARTH_PUBLIC_CONTENT_QUERY,HEARTH_CONTENT_QUERY,HEARTH_CONTENT_QUERY,HEARTH_PUBLIC_CONTENT_QUERY])
})
