import assert from 'node:assert/strict'
import test from 'node:test'
import {createRequire} from 'node:module'
import {createInitialHearthState} from '../src/lib/hearth/fixtures'
import {rankPairs} from '../src/lib/hearth/matching'

// These tests execute server modules in Node. Next's build still enforces their server-only boundary.
const nodeRequire = createRequire(import.meta.url)
const boundary = nodeRequire.resolve('server-only')
nodeRequire.cache[boundary] = {id:boundary,filename:boundary,loaded:true,exports:{}} as NodeModule
const limits = () => import('../src/lib/hearth/sanity/request-limits')
const isFailure = (code:string,status:number) => (error:unknown) => Boolean(error&&typeof error==='object'&&'code' in error&&'status' in error&&error.code===code&&error.status===status)
const jsonRequest = (body:BodyInit,headers:Record<string,string>={}) => new Request('http://localhost:3333/api/placements',{method:'POST',headers:{'Content-Type':'application/json',...headers},body,duplex:'half'} as RequestInit)

test('placement requests enforce UTF-8 wire bytes, including chunked bodies without Content-Length',async()=>{
  const {readPlacementJson,PLACEMENT_BODY_LIMIT}=await limits()
  const body=JSON.stringify('é'.repeat(PLACEMENT_BODY_LIMIT/2))
  assert.ok(body.length<PLACEMENT_BODY_LIMIT)
  const bytes=new TextEncoder().encode(body)
  let cancelled=false
  let offset=0
  const stream=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(bytes.slice(offset,offset+4096));offset+=4096},cancel(){cancelled=true}})
  await assert.rejects(readPlacementJson(jsonRequest(stream)),isFailure('REQUEST_TOO_LARGE',413))
  assert.equal(cancelled,true)
  const accepted='"'+'x'.repeat(PLACEMENT_BODY_LIMIT-2)+'"'
  assert.equal((await readPlacementJson(jsonRequest(accepted)) as string).length,PLACEMENT_BODY_LIMIT-2)
})

test('oversized Content-Length is rejected before reading the stream and JSON media types match exactly',async()=>{
  const {readPlacementJson}=await limits()
  const request={headers:new Headers({'content-type':'application/json','content-length':'999999999999'}),get body(){throw Error('The body must not be read')}} as unknown as Request
  await assert.rejects(readPlacementJson(request),isFailure('REQUEST_TOO_LARGE',413))
  for(const type of ['text/application/json','application/jsonp','application/json-malformed']) await assert.rejects(readPlacementJson(jsonRequest('{}',{'Content-Type':type})),isFailure('INVALID_CONTENT_TYPE',415))
  assert.deepEqual(await readPlacementJson(jsonRequest('{}',{'Content-Type':'Application/JSON; charset=utf-8'})),{})
})

test('slow or invalid request bodies fail safely and release the body stream',async()=>{
  const {readPlacementJson}=await limits()
  let cancelled=false
  const stream=new ReadableStream<Uint8Array>({cancel(){cancelled=true}})
  await assert.rejects(readPlacementJson(jsonRequest(stream),20),isFailure('REQUEST_TIMEOUT',408))
  assert.equal(cancelled,true)
  await assert.rejects(readPlacementJson(jsonRequest(new Uint8Array([34,0xff,34]))),SyntaxError)
  await assert.rejects(readPlacementJson(jsonRequest('{broken}')),SyntaxError)
})

test('bounded JSON rejects deep and wide values before recursive domain serialization',async()=>{
  const {readPlacementJson,assertBoundedJson}=await limits()
  await assert.rejects(readPlacementJson(jsonRequest('['.repeat(100)+'0'+']'.repeat(100))),isFailure('REQUEST_TOO_COMPLEX',400))
  assert.throws(()=>assertBoundedJson(Array.from({length:4096},()=>0)),isFailure('REQUEST_TOO_COMPLEX',400))
  assert.doesNotThrow(()=>assertBoundedJson({trialPlan:{durationDays:14,checkInDays:[3,7,14],successCriteria:'A considered fictional trial plan.'}}))
})

