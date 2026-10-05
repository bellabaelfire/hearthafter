import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import type {HearthState, Placement, PlacementCommand, Spirit} from '../src/lib/hearth/domain';
import {createInitialHearthState} from '../src/lib/hearth/fixtures';
import {evaluatePair, rankGroups, stableSerialize} from '../src/lib/hearth/matching';
import {applyPlacementCommand, consentParties, getPlacementReadinessIssues} from '../src/lib/hearth/placement';
import {parseSavedVisit} from '../src/lib/hearth/saved-visit';
import {decodeDocument, encodeDocument} from '../src/lib/hearth/sanity/documents';

const context = {actor:'Independent fictional reviewer',now:'2026-10-05T04:00:00.000Z'};
let sequence = 0;
const requestId = () => `independent-group-${++sequence}`;
const errorCode = (code:string) => (error:unknown) => Boolean(error && typeof error==='object' && 'code' in error && error.code===code);
function fixture(size=3): HearthState {
  const state = createInitialHearthState();
  const base = state.spirits[0];
  state.spirits = Array.from({length:size},(_,index):Spirit=>({...structuredClone(base),
    id:`independent-resident-${index+1}`,rev:`independent-revision-${index+1}`,name:`Resident ${index+1}`,ageAtPassing:40,
    guardianSpiritId:undefined,assentRequired:undefined,historyIds:[],traitIds:[],boundaryIds:[],affinityFacts:[],introductionQuestions:[],
    energy:'balanced',company:'medium',presence:'both',interests:['books','music'],petCompatibility:{cats:true,dogs:true,other:true},
    audibleHours:'none',quietHoursFlexibility:'can-adjust',spiritConsent:'yes',preferredHours:undefined,
  }));
  const home = state.homes[0];
  home.preferences = {...home.preferences,departedCapacity:size,householdConsent:'yes',pets:'none',quietHours:'none',privateRetreat:true,stepFreeAccess:true,
    hasGarden:true,activityPreference:'balanced',companyPreference:'medium',nightPresence:'welcome',relocationWillingness:'yes',
    welcomedInterests:['books','music'],recordingPolicy:'none',sharedEvenings:7,respectBoundaries:'yes'};
  home.introductionQuestions=[];
  state.homes=[home]; state.pairRelationships=[]; state.placements=[]; state.events=[];
  state.matchingPolicy.minimumHostScore=0; state.matchingPolicy.minimumPairScore=0; state.matchingPolicy.minimumOverallScore=0;
  return state;
}
function evaluation(state:HearthState) {return evaluatePair(state,{home:state.homes[0].preferences,spiritIds:state.spirits.map(spirit=>spirit.id),acceptedClauseIds:[]});}
function open(state=fixture()) {
  const match=evaluation(state); assert.equal(match.status,'eligible');
  return applyPlacementCommand(state,{type:'create',requestId:requestId(),home:match.home,spiritIds:match.spiritIds,acceptedClauseIds:[],sourceSnapshot:match.sourceSnapshot},context);
}
function readiness(state=fixture()) {
  const result=open(state),id=result.placement.id; state=result.state;
  type Intent=PlacementCommand extends infer Command ? Command extends PlacementCommand ? Omit<Command,'placementId'|'expectedRev'|'requestId'> : never : never;
  const run=(intent:Intent)=>{state=applyPlacementCommand(state,{...intent,placementId:id,expectedRev:state.placements[0].rev,requestId:requestId()} as PlacementCommand,context).state;};
  run({type:'set-plan',trialPlan:{durationDays:14,checkInDays:[7,14],successCriteria:'Every resident reports comfort and a voluntary wish to continue.'},relocationPlan:{destination:'The fictional quiet guesthouse',coordinator:'Placement steward',trigger:'Any resident or household member withdraws their agreement.',handoverNotes:'Confirm a welcoming room and a safe private handover.'}});
  for(const question of state.placements[0].evaluation.introductionQuestions.filter(question=>question.requiredForTrial)) run({type:'record-answer',questionId:question.id,spiritId:question.spiritId,answer:'yes',note:'The agreed arrangements were checked with every affected person.'});
  return {get state(){return state;},run,id};
}
function stored(state:HearthState) {return JSON.stringify({version:1,home:state.homes[0].preferences,placements:state.placements,events:state.events});}
function startTrial(state:HearthState) {const placement=state.placements[0];return applyPlacementCommand(state,{type:'transition',to:'trial',placementId:placement.id,expectedRev:placement.rev,requestId:requestId(),note:'All required people agree to the reviewed voluntary trial.'},context);}

