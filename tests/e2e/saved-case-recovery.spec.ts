import {test,expect,type Page,type APIRequestContext} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {mkdirSync} from "node:fs";
import type {HearthState,PlacementCommand} from "../../src/lib/hearth/domain";
import {evaluatePair} from "../../src/lib/hearth/matching";
import {applyPlacementCommand,consentParties} from "../../src/lib/hearth/placement";
import {parseSavedVisit,type SavedVisit} from "../../src/lib/hearth/saved-visit";

const key="hearthafter-household-v1";
async function openSavedCase(page:Page,request:APIRequestContext,status:"review"|"trial"){
 const response=await request.get("/api/content");expect(response.ok()).toBe(true);
 let state=(await response.json()).state as HearthState;
 const home=state.homes.find(entry=>entry.id==="household_june_leila")!.preferences;
 const spiritIds=["spirit_iona_vale","spirit_orin_pell"];
 const evaluation=evaluatePair(state,{home,spiritIds,acceptedClauseIds:["quiet-hours"]});
 const context={actor:"Local demonstration reviewer",now:"2026-10-05T04:00:00.000Z"};
 const opened=applyPlacementCommand(state,{type:"create",requestId:`offline-recovery-${status}`,home,spiritIds,acceptedClauseIds:evaluation.acceptedClauseIds,sourceSnapshot:evaluation.sourceSnapshot},context);
 state=opened.state;const id=opened.placement.id;let sequence=0;
 const run=(intent:Record<string,unknown>)=>{state=applyPlacementCommand(state,{...intent,placementId:id,expectedRev:state.placements.find(entry=>entry.id===id)!.rev,requestId:`offline-recovery-${status}-${++sequence}`} as PlacementCommand,context).state;};
 run({type:"set-plan",trialPlan:{durationDays:14,checkInDays:[2,7,14],successCriteria:"Everyone can join in, retreat, and request a change without pressure."},relocationPlan:{destination:"The Willow House guest rooms",coordinator:"OLDA duty placement coordinator",trigger:"Anyone asks to end the stay or a shared boundary cannot be maintained.",handoverNotes:"Confirm a private room, arrange the move, and check in with each resident separately."}});
 for(const question of opened.placement.evaluation.introductionQuestions.filter(question=>question.requiredForTrial))run({type:"record-answer",questionId:question.id,spiritId:question.spiritId,answer:"yes",note:"Every affected person confirmed this point in the introduction."});
 for(const party of consentParties(state.placements.find(entry=>entry.id===id)!))run({type:"record-consent",party,decision:"granted",note:"This person independently agreed to the saved plan."});
 if(status==="trial")run({type:"transition",to:"trial",note:"The agreed voluntary trial begins after every independent decision."});
 const saved=parseSavedVisit(JSON.stringify({version:1,home,placements:state.placements,events:state.events}));
 await page.goto("/about");
 await page.evaluate(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key,saved});
 await page.goto(`/stay/${id}`);
 await expect(page.getByRole("heading",{name:status==="trial"?"Trial stay":"Placement review",exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole("heading",{name:status==="trial"?"Trial stay":"Placement review",exact:true})).toBeVisible();
 return {saved,id};
}
async function blockRegistryAndReload(page:Page){
 await page.route("**/api/content*",route=>route.abort("failed"));
 await page.reload();
 await expect(page.getByText("Saved record · current sources unverified",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Try again",exact:true})).toBeVisible();
}
async function readSaved(page:Page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!) as SavedVisit,key);}

test("saved trial exit remains accessible after a real registry failure and retry restores the same case",async({page,request})=>{
 const {saved}=await openSavedCase(page,request,"trial");
 await blockRegistryAndReload(page);
 await expect(page.getByRole("heading",{name:"Your saved safe exit"})).toBeVisible();
 for(const value of Object.values(saved.placements[0].relocationPlan!))await expect(page.getByText(value,{exact:true})).toBeVisible();
 await expect(page.getByText("Days 2, 7, 14",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Record agreement",exact:true})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Confirm settled placement",exact:true})).toBeDisabled();
 expect(await readSaved(page)).toEqual(saved);
 const issues=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
 expect(issues.violations.map(issue=>({id:issue.id,nodes:issue.nodes.map(node=>node.target)}))).toEqual([]);
 mkdirSync(".tmp/qa",{recursive:true});
 await page.screenshot({path:".tmp/qa/saved-case-recovery-desktop.png",fullPage:true,animations:"disabled"});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:".tmp/qa/saved-case-recovery-mobile.png",fullPage:true,animations:"disabled"});
 await page.unroute("**/api/content*");
 await page.getByRole("button",{name:"Try again",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Trial stay",exact:true})).toBeVisible();
 expect(await readSaved(page)).toEqual(saved);
});