test('placement envelopes accept actual reviewed fixtures and reject nested persisted extras or invalid document IDs',async()=>{
  const {validatePlacementEnvelope}=await import('../src/lib/hearth/sanity/repository')
  const state=createInitialHearthState()
  const home=state.homes[0].preferences
  const evaluation=rankPairs(state,home,['quiet-hours']).find(pair=>pair.status==='eligible')!
  const command={type:'create',requestId:'security-valid-fixture',home,spiritIds:evaluation.spiritIds,acceptedClauseIds:evaluation.acceptedClauseIds,sourceSnapshot:evaluation.sourceSnapshot}
  assert.doesNotThrow(()=>validatePlacementEnvelope(command))
  assert.throws(()=>validatePlacementEnvelope({...command,sourceSnapshot:{...command.sourceSnapshot,unexpected:'not evidence'}}),isFailure('INVALID_COMMAND',400))
  const plan={type:'set-plan',requestId:'security-plan-001',placementId:'placement-security-valid-fixture',expectedRev:'valid-revision',trialPlan:{durationDays:14,checkInDays:[7,14],successCriteria:'A bounded fictional trial plan.'},relocationPlan:{destination:'The quiet home',coordinator:'Office reviewer',trigger:'Any party asks to leave.',handoverNotes:'A safe and voluntary handover.'}}
  assert.doesNotThrow(()=>validatePlacementEnvelope(plan))
  assert.throws(()=>validatePlacementEnvelope({...plan,trialPlan:{...plan.trialPlan,privateToken:'unexpected'}}),isFailure('INVALID_COMMAND',400))
  assert.throws(()=>validatePlacementEnvelope({...plan,placementId:'drafts.someone-else'}),isFailure('INVALID_COMMAND',400))
  assert.throws(()=>validatePlacementEnvelope({...plan,relocationPlan:[]}),isFailure('INVALID_COMMAND',400))
})

test('reviewer tokens and trusted origins reject unauthenticated, overlong, and cross-site requests locally',async()=>{
  const {reviewerToken,assertTrustedOrigin,corsHeaders}=await import('../src/lib/hearth/sanity/auth')
  const request=(headers:Record<string,string>)=>new Request('http://localhost:3333/api/placements',{headers})
  for(const authorization of ['', 'Basic rejected', 'Bearer '+'a'.repeat(4097)]) assert.throws(()=>reviewerToken(request({authorization})),isFailure('SIGN_IN_REQUIRED',401))
  assert.throws(()=>assertTrustedOrigin(request({origin:'https://attacker.example'})),isFailure('UNTRUSTED_ORIGIN',403))
  assert.throws(()=>assertTrustedOrigin(request({})),isFailure('UNTRUSTED_ORIGIN',403))
  assert.doesNotThrow(()=>assertTrustedOrigin(request({origin:'http://localhost:3333'})))
  assert.equal(corsHeaders(request({origin:'https://attacker.example'}))['Access-Control-Allow-Origin'],undefined)
})

test('the placement route rejects unauthorized and malformed requests before a Sanity operation',async()=>{
  const priorMode=process.env.HEARTH_DATA_MODE
  process.env.HEARTH_DATA_MODE='sanity'
  try {
    const {POST}=await import('../src/app/api/placements/route')
    const trusted={Origin:'http://localhost:3333',Authorization:'Bearer '+'x'.repeat(24)}
    const cases:[Request,number,string][]=[
      [jsonRequest('{}',{Origin:trusted.Origin}),401,'SIGN_IN_REQUIRED'],
      [jsonRequest('{}',{...trusted,Origin:'https://attacker.example'}),403,'UNTRUSTED_ORIGIN'],
      [jsonRequest('{}',{...trusted,'Content-Type':'application/jsonp'}),415,'INVALID_CONTENT_TYPE'],
      [jsonRequest('{}',{...trusted,'Content-Length':'65537'}),413,'REQUEST_TOO_LARGE'],
      [jsonRequest('['.repeat(15)+'0'+']'.repeat(15),trusted),400,'REQUEST_TOO_COMPLEX'],
      [jsonRequest('{malformed}',trusted),400,'INVALID_JSON'],
      [jsonRequest('{}',trusted),400,'INVALID_COMMAND'],
    ]
    for(const [request,status,code] of cases) {
      const response=await POST(request)
      assert.equal(response.status,status)
      assert.equal((await response.json()).code,code)
      assert.match(response.headers.get('cache-control')??'',/no-store/)
    }
  } finally {
    if(priorMode===undefined) delete process.env.HEARTH_DATA_MODE
    else process.env.HEARTH_DATA_MODE=priorMode
  }
})

test('unexpected service failures do not expose exception details in HTTP responses',async()=>{
  const {errorResponse}=await import('../src/lib/hearth/sanity/http')
  const response=errorResponse(new Error('simulated private diagnostic'),new Request('http://localhost:3333/api/placements'))
  assert.equal(response.status,502)
  const body=await response.text()
  assert.ok(!body.includes('simulated private diagnostic'))
  assert.ok(body.includes('SANITY_UNAVAILABLE'))
})