test('a weak third resident cannot hide behind stronger household scores',()=>{
  const state=fixture(); state.matchingPolicy.hostWeights={energy:100,company:0,interests:0,quietHours:0};
  state.homes[0].preferences.activityPreference='quiet'; state.spirits.forEach(spirit=>spirit.energy='quiet');state.spirits[2].energy='lively';
  state.matchingPolicy.minimumHostScore=50;
  const match=evaluation(state);
  assert.deepEqual(Object.values(match.hostScores!),[100,100,25]);assert.equal(match.status,'excluded');
  assert.ok(match.exclusions.some(reason=>reason.code==='policy-threshold'));
});

test('each group relationship is scored against its own two residents and must clear the policy',()=>{
  const state=fixture();state.matchingPolicy.pairWeights={complementarity:0,sharedInterests:0,presence:0,relationship:100};state.matchingPolicy.minimumPairScore=75;
  for(const [index,[a,b]] of [[0,1],[0,2],[1,2]].entries()) state.pairRelationships.push({id:`independent-edge-${index}`,rev:'edge-r1',spiritIds:[state.spirits[a].id,state.spirits[b].id],status:index===2?'unacquainted':'friendly',title:`Edge ${index}`,description:'Documented pair relationship.',sourceRefs:[]});
  const match=evaluation(state);assert.equal(match.pairScore,83);assert.equal(match.status,'excluded');
  assert.deepEqual(match.pairFactors.filter(reason=>reason.code==='pair-relationship').map(reason=>reason.sourceRefs[0]),['relationship:independent-edge-0','relationship:independent-edge-1','relationship:independent-edge-2']);
});

test('a hard relationship refusal between the second and third residents stops every score',()=>{
  const state=fixture();state.pairRelationships.push({id:'independent-refusal',rev:'refusal-r1',spiritIds:[state.spirits[1].id,state.spirits[2].id],status:'do-not-pair',title:'Declined',description:'These residents decline to share a home.',sourceRefs:[]});
  const match=evaluation(state);assert.equal(match.status,'excluded');assert.equal(match.overallScore,null);assert.ok(Object.values(match.hostScores!).every(score=>score===null));
});

test('the third resident and every pair relationship participate in revision freshness',()=>{
  const state=fixture();state.pairRelationships.push({id:'independent-third-edge',rev:'edge-r1',spiritIds:[state.spirits[1].id,state.spirits[2].id],status:'friendly',title:'Friends',description:'They know one another.',sourceRefs:[]});
  state.spirits[2].historyIds=[state.histories[0].id];state.spirits[2].traitIds=[state.traits[0].id];state.spirits[2].boundaryIds=[state.boundaries[0].id];
  const result=open(state);
  for(const [kind,id] of [['spirit',state.spirits[2].id],['history',state.histories[0].id],['trait',state.traits[0].id],['boundary',state.boundaries[0].id],['relationship','independent-third-edge']] as const) assert.ok(result.placement.evaluation.sourceSnapshot.revisions[`${kind}:${id}`]);
  for(const key of ['spirits','histories','traits','boundaries','pairRelationships'] as const) {
    const changed=structuredClone(result.state);const index=key==='spirits'?2:0;changed[key][index].rev+='-edited';
    assert.throws(()=>applyPlacementCommand(changed,{type:'record-consent',party:'household',decision:'granted',note:'The household freely agrees.',placementId:result.placement.id,expectedRev:result.placement.rev,requestId:requestId()},context),errorCode('STALE_SOURCES'),key);
  }
});

test('the third adult needs a separate agreement before trial, and may withdraw afterward',()=>{
  const review=readiness();
  for(const party of ['household','spirit-a','spirit-b'] as const) review.run({type:'record-consent',party,decision:'granted',note:'The complete plan was reviewed and freely agreed.'});
  assert.throws(()=>startTrial(review.state),errorCode('CONSENT_REQUIRED'));
  review.run({type:'record-consent',party:'spirit-3',decision:'granted',note:'The third resident freely agrees to the whole plan.'});
  const trial=startTrial(review.state);assert.equal(trial.placement.status,'trial');
  const denied=applyPlacementCommand(trial.state,{type:'record-consent',party:'spirit-3',decision:'denied',note:'The third resident wishes to leave.',placementId:trial.placement.id,expectedRev:trial.placement.rev,requestId:requestId()},context);
  assert.equal(denied.placement.status,'relocating');
});