test("saved visits reveal a case during an outage and a local withdrawal survives reload and registry recovery",async({page,request})=>{
 const {saved,id}=await openSavedCase(page,request,"trial");
 await page.route("**/api/content*",route=>route.abort("failed"));
 await page.goto("/visits");await page.reload();
 await expect(page.getByRole("heading",{name:"Your cases",exact:true})).toBeVisible();
 await expect(page.getByText("Saved record · current sources unverified",{exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Continue review for Iona Vale and Orin Pell"}).click();
 await expect(page).toHaveURL(new RegExp(`/stay/${id}$`));
 await page.getByLabel("Whose decision?").selectOption("spirit-a");
 await page.getByLabel("Refusal or withdrawal note").fill("I wish to leave and use the saved relocation arrangements.");
 await page.getByRole("button",{name:"Record withdrawal locally",exact:true}).click();
 await expect(page.getByText(/Refusal or withdrawal recorded in this browser/)).toBeVisible();
 const withdrawn=await readSaved(page);
 expect(withdrawn.placements[0].status).toBe("relocating");
 expect(withdrawn.placements[0].consents["spirit-a"].decision).toBe("denied");
 expect(withdrawn.placements[0].relocationPlan).toEqual(saved.placements[0].relocationPlan);
 expect(withdrawn.events).toHaveLength(saved.events.length+1);
 expect(withdrawn.events.at(-1)).toMatchObject({action:"record-consent",fromStatus:"trial",toStatus:"relocating",expectedRev:saved.placements[0].rev});
 await page.reload();
 await expect(page.getByRole("heading",{name:"Your saved safe exit"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Record withdrawal locally",exact:true})).toHaveCount(0);
 expect(await readSaved(page)).toEqual(withdrawn);
 await page.unroute("**/api/content*");
 await page.getByRole("button",{name:"Try again",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Relocation plan",exact:true})).toBeVisible();
 expect(await readSaved(page)).toEqual(withdrawn);
});

test("a saved fully agreed review cannot grant consent or begin a trial without fresh sources",async({page,request})=>{
 const {saved}=await openSavedCase(page,request,"review");
 await expect(page.getByRole("button",{name:"Begin trial stay",exact:true})).toBeEnabled();
 await blockRegistryAndReload(page);
 await expect(page.getByRole("button",{name:"Record agreement",exact:true})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Begin trial stay",exact:true})).toBeDisabled();
 expect(await readSaved(page)).toEqual(saved);
});

test("offline withdrawal rejects a saved revision changed before its storage event arrives",async({page,request})=>{
 const {saved}=await openSavedCase(page,request,"trial");
 await blockRegistryAndReload(page);
 const newer=structuredClone(saved);newer.placements[0].rev="rev-newer-tab-change";
 newer.placements[0].note="Another tab saved a newer case note.";
 await page.evaluate(({key,newer})=>localStorage.setItem(key,JSON.stringify(newer)),{key,newer});
 await page.getByLabel("Refusal or withdrawal note").fill("I wish to withdraw from this stay.");
 await page.getByRole("button",{name:"Record withdrawal locally",exact:true}).click();
 await expect(page.getByText("This case changed in another tab. Review its latest saved record before trying again.",{exact:true})).toBeVisible();
 expect(await readSaved(page)).toEqual(newer);
});

test("a saved case record route recovers exit details during an outage and keeps printing disabled",async({page,request})=>{
 const {saved,id}=await openSavedCase(page,request,"trial");
 await page.route("**/api/content*",route=>route.abort("failed"));
 await page.goto(`/stay/${id}/record`);await page.reload();
 await expect(page.getByRole("heading",{name:"Your saved safe exit"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Print case record",exact:true})).toBeDisabled();
 await expect(page.getByTestId("record-status")).toContainText("unverified");
 expect(await readSaved(page)).toEqual(saved);
 await page.unroute("**/api/content*");
 await page.getByRole("button",{name:"Try again",exact:true}).click();
 await expect(page.getByRole("article",{name:"Placement case record",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Print case record",exact:true})).toBeEnabled();
 expect(await readSaved(page)).toEqual(saved);
});

test("a rejected storage write keeps withdrawal retryable and never reports success",async({page,request})=>{
 const {saved}=await openSavedCase(page,request,"trial");
 await blockRegistryAndReload(page);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException("Quota exceeded","QuotaExceededError");};});
 await page.getByLabel("Refusal or withdrawal note").fill("I wish to leave and use the saved exit.");
 await page.getByRole("button",{name:"Record withdrawal locally",exact:true}).click();
 await expect(page.getByText(/Your browser could not save this decision/).first()).toBeVisible();
 await expect(page.getByText(/Refusal or withdrawal recorded in this browser/)).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Record withdrawal locally",exact:true})).toBeEnabled();
 expect(await readSaved(page)).toEqual(saved);
});

test("a live case action cannot overwrite a newer saved withdrawal before the storage event arrives",async({page,request})=>{
 const {saved}=await openSavedCase(page,request,"review");
 const newer=structuredClone(saved);
 newer.placements[0].rev="rev-withdrawal-in-another-tab";
 newer.placements[0].status="declined";
 newer.placements[0].consents.household={decision:"denied",at:"2026-10-05T04:30:00.000Z",note:"The household has refused this arrangement."};
 await page.evaluate(({key,newer})=>localStorage.setItem(key,JSON.stringify(newer)),{key,newer});
 await page.getByRole("button",{name:"Begin trial stay",exact:true}).click();
 await expect(page.getByText("This placement changed after you opened it. Refresh the review before trying again.",{exact:true})).toBeVisible();
 expect(await readSaved(page)).toEqual(newer);
});
