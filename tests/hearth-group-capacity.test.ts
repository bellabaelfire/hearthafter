import assert from 'node:assert/strict';
import test from 'node:test';
import {createInitialHearthState} from '../src/lib/hearth/fixtures';
import {evaluatePair,validateHostPreferences} from '../src/lib/hearth/matching';
import {applyPlacementCommand} from '../src/lib/hearth/placement';
import {getSourceCorrections} from '../src/lib/hearth/source-corrections';
import {encodeDocument,decodeDocument} from '../src/lib/hearth/sanity/documents';
import type {PlacementCommand,Spirit} from '../src/lib/hearth/domain';
import {parseSavedVisit} from '../src/lib/hearth/saved-visit';
function scenario(){
 const state=createInitialHearthState();
 state.spirits=state.spirits.slice(0,3).map(spirit=>({...structuredClone(spirit),requiredCompanionIds:undefined,guardianSpiritId:undefined,assentRequired:undefined,ageAtPassing:40,boundaryIds:[],introductionQuestions:[],energy:'balanced' as const,company:'medium' as const,presence:'both' as const,interests:['tea','books'],preferredHours:undefined,spiritConsent:'yes' as const,audibleHours:'none' as const,petCompatibility:{cats:true,dogs:true,other:true}}));
 state.homes[0].preferences={...state.homes[0].preferences,departedCapacity:3,pets:'none',quietHours:'none',privateRetreat:true,stepFreeAccess:true,hasGarden:true,activityPreference:'balanced',companyPreference:'medium',nightPresence:'welcome',recordingPolicy:'none',sharedEvenings:7,householdConsent:'yes',relocationWillingness:'yes',respectBoundaries:'yes',welcomedInterests:['tea','books']};
 state.pairRelationships=[];state.matchingPolicy.minimumHostScore=0;state.matchingPolicy.minimumPairScore=0;state.matchingPolicy.minimumOverallScore=0;
 return state;
}
function evaluate(state= scenario(),ids=state.spirits.map(spirit=>spirit.id)){return evaluatePair(state,{home:state.homes[0].preferences,spiritIds:ids});}
const code=(expected:string)=>(error:unknown)=>Boolean(error&&typeof error==='object'&&'code'in error&&error.code===expected);
test('offered household capacity is a hard boundary before every score',()=>{
 for(const capacity of [0,1,2]) {const state=scenario();state.homes[0].preferences.departedCapacity=capacity;const result=evaluate(state);assert.equal(result.status,'excluded');assert.ok(result.exclusions.some(reason=>reason.code==='household-capacity'));assert.equal(result.overallScore,null);assert.ok(Object.values(result.hostScores!).every(score=>score===null));}
 assert.equal(evaluate().status,'eligible');
});
test('explicit unknown space blocks a recommendation; absent legacy capacity stays readable',()=>{
 const state=scenario();state.homes[0].preferences.departedCapacity=null;assert.equal(evaluate(state).status,'needs-information');assert.ok(evaluate(state).unknowns.some(reason=>reason.code==='unknown-capacity'));
 delete state.homes[0].preferences.departedCapacity;assert.equal(evaluate(state,state.spirits.slice(0,2).map(spirit=>spirit.id)).status,'eligible');
});
test('capacity inputs reject fractional, negative, unbounded and nonnumeric values',()=>{
 const home=scenario().homes[0].preferences;
 for(const value of [-1,1.5,13,NaN,'3',true]) assert.throws(()=>validateHostPreferences({...home,departedCapacity:value} as never),code('INVALID_HOME'));
 for(const value of [0,1,2,3,12,null,undefined]) assert.doesNotThrow(()=>validateHostPreferences({...home,departedCapacity:value}));
});
test('an intact family is required from either direction, including guardian-selected child-omitted reviews',()=>{
 const state=scenario(),[parent,other,child]=state.spirits;
 child.ageAtPassing=9;child.portrait='child';child.guardianSpiritId=parent.id;
 for(const spirit of state.spirits) spirit.requiredCompanionIds=state.spirits.filter(other=>other.id!==spirit.id).map(other=>other.id);
 for(const ids of [[parent.id,other.id],[parent.id,child.id]]) {const match=evaluate(state,ids);assert.equal(match.status,'excluded');assert.ok(match.exclusions.some(reason=>reason.code==='required-companions'));assert.equal(match.overallScore,null);}
 const full=evaluate(state);assert.equal(full.status,'eligible');assert.equal(full.consentRequirements?.length,5);
 state.homes[0].preferences.departedCapacity=2;assert.ok(evaluate(state).exclusions.some(reason=>reason.code==='household-capacity'));
});
test('required-companion revisions and native references survive Content Lake projection',()=>{
 const state=scenario();state.spirits[0].requiredCompanionIds=state.spirits.slice(1).map(spirit=>spirit.id);
 const before=evaluate(state).sourceSnapshot;
 state.spirits[2].rev+='-revised';assert.notEqual(evaluate(state).sourceSnapshot.fingerprint,before.fingerprint);
 const encoded=encodeDocument('hearthSpirit',state.spirits[0]);assert.equal((encoded.companionRefs as unknown[]).length,2);
 const restored=decodeDocument<Spirit>({...encoded,_rev:state.spirits[0].rev});assert.deepEqual(restored.requiredCompanionIds,state.spirits[0].requiredCompanionIds);assert.equal('companionRefs' in restored,false);
});
test('capacity edits are explained and invalidate the source snapshot of existing reviews',()=>{
 const state=scenario(),home=state.homes[0].preferences,match=evaluate(state,state.spirits.slice(0,2).map(spirit=>spirit.id));
 const opened=applyPlacementCommand(state,{type:'create',requestId:'capacity-review-test',home,spiritIds:match.spiritIds,acceptedClauseIds:[],sourceSnapshot:match.sourceSnapshot},{actor:'Fictional reviewer',now:'2026-10-05T04:30:00.000Z'});
 opened.state.homes[0].preferences.departedCapacity=2;opened.state.homes[0].rev+='-updated';
 const correction=getSourceCorrections(opened.state,opened.placement);assert.equal(correction.stale,true);assert.ok(correction.changes.some(change=>change.field==='departedCapacity'&&change.before==='3'&&change.after==='2'));
});