test('a child is never evaluated without their documented adult guardian in the same group',()=>{
  const state=fixture();state.spirits[2].ageAtPassing=9;state.spirits[2].guardianSpiritId='absent-guardian';
  assert.ok(evaluation(state).exclusions.some(reason=>reason.code==='guardian-required'));
  state.spirits[2].guardianSpiritId=state.spirits[0].id;state.spirits[0].ageAtPassing=13;
  assert.ok(evaluation(state).exclusions.some(reason=>reason.code==='guardian-required'));
});

test('a child requires guardian agreement and separate assent; adult consent does not substitute',()=>{
  const state=fixture();state.spirits[2].ageAtPassing=9;state.spirits[2].guardianSpiritId=state.spirits[0].id;
  const review=readiness(state);assert.deepEqual(consentParties(review.state.placements[0]),['household','spirit-a','spirit-b','guardian-3','assent-3']);
  for(const party of ['household','spirit-a','spirit-b','guardian-3'] as const) review.run({type:'record-consent',party,decision:'granted',note:'The full plan was reviewed and freely agreed.'});
  assert.throws(()=>startTrial(review.state),errorCode('CONSENT_REQUIRED'));
  review.run({type:'record-consent',party:'assent-3',decision:'denied',note:'The child does not want this arrangement.'});
  assert.equal(review.state.placements[0].status,'declined');
});

test('stored group consent requirements cannot omit a resident and bypass the trial gate',()=>{
  const review=readiness();for(const party of ['household','spirit-a','spirit-b'] as const) review.run({type:'record-consent',party,decision:'granted',note:'The full plan was reviewed and freely agreed.'});
  const edited=structuredClone(review.state);edited.placements[0].evaluation.consentRequirements=edited.placements[0].evaluation.consentRequirements!.filter(requirement=>requirement.party!=='spirit-3');
  assert.throws(()=>startTrial(edited));assert.ok(getPlacementReadinessIssues(edited,edited.placements[0]).length>0);
});

test('saved visits reject a requirement list missing one of their residents',()=>{
  const result=open();result.placement.evaluation.consentRequirements=result.placement.evaluation.consentRequirements!.filter(requirement=>requirement.party!=='spirit-3');
  assert.throws(()=>parseSavedVisit(stored(result.state)),/unsupported format/);
});

test('saved visits reject malformed group host factors before components can render them',()=>{
  const result=open();Object.assign(result.placement.evaluation,{hostFactors:{[result.placement.spiritIds[2]]:{not:'a factor array'}}});
  assert.throws(()=>parseSavedVisit(stored(result.state)),/unsupported format/);
});

test('every supported group size can round-trip through browser storage and Sanity documents',()=>{
  for(const size of [2,3,12]) {
    const result=open(fixture(size));assert.deepEqual(parseSavedVisit(stored(result.state)).placements[0],result.placement,`browser size ${size}`);
    const persisted=encodeDocument('hearthPlacement',result.placement);assert.deepEqual(decodeDocument<Placement>({...persisted,_rev:'actual-native-revision'}),{...result.placement,rev:'actual-native-revision'},`Sanity size ${size}`);
  }
});

test('legacy two-adult browser and Sanity cases remain readable and consent guarded',()=>{
  const result=open(fixture(2));delete result.placement.evaluation.consentRequirements;delete result.placement.evaluation.hostScores;delete result.placement.evaluation.hostFactors;
  const saved=parseSavedVisit(stored(result.state));assert.deepEqual(saved.placements[0],result.placement);assert.deepEqual(consentParties(saved.placements[0]),['household','spirit-a','spirit-b']);
  assert.throws(()=>startTrial(result.state),errorCode('CONSENT_REQUIRED'));
  const encoded=encodeDocument('hearthPlacement',result.placement);assert.deepEqual(decodeDocument<Placement>({...encoded,_rev:result.placement.rev}),result.placement);
});

