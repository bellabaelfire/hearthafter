import {test,expect,type Page,type APIRequestContext,type BrowserContext} from "@playwright/test";
import type {HearthState} from "../../src/lib/hearth/domain";

async function mockRegistry(context:BrowserContext,request:APIRequestContext){
 const response=await request.get("/api/content");expect(response.ok()).toBe(true);
 const payload=await response.json() as {mode:"sanity"|"offline";state:HearthState;canEdit:boolean};
 let reads=0;
 await context.route("**/api/content",route=>{reads++;return route.fulfill({json:payload});});
 return {payload,reads:()=>reads};
}
async function pausePolling(page:Page){
 const time=new Date();await page.clock.install({time});await page.clock.pauseAt(time);
}
async function chooseJunePair(page:Page){
 await page.goto("/find");await page.getByRole("button",{name:/CASE 001 June/}).click();
 await page.getByRole("button",{name:/see its possible (pairings|placements) now/}).click();
 await page.goto("/match/spirit_iona_vale~spirit_orin_pell");
 await page.getByRole("checkbox").check();
 await expect(page.getByRole("button",{name:"Review an introduction"})).toBeEnabled();
}
test("a focus refresh applies changed household facts before opening an introduction",async({page,context,request})=>{
 const registry=await mockRegistry(context,request);await chooseJunePair(page);await pausePolling(page);
 const before=registry.reads();const home=registry.payload.state.homes.find(home=>home.id==="household_june_leila")!;
 home.preferences.recordingPolicy="active";home.rev+="-focus-correction";
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect.poll(registry.reads).toBeGreaterThan(before);
 await expect(page.getByRole("heading",{name:"Requirements that are not met"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Review an introduction"})).toBeDisabled();
 await expect(page.getByText(/Orin.*camera|camera.*Orin/).first()).toBeVisible();
});
test("returning to a visible document refreshes profiles without waiting for the poll",async({page,context,request})=>{
 const registry=await mockRegistry(context,request);await pausePolling(page);
 await page.goto("/spirits/spirit_iona_vale");await expect(page.getByRole("heading",{name:"Iona Vale",exact:true})).toBeVisible();
 const spirit=registry.payload.state.spirits.find(spirit=>spirit.id==="spirit_iona_vale")!;
 const summary="Iona has added a new preference: a quiet afternoon conversation before any household introduction.";
 spirit.summary=summary;spirit.rev+="-visibility-correction";const before=registry.reads();
 await page.evaluate(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"hidden"});document.dispatchEvent(new Event("visibilitychange"));window.dispatchEvent(new Event("focus"));});
 await page.waitForTimeout(200);expect(registry.reads()).toBe(before);
 await expect(page.getByText(summary,{exact:true})).toHaveCount(0);
 await page.evaluate(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"visible"});document.dispatchEvent(new Event("visibilitychange"));});
 await expect.poll(registry.reads).toBeGreaterThan(before);
 await expect(page.getByText(summary,{exact:true})).toBeVisible();
});
test("another tab receives saved case answers and keeps them through a focus refresh",async({page,context,request})=>{
 await mockRegistry(context,request);await chooseJunePair(page);
 await page.getByRole("button",{name:"Review an introduction"}).click();
 await page.getByRole("button",{name:"Save trial & relocation plan"}).click();
 const firstQuestion=page.locator("#introductions article").first();
 await firstQuestion.getByRole("button",{name:/^Record yes for/}).click();
 const caseURL=page.url();const second=await context.newPage();await second.goto(caseURL);
 await expect(second.locator("#introductions article").first().getByRole("button",{name:/^Record yes for/})).toHaveAttribute("aria-pressed","true");
 await page.bringToFront();
 await page.locator("#introductions article").nth(1).getByRole("button",{name:/^Record yes for/}).click();
 await expect(second.locator("#introductions article").nth(1).getByRole("button",{name:/^Record yes for/})).toHaveAttribute("aria-pressed","true");
 await second.bringToFront();await second.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(second.locator("#introductions article").first().getByRole("button",{name:/^Record yes for/})).toHaveAttribute("aria-pressed","true");
 await expect(second.locator("#introductions article").nth(1).getByRole("button",{name:/^Record yes for/})).toHaveAttribute("aria-pressed","true");
 await second.reload();
 await expect(second.locator("#introductions article").nth(1).getByRole("button",{name:/^Record yes for/})).toHaveAttribute("aria-pressed","true");
 await expect(second.getByRole("button",{name:"Begin trial stay"})).toBeDisabled();
});
