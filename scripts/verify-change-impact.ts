/** Controlled administrator-only live drill. Default previews the plan; --run performs and restores it. */
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {mkdirSync,writeFileSync} from 'node:fs'
import {createClient,type SanityDocument} from '@sanity/client'
import {getCliClient} from 'sanity/cli'
import {instanceDocId,refDataset} from '@sanity/workflow-engine'
import type {HearthState,PairEvaluation,Placement,PlacementCommand,PlacementResult} from '../src/lib/hearth/domain'
import {evaluatePair} from '../src/lib/hearth/matching'
import {getPlacementReadinessIssues} from '../src/lib/hearth/placement'
import {HEARTH_API_VERSION,hearthDocumentId} from '../src/lib/hearth/sanity/config'
import {assertNativePlacementApproval,createHearthWorkflowEngine,HEARTH_WORKFLOW_NAME,HEARTH_WORKFLOW_TAG} from '../src/lib/hearth/sanity/native-workflow'

const PROJECT='o3jy1zm6',DATASET='production',BASE='http://localhost:3333',HOME='household_june_leila'
const HOME_DOCUMENT=hearthDocumentId('hearthHome',HOME),DRAFT_DOCUMENT=`drafts.${HOME_DOCUMENT}`
const PAIR:[string,string]=['spirit_iona_vale','spirit_orin_pell']
const plan={projectId:PROJECT,dataset:DATASET,sourceDocument:HOME_DOCUMENT,sourceField:'preferences.recordingPolicy',temporaryValues:['active',null],restoration:'Exact original field and business content; actual revision necessarily advances.',draft:'Abort if a pre-existing household draft exists; publish only the drill draft using both revision guards.',privateRecords:'One explicitly labeled fictional review and native care approval; close the review after verification.',steps:['Prepare a consented private review and approve its exact revision through native Workflows.','Create an unpublished active-camera draft; prove published anonymous content and score stay unchanged.','Publish via the actual Sanity publish action with draft/published revision guards.','Verify a camera-free hard boundary suppresses every score and blocks the existing approved review.','Record unknown camera policy as missing information and a required question, never consent.','Restore original published facts; prove old consent remains stale until explicit refresh.','Refresh clears answers/consent and makes the old native approval invalid for the new placement revision.','Close the test review, confirm exact source restoration, draft cleanup, and anonymous privacy.'],remoteWrites:false}