test('group requests remain bounded and the API rejects singletons, duplicates and over-limit groups',async()=>{
  const nodeRequire=createRequire(import.meta.url),boundary=nodeRequire.resolve('server-only');nodeRequire.cache[boundary]={id:boundary,filename:boundary,loaded:true,exports:{}} as NodeModule;
  const {validatePlacementEnvelope}=await import('../src/lib/hearth/sanity/repository');
  const {readPlacementJson,PLACEMENT_BODY_LIMIT}=await import('../src/lib/hearth/sanity/request-limits');
  const state=fixture(12),match=evaluation(state),command={type:'create',requestId:requestId(),home:match.home,spiritIds:match.spiritIds,acceptedClauseIds:[],sourceSnapshot:match.sourceSnapshot};
  assert.doesNotThrow(()=>validatePlacementEnvelope(command));
  for(const ids of [match.spiritIds.slice(0,1),[match.spiritIds[0],match.spiritIds[0]],[...match.spiritIds,'over-limit']]) {
    assert.throws(()=>validatePlacementEnvelope({...command,spiritIds:ids}));assert.throws(()=>evaluatePair(state,{home:match.home,spiritIds:ids}));
  }
  const body=JSON.stringify(command);assert.ok(new TextEncoder().encode(body).length<PLACEMENT_BODY_LIMIT);
  const decoded=await readPlacementJson(new Request('http://localhost:3333/api/placements',{method:'POST',headers:{'content-type':'application/json'},body}));assert.equal(stableSerialize(decoded),stableSerialize(command));
});

test('three-resident ranking is deterministic and does not mutate the source register',()=>{
  const state=fixture(4),before=structuredClone(state);const groups=rankGroups(state,state.homes[0].preferences,[],3);
  assert.equal(groups.length,4);assert.ok(groups.every(group=>group.spiritIds.length===3));assert.deepEqual(groups,rankGroups(state,state.homes[0].preferences,[],3));assert.deepEqual(state,before);
});

// The native gate is exercised with the installed Sanity workflow reader and GROQ parser.
// The client below has no network or mutation methods.
test('native approval accepts only the latest human review of the exact placement revision',async()=>{
  const {assertNativePlacementApproval,HEARTH_WORKFLOW_NAME,HEARTH_WORKFLOW_TAG,hearthPlacementDocumentId}=await import('../src/lib/hearth/sanity/native-workflow');
  const {WORKFLOW_INSTANCE_TYPE,refDataset}=await import('@sanity/workflow-engine');
  const nodeRequire=createRequire(import.meta.url);
  const groq=createRequire(nodeRequire.resolve('@sanity/workflow-engine'))('groq-js');
  const projectId='independentproject',dataset='production',placementId='placement-independent-native',revision='placement-r1';
  const subject=refDataset({projectId,dataset,documentId:hearthPlacementDocumentId(placementId),type:'hearthPlacement'});
  const at='2026-10-05T04:00:00.000Z';
  const instance={_id:'independent-native-approved',_type:WORKFLOW_INSTANCE_TYPE,_rev:'instance-r1',_createdAt:at,_updatedAt:at,tag:HEARTH_WORKFLOW_TAG,
    workflowResource:{type:'dataset',id:`${projectId}.${dataset}`},definition:HEARTH_WORKFLOW_NAME,pinnedVersion:1,definitionSnapshot:'{}',
    fields:[{_key:'subject',_type:'subject',name:'subject',value:subject},{_key:'revision',_type:'string',name:'reviewedRevision',value:revision},{_key:'approval',_type:'actor',name:'approval',value:{kind:'person',id:'independent-reviewer'}},{_key:'decision',_type:'string',name:'decision',value:'approved'}],
    context:[],ancestors:[],currentStage:'approved',stages:[],pendingEffects:[],effectHistory:[],history:[],startedAt:at,lastChangedAt:at,completedAt:at};
  type NativeRow=Record<string,unknown>;
  let documents:NativeRow[]=[structuredClone(instance)];
  const client={config:()=>({projectId,dataset}),withConfig:()=>client,
    fetch:async(query:string,params:Record<string,unknown>)=>(await groq.evaluate(groq.parse(query),{dataset:documents,params})).get(),
    getDocument:async(id:string)=>structuredClone(documents.find(document=>document._id===id))} as unknown as import('@sanity/client').SanityClient;
  const approved=await assertNativePlacementApproval(client,placementId,revision);
  assert.deepEqual(approved,{instanceId:instance._id,instanceRevision:instance._rev,reviewedRevision:revision,actorId:'independent-reviewer'});
  await assert.rejects(assertNativePlacementApproval(client,placementId,'newer-placement-revision'),errorCode('NATIVE_APPROVAL_REQUIRED'));
  const older=structuredClone(instance),newer:NativeRow={...structuredClone(instance),_id:'independent-native-new-review',startedAt:'2026-10-05T04:01:00.000Z',currentStage:'review'};
  delete newer.completedAt;documents=[older,newer];
  await assert.rejects(assertNativePlacementApproval(client,placementId,revision),errorCode('NATIVE_APPROVAL_REQUIRED'));
  for(const change of ['robot','aborted','wrong-subject','unapproved'] as const) {
    const changed=structuredClone(instance);
    if(change==='robot') (changed.fields[2].value as {kind:string}).kind='robot';
    if(change==='aborted') Object.assign(changed,{abortedAt:at});
    if(change==='wrong-subject') (changed.fields[0].value as {id:string}).id='dataset:independentproject:production:another-document';
    if(change==='unapproved') changed.fields[3].value='changes-requested';
    documents=[changed];await assert.rejects(assertNativePlacementApproval(client,placementId,revision),(error:unknown)=>error instanceof Error,change);
  }
  documents=[];await assert.rejects(assertNativePlacementApproval(client,placementId,revision),errorCode('NATIVE_APPROVAL_REQUIRED'));
});

