import assert from "node:assert/strict";
import test from "node:test";
import {withApiProtection, type HearthEdgeEnvironment, type RateLimitBinding} from "../src/lib/cloudflare/api-protection";

const address = "203.0.113.7";
function edgeRequest(path: string, options: {method?: string; headers?: Record<string,string>; edge?: boolean} = {}) {
  const request = new Request(`https://hearthafter.example${path}`, {method:options.method || "GET",headers:{"CF-Connecting-IP":address,...options.headers}});
  if(options.edge !== false) Object.defineProperty(request,"cf",{value:{colo:"IAD"}});
  return request;
}
function harness(registry?: RateLimitBinding, staff?: RateLimitBinding) {
  let upstreamCalls = 0;
  const upstream = async () => { upstreamCalls++; return new Response("upstream"); };
  const env: HearthEdgeEnvironment = {HEARTH_REGISTRY_RATE_LIMITER:registry,HEARTH_STAFF_RATE_LIMITER:staff};
  return {env,fetch:withApiProtection(upstream),calls:()=>upstreamCalls};
}
function allowance(maximum=60) {
  const calls:string[]=[];
  const counts = new Map<string,number>();
  const binding:RateLimitBinding={limit:async ({key})=>{calls.push(key); const count=(counts.get(key) || 0)+1;counts.set(key,count);return {success:count<=maximum};}};
  return {binding,calls};
}

test("registry polling and a full staff answer sequence use separate budgets before upstream",async()=>{
 const registry=allowance(),staff=allowance(),h=harness(registry.binding,staff.binding);
 for(let index=0;index<12;index++) assert.equal((await h.fetch(edgeRequest("/api/content"),h.env,{})).status,200);
 assert.equal((await h.fetch(edgeRequest("/api/session"),h.env,{})).status,200);
 for(let index=0;index<9;index++) assert.equal((await h.fetch(edgeRequest("/api/placements",{method:"POST"}),h.env,{})).status,200);
 assert.equal(registry.calls.length,12);assert.equal(staff.calls.length,10);assert.equal(h.calls(),22);
 assert.match(registry.calls[0],/^hearthafter:v1:registry:/);assert.match(staff.calls[0],/^hearthafter:v1:staff:/);
});

test("registry excess returns429 without Next or Sanity calls and is not cached",async()=>{
 const registry=allowance(2),h=harness(registry.binding,allowance().binding);
 await h.fetch(edgeRequest("/api/content"),h.env,{});await h.fetch(edgeRequest("/api/content"),h.env,{});
 const response=await h.fetch(edgeRequest("/api/content?new=key",{headers:{"X-Forwarded-For":"198.51.100.2","X-Real-IP":"198.51.100.3","Authorization":"Bearer changed"}}),h.env,{});
 assert.equal(response.status,429);assert.equal(response.headers.get("retry-after"),"60");assert.equal(response.headers.get("cache-control"),"no-store");assert.equal(h.calls(),2);
 assert.equal(new Set(registry.calls).size,1);
 assert.equal((await response.json()).code,"RATE_LIMITED");
});

test("session and placement attempts share one staff budget despite changed bearer tokens or paths",async()=>{
 const staff=allowance(1),h=harness(allowance().binding,staff.binding);
 await h.fetch(edgeRequest("/api/session",{headers:{Authorization:"Bearer fake-one"}}),h.env,{});
 const response=await h.fetch(edgeRequest("/api/placements/",{method:"POST",headers:{Authorization:"Bearer fake-two"}}),h.env,{});
 assert.equal(response.status,429);assert.equal(h.calls(),1);assert.equal(staff.calls[0],staff.calls[1]);
});

test("missing, throwing and malformed limiter bindings fail closed before upstream",async()=>{
 for(const binding of [undefined,{limit:async()=>{throw new Error("private failure")}}, {limit:async()=>({})} as unknown as RateLimitBinding]) {
  const h=harness(binding,binding);
  for(const path of ["/api/content","/api/session","/api/placements"]) {
   const response=await h.fetch(edgeRequest(path),h.env,{});
   assert.equal(response.status,503);assert.equal(response.headers.get("retry-after"),"30");assert.doesNotMatch(await response.text(),/private failure/);
  }
  assert.equal(h.calls(),0);
 }
});

test("a stalled native limiter is bounded and never falls through",async()=>{
 const h=harness({limit:()=>new Promise(()=>{})});
 const response=await h.fetch(edgeRequest("/api/content"),h.env,{});
 assert.equal(response.status,503);assert.equal(h.calls(),0);
});

test("only a valid Cloudflare-supplied ingress identity is used",async()=>{
 const limiter=allowance(),h=harness(limiter.binding,limiter.binding);
 for(const options of [{edge:false},{headers:{"CF-Connecting-IP":""}},{headers:{"CF-Connecting-IP":"bad, 203.0.113.8","X-Forwarded-For":address}},{headers:{"CF-Connecting-IP":"127.1"}}] as {edge?:boolean;headers?:Record<string,string>}[]) {
  assert.equal((await h.fetch(edgeRequest("/api/content",options),h.env,{})).status,503);
 }
 assert.equal(h.calls(),0);assert.equal(limiter.calls.length,0);
 await h.fetch(edgeRequest("/api/content",{headers:{"CF-Connecting-IP":"2001:db8::1"}}),h.env,{});
 await h.fetch(edgeRequest("/api/content",{headers:{"CF-Connecting-IP":"2001:0db8:0:0:0:0:0:1"}}),h.env,{});
 assert.equal(limiter.calls[0],limiter.calls[1]);
});