async function main(){
 if(!process.argv.includes('--run')){console.log(JSON.stringify(plan,null,2));return}
 assert.equal(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,PROJECT,'Set the exact approved project environment.')
 assert.equal(process.env.NEXT_PUBLIC_SANITY_DATASET||'production',DATASET)
 const client=getCliClient({apiVersion:HEARTH_API_VERSION}).withConfig({projectId:PROJECT,dataset:DATASET,useCdn:false,perspective:'published',maxRetries:0})
 const rawClient=client.withConfig({perspective:'raw'})
 const token=client.config().token;assert.ok(token,'Use the existing authorized sanity exec --with-user-token session.')
 const anonymous=createClient({projectId:PROJECT,dataset:DATASET,apiVersion:HEARTH_API_VERSION,useCdn:false,perspective:'published'})
 const runId=randomUUID(),startedAt=new Date().toISOString(),checks:Record<string,unknown>[]=[]
 const requestId=()=>`impact-${randomUUID()}`
 const original=await rawClient.getDocument<SanityDocument<Record<string,unknown>>>(HOME_DOCUMENT)
 assert.ok(original,'The approved household must already be published.')
 assert.equal(await rawClient.getDocument(DRAFT_DOCUMENT),undefined,'A pre-existing draft must be preserved. Stop this drill.')
 const originalPolicy=(original.preferences as Record<string,unknown>).recordingPolicy
 assert.equal(originalPolicy,'none','This drill expects the documented camera-free baseline.')
 let currentSourceRevision=original._rev,ownedDraftRevision:string|undefined,sourceTouched=false,placement:Placement|undefined,nativeInstance:string|undefined,publishCompleted=false
 const backupPath=`.tmp/change-impact-${runId}.json`
 mkdirSync('.tmp',{recursive:true});mkdirSync('docs',{recursive:true})
 writeFileSync(backupPath,JSON.stringify({runId,startedAt,original},null,2)+'\n')
 function progress(step:string){console.log(JSON.stringify({step,time:new Date().toISOString()}))}
 function business(doc:Record<string,unknown>){const {_createdAt,_updatedAt,_rev,...fields}=doc;return fields}
 async function publicState(){const response=await fetch(`${BASE}/api/content`,{cache:'no-store',signal:AbortSignal.timeout(60000)});assert.equal(response.status,200);const result=await response.json() as {mode:string,state:HearthState};assert.equal(result.mode,'sanity');assert.equal(result.state.placements.length,0);assert.equal(result.state.events.length,0);return result.state}
 function pair(state:HearthState):PairEvaluation{return evaluatePair(state,{home:state.homes.find(home=>home.id===HOME)!.preferences,spiritIds:PAIR,acceptedClauseIds:['quiet-hours']})}
 async function post(command:PlacementCommand){const response=await fetch(`${BASE}/api/placements`,{method:'POST',headers:{'Content-Type':'application/json',Origin:BASE,Authorization:`Bearer ${token}`},body:JSON.stringify(command),signal:AbortSignal.timeout(60000)});return {status:response.status,body:await response.json() as PlacementResult&{code?:string,error?:string}}}
 async function accept(command:PlacementCommand){const result=await post(command);assert.equal(result.status,200,result.body.error);placement=result.body.placement;return result.body}
 async function rejectTrial(expectedCode:string){assert.ok(placement);const result=await post({type:'transition',requestId:requestId(),placementId:placement.id,expectedRev:placement.rev,to:'trial',note:'CONTROLLED CHANGE-IMPACT TEST: verify current facts before permitting a fictional trial.'});assert.equal(result.status,409);assert.equal(result.body.code,expectedCode);return {status:result.status,code:result.body.code}}
 async function patchPolicy(value:unknown){sourceTouched=true;const changed=await rawClient.patch(HOME_DOCUMENT).ifRevisionId(currentSourceRevision).set({'preferences.recordingPolicy':value}).commit({visibility:'sync'});currentSourceRevision=changed._rev;return changed}
 async function restoreSource(){if(!sourceTouched)return;const current=await rawClient.getDocument(HOME_DOCUMENT);assert.ok(current);assert.equal(current._rev,currentSourceRevision,'Another editor changed the household. Do not overwrite their work.');const changed=await patchPolicy(originalPolicy);assert.ok(isDeepStrictEqual(business(changed),business(original!)),'Original published business content must be restored exactly.');sourceTouched=false;progress('Original household facts restored with a new actual revision.')}
 async function cleanOwnedDraft(){if(!ownedDraftRevision)return;const draft=await rawClient.getDocument(DRAFT_DOCUMENT);if(!draft){ownedDraftRevision=undefined;return}assert.equal(draft._rev,ownedDraftRevision,'Another editor changed the draft; preserve it for manual review.');await rawClient.transaction().patch(DRAFT_DOCUMENT,p=>p.ifRevisionId(ownedDraftRevision!).set({id:HOME})).delete(DRAFT_DOCUMENT).commit({visibility:'sync'});ownedDraftRevision=undefined}
 let failure:unknown
 try{
  const baseline=await publicState(),baselinePair=pair(baseline)
  assert.equal(baselinePair.status,'eligible');assert.equal(baseline.homes.find(home=>home.id===HOME)!.rev,original._rev)
  let result=await accept({type:'create',requestId:requestId(),home:baselinePair.home,spiritIds:PAIR,acceptedClauseIds:baselinePair.acceptedClauseIds,sourceSnapshot:baselinePair.sourceSnapshot})
  assert.ok(placement)
  result=await accept({type:'set-plan',requestId:requestId(),placementId:placement.id,expectedRev:placement.rev,trialPlan:{durationDays:14,checkInDays:[3,7,14],successCriteria:'CONTROLLED TEST ONLY: all fictional residents independently report comfortable, supported company.'},relocationPlan:{destination:'Fictional transition guesthouse',coordinator:'Test care coordinator',trigger:'Any fictional party freely withdraws consent.',handoverNotes:'CONTROLLED TEST ONLY: confirm a private retreat and supported handover.'}})
  for(const question of result.placement.evaluation.introductionQuestions)result=await accept({type:'record-answer',requestId:requestId(),placementId:placement!.id,expectedRev:placement!.rev,questionId:question.id,spiritId:question.spiritId,answer:'yes',note:'CONTROLLED TEST ONLY: the fictional prerequisite is independently confirmed for this temporary case.'})
  for(const party of ['household','spirit-a','spirit-b'] as const)result=await accept({type:'record-consent',requestId:requestId(),placementId:placement!.id,expectedRev:placement!.rev,party,decision:'granted',note:'CONTROLLED TEST ONLY: this fictional party independently agrees to the reviewed facts and plan.'})
  assert.deepEqual(getPlacementReadinessIssues(result.state,placement!),[])
  const approvedRevision=placement!.rev,engine=createHearthWorkflowEngine(client,{projectId:PROJECT,dataset:DATASET})
  nativeInstance=instanceDocId(HEARTH_WORKFLOW_TAG)
  await engine.startInstance({definition:HEARTH_WORKFLOW_NAME,instanceId:nativeInstance,initialFields:[{type:'subject',name:'subject',value:refDataset({projectId:PROJECT,dataset:DATASET,documentId:hearthDocumentId('hearthPlacement',placement!.id),type:'hearthPlacement'})}],context:{purpose:'Explicitly authorized controlled source-change impact test; no real household or visitor data',synthetic:true},perspective:'published'})
  await engine.fireAction({instanceId:nativeInstance,activity:'prepare',action:'submit',params:{revision:approvedRevision},idempotencyKey:`impact-submit-${runId}`})
  await engine.fireAction({instanceId:nativeInstance,activity:'care-review',action:'approve',idempotencyKey:`impact-approve-${runId}`})
  await assertNativePlacementApproval(client,placement!.id,approvedRevision)
  progress('Private case has current answers, independent consent, and genuine native approval.')
  checks.push({check:'Baseline review genuinely ready and native-approved',pair:PAIR,status:baselinePair.status,score:baselinePair.overallScore,questions:placement!.answers.length})

  const {_rev,_createdAt,_updatedAt,...draftFields}=original
  const draft=await rawClient.create({...draftFields,_id:DRAFT_DOCUMENT,_type:'hearthHome',preferences:{...(original.preferences as Record<string,unknown>),recordingPolicy:'active'}})
  ownedDraftRevision=draft._rev
  const draftState=await publicState(),draftPair=pair(draftState)
  assert.deepEqual(draftPair,baselinePair);assert.equal(await anonymous.fetch('count(*[_id == $id])',{id:DRAFT_DOCUMENT}),0)
  checks.push({check:'Unpublished camera draft does not change anonymous published result',score:draftPair.overallScore,publishedRevisionUnchanged:draftState.homes.find(home=>home.id===HOME)!.rev===original._rev,anonymousDraftCount:0})
  progress('Unpublished draft is invisible and leaves published recommendations unchanged.')

  sourceTouched=true
  await rawClient.action({actionType:'sanity.action.document.publish',draftId:DRAFT_DOCUMENT,ifDraftRevisionId:ownedDraftRevision,publishedId:HOME_DOCUMENT,ifPublishedRevisionId:currentSourceRevision})
  publishCompleted=true;const published=await rawClient.getDocument(HOME_DOCUMENT);assert.ok(published);currentSourceRevision=published._rev
  assert.equal(await rawClient.getDocument(DRAFT_DOCUMENT),undefined);ownedDraftRevision=undefined
  const activePair=pair(await publicState())
  assert.equal(activePair.status,'excluded');assert.ok(activePair.exclusions.some(reason=>reason.code==='camera-boundary'))
  assert.deepEqual([activePair.hostAScore,activePair.hostBScore,activePair.pairScore,activePair.overallScore],[null,null,null,null])
  const activeBlock=await rejectTrial('STALE_SOURCES')
  checks.push({check:'Actual draft publication makes the camera-free boundary a hard exclusion',status:activePair.status,scoresSuppressed:true,existingApprovedReview:activeBlock})
  progress('Published camera conflict suppresses fit scores and blocks the previously approved trial.')

  await patchPolicy(null)
  const unknownPair=pair(await publicState())
  assert.equal(unknownPair.status,'needs-information');assert.ok(unknownPair.unknowns.some(reason=>reason.code==='unknown-recording-policy'))
  assert.ok(!unknownPair.exclusions.some(reason=>reason.code==='camera-boundary'))
  const cameraQuestions=unknownPair.introductionQuestions.filter(question=>question.id.startsWith('question_recording_'))
  assert.ok(cameraQuestions.length===2&&cameraQuestions.every(question=>question.requiredForTrial))
  assert.equal(unknownPair.overallScore,null)
  const unknownBlock=await rejectTrial('STALE_SOURCES')
  checks.push({check:'Unknown recording remains missing information and an explicit required question',status:unknownPair.status,requiredRecordingQuestions:cameraQuestions.length,hardCameraExclusion:false,score:null,existingReview:unknownBlock})

  await restoreSource()
  const restoredState=await publicState(),restoredPair=pair(restoredState)
  assert.equal(restoredPair.status,baselinePair.status);assert.equal(restoredPair.overallScore,baselinePair.overallScore)
  assert.notEqual(restoredState.homes.find(home=>home.id===HOME)!.rev,original._rev)
  const restoredBlock=await rejectTrial('STALE_SOURCES')
  checks.push({check:'Restoring the same facts restores fit but does not reactivate old consent',score:restoredPair.overallScore,originalScore:baselinePair.overallScore,newSourceRevision:true,oldConsentStillBlocked:restoredBlock})
  result=await accept({type:'refresh-review',requestId:requestId(),placementId:placement!.id,expectedRev:placement!.rev,acceptedClauseIds:['quiet-hours']})
  assert.equal(placement!.answers.length,0);assert.ok(Object.values(placement!.consents).every(consent=>consent.decision==='pending'))
  await assert.rejects(()=>assertNativePlacementApproval(client,placement!.id,placement!.rev),(error:unknown)=>Boolean(error&&typeof error==='object'&&'code' in error&&error.code==='NATIVE_APPROVAL_REQUIRED'))
  checks.push({check:'Explicit refreshed review requires new answers, all-party consent, and native approval',answers:0,allConsents:'pending',oldNativeApprovalInvalid:true})
  progress('Fresh review cleared old agreement and rejected the old native approval revision.')
  await accept({type:'transition',requestId:requestId(),placementId:placement!.id,expectedRev:placement!.rev,to:'closed',note:'CONTROLLED CHANGE-IMPACT TEST COMPLETE: original facts restored and no trial started; this fictional review is closed.'})
 }catch(error){failure=error}
 finally{
  try{await restoreSource();await cleanOwnedDraft()}catch(cleanupError){failure=new Error(`${failure instanceof Error?failure.message+'; ':''}Restoration needs attention: ${cleanupError instanceof Error?cleanupError.message:String(cleanupError)}`)}
  if(failure&&placement&&placement.status==='review')try{await accept({type:'transition',requestId:requestId(),placementId:placement.id,expectedRev:placement.rev,to:'closed',note:'CONTROLLED CHANGE-IMPACT TEST STOPPED: no real placement occurred; source restoration and review evidence are retained.'})}catch{}
 }
 const finalHome=await rawClient.getDocument(HOME_DOCUMENT),finalDraft=await rawClient.getDocument(DRAFT_DOCUMENT)
 const exactRestoration=Boolean(finalHome&&isDeepStrictEqual(business(finalHome),business(original)))
 const privateVisible=await anonymous.fetch<number>('count(*[_type in ["hearthPlacement","hearthPlacementEvent"] || _id in path("production.**") || _id == $draft])',{draft:DRAFT_DOCUMENT})
 const report={checkedAt:new Date().toISOString(),startedAt,projectId:PROJECT,dataset:DATASET,sourceDocument:HOME_DOCUMENT,changedField:'preferences.recordingPolicy',actualPublishAction:publishCompleted,checks,restoration:{exactOriginalBusinessContent:exactRestoration,originalPolicy,finalPolicy:finalHome?.preferences&&((finalHome.preferences as Record<string,unknown>).recordingPolicy),noTemporaryDraft:!finalDraft,sourceRevisionAdvanced:finalHome?._rev!==original._rev},privateCase:{finalStatus:placement?.status??'not-created',nativeReviewCreated:Boolean(nativeInstance),anonymousVisibleRecords:privateVisible},passed:!failure&&exactRestoration&&!finalDraft&&privateVisible===0,limitations:['This validates real Content Lake/Actions/native workflow and authenticated API behavior, not signed-in App SDK browser clicks.','Native workflow guards are advisory. Dataset access controls protect private records; the application independently checks source freshness and decision rules.','Independent source records can change between final source read and atomic placement/audit commit; this narrow race is not claimed eliminated.'],references:['https://www.sanity.io/docs/content-lake/drafts-and-versions','https://reference.sanity.io/_sanity/client/','https://www.sanity.io/docs/workflows/actors-and-enforcement'],...(failure?{error:failure instanceof Error?failure.message:String(failure)}:{})}
 writeFileSync('docs/change-impact-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))
 if(!report.passed)throw new Error('The controlled drill did not fully pass; review the saved restoration and verification report.')
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Controlled drill failed.');process.exitCode=1})