test('group repository commits preserve idempotency, atomic audit records and revision conflicts',async()=>{
  const nodeRequire=createRequire(import.meta.url),boundary=nodeRequire.resolve('server-only');nodeRequire.cache[boundary]={id:boundary,filename:boundary,loaded:true,exports:{}} as NodeModule;
  const {commitPlacementCommand}=await import('../src/lib/hearth/sanity/repository');
  const {encodeState,decodeHearthState}=await import('../src/lib/hearth/sanity/documents');
  const {DOCUMENT_TYPES,HEARTH_CONTENT_QUERY}=await import('../src/lib/hearth/sanity/config');
  type Document=import('../src/lib/hearth/sanity/documents').HearthDocument;
  type Raw=import('../src/lib/hearth/sanity/documents').RawHearthState;
  function memoryRepository() {
    const documents=new Map<string,Document>(encodeState(fixture()).map(document=>[document._id,{...document,_rev:`initial-${document.id}`} ]));
    let revision=0,commits=0,failAfterCommit=false;
    const raw=()=>Object.fromEntries(Object.entries(DOCUMENT_TYPES).map(([key,type])=>[key,key==='matchingPolicy'||key==='artwork'?[...documents.values()].find(document=>document._type===type)??null:[...documents.values()].filter(document=>document._type===type)])) as Raw;
    type Operation={type:'create';document:Document}|{type:'patch';id:string;expectedRev?:string;fields:Record<string,unknown>};
    const client={fetch:async(query:string)=>{assert.equal(query,HEARTH_CONTENT_QUERY);return structuredClone(raw());},getDocument:async(id:string)=>structuredClone(documents.get(id)),
      transaction:()=>{
        const operations:Operation[]=[];
        const transaction={create:(document:Document)=>{operations.push({type:'create',document:structuredClone(document)});return transaction;},
          patch:(id:string,callback:(patch:{ifRevisionId:(value:string)=>unknown;set:(fields:Record<string,unknown>)=>unknown})=>unknown)=>{
            const operation:Extract<Operation,{type:'patch'}>={type:'patch',id,fields:{}};
            const patch={ifRevisionId:(value:string)=>{operation.expectedRev=value;return patch;},set:(fields:Record<string,unknown>)=>{operation.fields=structuredClone(fields);return patch;}};
            callback(patch);operations.push(operation);return transaction;
          },commit:async()=>{
            // Check every precondition before applying either the audit or placement write.
            for(const operation of operations) {
              if(operation.type==='create'&&documents.has(operation.document._id)) throw Object.assign(new Error('Document already exists'),{statusCode:409});
              if(operation.type==='patch'&&documents.get(operation.id)?._rev!==operation.expectedRev) throw Object.assign(new Error('Revision conflict'),{statusCode:409});
            }
            for(const operation of operations) {
              const document=operation.type==='create'?operation.document:{...documents.get(operation.id)!,...operation.fields};
              documents.set(document._id,{...document,_rev:`persisted-${++revision}`});
            }
            commits++;
            if(failAfterCommit){failAfterCommit=false;throw new Error('Simulated lost response after committed transaction');}
            return {transactionId:`transaction-${commits}`};
          }};
        return transaction;
      }} as unknown as import('@sanity/client').SanityClient;
    return {client,documents,state:()=>decodeHearthState(structuredClone(raw())),loseNextResponse:()=>{failAfterCommit=true;},get commits(){return commits;}};
  }
  const repository=memoryRepository(),source=repository.state(),match=evaluation(source);
  const command:PlacementCommand={type:'create',requestId:requestId(),home:match.home,spiritIds:match.spiritIds,acceptedClauseIds:[],sourceSnapshot:match.sourceSnapshot};
  repository.loseNextResponse();
  const receipt=await commitPlacementCommand(repository.client,command,context.actor);
  assert.equal(receipt.replayed,true);assert.equal(repository.commits,1);assert.equal(repository.state().placements.length,1);assert.equal(repository.state().events.length,1);
  const replay=await commitPlacementCommand(repository.client,command,context.actor);assert.equal(replay.replayed,true);assert.equal(repository.commits,1);
  await assert.rejects(commitPlacementCommand(repository.client,{...command,spiritIds:[...command.spiritIds].reverse()},context.actor),errorCode('IDEMPOTENCY_CONFLICT'));
  const placement=repository.state().placements[0];
  const consent=(party:'household'|'spirit-3'):PlacementCommand=>({type:'record-consent',requestId:requestId(),placementId:placement.id,expectedRev:placement.rev,party,decision:'granted',note:'The resident freely agrees to the reviewed proposal.'});
  const concurrent=await Promise.allSettled([commitPlacementCommand(repository.client,consent('household'),context.actor),commitPlacementCommand(repository.client,consent('spirit-3'),context.actor)]);
  assert.equal(concurrent.filter(result=>result.status==='fulfilled').length,1);assert.equal(concurrent.filter(result=>result.status==='rejected').length,1);
  assert.equal(repository.state().events.length,2);assert.equal(repository.commits,2);
  const final=repository.state().placements[0];assert.equal(Object.values(final.consents).filter(consent=>consent.decision==='granted').length,1);
});