test("encoded and repeated path forms remain guarded, while ordinary pages pass through",async()=>{
 const h=harness();
 for(const path of ["/api/%63ontent","/api/content/","/api//session","/api%2Fplacements","/api/placements/unknown"]) assert.equal((await h.fetch(edgeRequest(path),h.env,{})).status,503);
 assert.equal(h.calls(),0);
 assert.equal((await h.fetch(edgeRequest("/world",{edge:false}),h.env,{})).status,200);
 assert.equal(h.calls(),1);
});

test("rejections expose CORS only to the configured Studio origin",async()=>{
 const h=harness();h.env.HEARTH_STUDIO_ORIGIN="https://studio.example";
 const trusted=await h.fetch(edgeRequest("/api/session",{headers:{Origin:"https://studio.example"}}),h.env,{});
 assert.equal(trusted.status,503);assert.equal(trusted.headers.get("access-control-allow-origin"),"https://studio.example");assert.equal(trusted.headers.get("vary"),"Origin");
 const unknown=await h.fetch(edgeRequest("/api/session",{headers:{Origin:"https://attacker.example"}}),h.env,{});
 assert.equal(unknown.headers.get("access-control-allow-origin"),null);
});

function bodyRequest(body: BodyInit, headers: Record<string,string>={}) {
 const request=new Request("https://hearthafter.example/api/placements",{method:"POST",headers:{"CF-Connecting-IP":address,...headers},body,duplex:"half"} as RequestInit);
 Object.defineProperty(request,"cf",{value:{colo:"IAD"}});
 return request;
}

test("oversized declared bodies are rejected before reading or delegating",async()=>{
 const h=harness(allowance().binding,allowance().binding);
 const response=await h.fetch(bodyRequest("{}",{"Content-Length":"65537"}),h.env,{});
 assert.equal(response.status,413);assert.equal(h.calls(),0);
});

test("oversized chunked and underdeclared bodies cannot reach the generated adapter",async()=>{
 for(const headers of [{},{"Content-Length":"2"}] as Record<string,string>[]) {
  const h=harness(allowance().binding,allowance().binding);
  const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(32768));controller.enqueue(new Uint8Array(32769));controller.close();}});
  const response=await h.fetch(bodyRequest(body,headers),h.env,{});
  assert.equal(response.status,413);assert.equal(h.calls(),0);
 }
});

test("accepted bytes are preserved exactly for the generated adapter",async()=>{
 const original="{\"note\":\"quiet café\"}";
 const fetch=withApiProtection(async(request:Request)=>new Response(await request.text()));
 const response=await fetch(bodyRequest(original),{HEARTH_STAFF_RATE_LIMITER:allowance().binding},{});
 assert.equal(await response.text(),original);
});

test("slow bodies time out before upstream even when cancellation never resolves",async()=>{
 const h=harness(allowance().binding,allowance().binding);
 const body=new ReadableStream<Uint8Array>({pull(){return new Promise(()=>{});},cancel(){return new Promise(()=>{});}});
 const response=await h.fetch(bodyRequest(body),h.env,{});
 assert.equal(response.status,408);assert.equal(h.calls(),0);
});


test("OPTIONS bodies are bounded before the adapter as well",async()=>{
 const h=harness(allowance().binding,allowance().binding);
 const request=new Request("https://hearthafter.example/api/placements",{method:"OPTIONS",headers:{"CF-Connecting-IP":address},body:new Uint8Array(65537)});
 Object.defineProperty(request,"cf",{value:{colo:"IAD"}});
 const response=await h.fetch(request,h.env,{});
 assert.equal(response.status,413);assert.equal(h.calls(),0);
});

test("stalled OPTIONS bodies time out without reaching the adapter",async()=>{
 const h=harness(allowance().binding,allowance().binding);
 const body=new ReadableStream<Uint8Array>({pull(){return new Promise(()=>{});}});
 const request=new Request("https://hearthafter.example/api/placements",{method:"OPTIONS",headers:{"CF-Connecting-IP":address},body,duplex:"half"} as RequestInit);
 Object.defineProperty(request,"cf",{value:{colo:"IAD"}});
 const response=await h.fetch(request,h.env,{});
 assert.equal(response.status,408);assert.equal(h.calls(),0);
});

test("unexpected GET bodies cannot be passed to the adapter",async()=>{
 const h=harness(allowance().binding,allowance().binding);
 const request=edgeRequest("/api/content");
 Object.defineProperty(request,"body",{value:new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(1));controller.close();}})});
 const response=await h.fetch(request,h.env,{});
 assert.equal(response.status,400);assert.equal(h.calls(),0);
});

test("the unused generated image proxy never invokes OpenNext or fetches an upstream image",async()=>{
 const h=harness();
 for(const path of ["/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fo3jy1zm6%2Fproduction%2Fimage.png&w=1920&q=75","/_next/image/","/%5fnext/image","/_next%2Fimage"]) {
  assert.equal((await h.fetch(edgeRequest(path),h.env,{})).status,404);
 }
 assert.equal(h.calls(),0);
});

test("oversized bodies on ordinary and unknown pages never reach the adapter",async()=>{
 const h=harness();
 for(const path of ["/world","/does-not-exist"]) {
  const request=new Request(`https://hearthafter.example${path}`,{method:"POST",body:new Uint8Array(65537)});
  const response=await h.fetch(request,h.env,{});
  assert.equal(response.status,413);
 }
 assert.equal(h.calls(),0);
});

test("stalled bodies on a non-API path time out before routing",async()=>{
 const h=harness();
 const body=new ReadableStream<Uint8Array>({pull(){return new Promise(()=>{});}});
 const request=new Request("https://hearthafter.example/does-not-exist",{method:"POST",body,duplex:"half"} as RequestInit);
 const response=await h.fetch(request,h.env,{});
 assert.equal(response.status,408);assert.equal(h.calls(),0);
});

