import assert from "node:assert/strict";
import test from "node:test";
import { createInitialHearthState } from "../src/lib/hearth/fixtures";
import { evaluatePair } from "../src/lib/hearth/matching";
import { applyPlacementCommand } from "../src/lib/hearth/placement";
import { getSourceCorrections } from "../src/lib/hearth/source-corrections";

function opened(anonymous = false) {
  const state = createInitialHearthState();
  const home = structuredClone(state.homes[0].preferences);
  if (anonymous) delete home.templateId;
  const spiritIds: [string,string] = ["spirit_iona_vale", "spirit_orin_pell"];
  const acceptedClauseIds = ["quiet-hours"];
  const evaluation = evaluatePair(state, {home, spiritIds, acceptedClauseIds});
  return applyPlacementCommand(state, {type:"create",requestId:"source-correction-test",home,spiritIds,acceptedClauseIds,sourceSnapshot:evaluation.sourceSnapshot}, {actor:"Test reviewer",now:"2026-10-02T12:00:00.000Z"});
}

test("an unchanged review has no correction notice and is not mutated", () => {
  const {state,placement} = opened();
  const before = structuredClone({state,placement});
  assert.deepEqual(getSourceCorrections(state,placement),{stale:false,changes:[],notice:""});
  assert.deepEqual({state,placement},before);
});

test("a recording correction compares actual saved and current household values", () => {
  const {state,placement} = opened();
  state.homes[0].preferences.recordingPolicy = "active";
  state.homes[0].rev += "-recording-change";
  const result = getSourceCorrections(state,placement);
  assert.equal(result.stale,true);
  assert.deepEqual(result.changes,[{field:"recordingPolicy",label:"Recording arrangements",before:"No cameras or recording devices active",after:"A camera or recording device remains active"}]);
  assert.equal(placement.home.recordingPolicy,"none");
});

test("restored recording facts with a new revision produce only a generic source notice", () => {
  const {state,placement} = opened();
  state.homes[0].preferences.recordingPolicy = "active";
  state.homes[0].preferences.recordingPolicy = "none";
  state.homes[0].rev += "-restored";
  const result = getSourceCorrections(state,placement);
  assert.equal(result.stale,true);
  assert.deepEqual(result.changes,[]);
  assert.match(result.notice,/does not show which facts changed/);
  assert.doesNotMatch(result.notice,/recording|camera/i);
});

test("a spirit revision cannot be presented as an inferred boundary or identity change", () => {
  const {state,placement} = opened();
  state.spirits.find(spirit=>spirit.id===placement.spiritIds[0])!.rev += "-edited";
  const result = getSourceCorrections(state,placement);
  assert.equal(result.stale,true);
  assert.deepEqual(result.changes,[]);
  assert.doesNotMatch(result.notice,/camera|boundary|identity|pronouns/i);
});

test("unknown recording terms remain explicit and an unrelated preset is never an anonymous applicant's previous home", () => {
  const result = opened();
  result.state.homes[0].preferences.recordingPolicy = null;
  result.state.homes[0].rev += "-unconfirmed";
  assert.equal(getSourceCorrections(result.state,result.placement).changes[0].after,"Not yet confirmed");
  const anonymous = opened(true);
  anonymous.state.homes[0].preferences.recordingPolicy = "active";
  anonymous.state.homes[0].rev += "-unrelated";
  assert.deepEqual(getSourceCorrections(anonymous.state,anonymous.placement),{stale:false,changes:[],notice:""});
});