test('child assent exemptions need an explicit bounded developmental reason and reviewed care question',()=>{
  const state=fixture(),child=state.spirits[2];child.ageAtPassing=2;child.guardianSpiritId=state.spirits[0].id;child.assentRequired=false;child.spiritConsent='pending';
  child.introductionQuestions=[{id:'question_unrelated_care',question:'Do you enjoy looking at scarecrows?',whyItMatters:'This is an interest question, not a developmental assessment.',requiredForTrial:true,sourceRefs:[]}];
  for(const reason of [undefined,'Too young','x'.repeat(1501)]) {
    child.assentExemptionReason=reason;const match=evaluation(state);assert.equal(match.status,'needs-information');assert.ok(match.unknowns.some(reason=>reason.code==='child-care-review'));
  }
  child.assentExemptionReason='The very young child communicates comfort through observed behavior; the guardian and coordinator assess distress together.';
  const match=evaluation(state);assert.equal(match.status,'eligible');assert.ok(!match.consentRequirements!.some(requirement=>requirement.party==='assent-3'));
  const question=match.introductionQuestions.find(question=>question.id===`question_dependent_care_${child.id}`);assert.ok(question?.requiredForTrial);assert.ok(question.question.includes(child.assentExemptionReason));
  const review=readiness(state);
  for(const party of consentParties(review.state.placements[0])) review.run({type:'record-consent',party,decision:'granted',note:'The full care arrangements were reviewed and freely agreed.'});
  const incomplete=structuredClone(review.state);incomplete.placements[0].answers=incomplete.placements[0].answers.filter(answer=>answer.questionId!==question.id);
  assert.throws(()=>startTrial(incomplete),errorCode('INTRODUCTION_ANSWERS_REQUIRED'));
  assert.equal(startTrial(review.state).placement.status,'trial');
});

test('a child refusal blocks a group even when a guardian offers a documented assent exemption',()=>{
  const state=fixture(),child=state.spirits[2];child.ageAtPassing=2;child.guardianSpiritId=state.spirits[0].id;child.assentRequired=false;
  child.assentExemptionReason='The very young child communicates comfort and distress through behavior reviewed by the guardian and coordinator.';child.spiritConsent='no';
  const match=evaluation(state);assert.equal(match.status,'excluded');assert.equal(match.overallScore,null);assert.ok(match.exclusions.some(reason=>reason.code==='spirit-consent'));
});