test('older custom household answers cannot open a new triple without confirmed space',()=>{
 const state=scenario(),home=state.homes[0].preferences;
 delete home.templateId;delete home.departedCapacity;
 const match=evaluate(state);
 assert.equal(match.status,'needs-information');assert.ok(match.unknowns.some(reason=>reason.code==='unknown-capacity'));
 assert.equal(match.overallScore,null);assert.ok(Object.values(match.hostScores!).every(score=>score===null));
 assert.throws(()=>applyPlacementCommand(state,{type:'create',requestId:'legacy-custom-new-triple',home,spiritIds:match.spiritIds,acceptedClauseIds:[],sourceSnapshot:match.sourceSnapshot},{actor:'Fictional reviewer',now:'2026-10-05T04:50:00.000Z'}),code('MATCH_NOT_ELIGIBLE'));
 assert.equal(evaluate(state,state.spirits.slice(0,2).map(spirit=>spirit.id)).status,'eligible');
});

test('a saved older triple trial remains readable and permits withdrawal without capacity migration',()=>{
 let state=scenario();delete state.homes[0].preferences.templateId;
 const match=evaluate(state),context={actor:'Fictional reviewer',now:'2026-10-05T04:50:00.000Z'};
 const opened=applyPlacementCommand(state,{type:'create',requestId:'legacy-triple-trial-open',home:match.home,spiritIds:match.spiritIds,acceptedClauseIds:[],sourceSnapshot:match.sourceSnapshot},context);
 state=opened.state;let sequence=0;
 const run=(intent:Record<string,unknown>)=>{const placement=state.placements[0];state=applyPlacementCommand(state,{...intent,placementId:placement.id,expectedRev:placement.rev,requestId:'legacy-triple-command-'+(++sequence)} as PlacementCommand,context).state;};
 run({type:'set-plan',trialPlan:{durationDays:14,checkInDays:[7,14],successCriteria:'Every resident freely wishes to continue.'},relocationPlan:{destination:'The fictional guesthouse',coordinator:'Placement steward',trigger:'Any resident or household member withdraws.',handoverNotes:'Arrange a comfortable room and a supported private handover.'}});
 for(const question of state.placements[0].evaluation.introductionQuestions.filter(question=>question.requiredForTrial)) run({type:'record-answer',questionId:question.id,spiritId:question.spiritId,answer:'yes',note:'Every affected person reviewed these arrangements.'});
 for(const party of ['household','spirit-a','spirit-b','spirit-3']) run({type:'record-consent',party,decision:'granted',note:'The complete plan was freely agreed.'});
 run({type:'transition',to:'trial',note:'All required people agree to the supported trial.'});
 const historical=state.placements[0];delete historical.home.departedCapacity;delete historical.evaluation.home.departedCapacity;delete state.homes[0].preferences.departedCapacity;
 const saved=parseSavedVisit(JSON.stringify({version:1,home:state.homes[0].preferences,placements:state.placements,events:state.events}));
 assert.equal(saved.placements[0].status,'trial');assert.equal(saved.placements[0].spiritIds.length,3);
 assert.equal(saved.placements[0].relocationPlan?.destination,'The fictional guesthouse');
 state.placements=saved.placements;state.events=saved.events;
 run({type:'record-consent',party:'spirit-3',decision:'denied',note:'The third resident freely chooses to leave.'});
 assert.equal(state.placements[0].status,'relocating');
 assert.equal(parseSavedVisit(JSON.stringify({version:1,home:saved.home,placements:state.placements,events:state.events})).placements[0].status,'relocating');
});
