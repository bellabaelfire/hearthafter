import {test, expect, type Page, type APIRequestContext} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {mkdirSync} from "node:fs";
import type {HearthState, PlacementCommand} from "../../src/lib/hearth/domain";
import {evaluatePair} from "../../src/lib/hearth/matching";
import {applyPlacementCommand} from "../../src/lib/hearth/placement";

async function openRecord(page: Page, request: APIRequestContext) {
  const response = await request.get("/api/content");
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  let state = payload.state as HearthState;
  const home = state.homes.find(entry => entry.id === "household_june_leila")!.preferences;
  const spiritIds: [string, string] = ["spirit_iona_vale", "spirit_orin_pell"];
  const evaluation = evaluatePair(state, {home, spiritIds, acceptedClauseIds: ["quiet-hours"]});
  const context = {actor: "Browser test reviewer", now: "2026-10-02T16:00:00.000Z"};
  let index = 0;
  const result = applyPlacementCommand(state, {type: "create", requestId: "5907e6d3-b9e3-4bf0-a4e5-02061002c701", home, spiritIds, acceptedClauseIds: evaluation.acceptedClauseIds, sourceSnapshot: evaluation.sourceSnapshot}, context);
  state = result.state;
  const id = result.placement.id;
  function apply(command: Omit<Extract<PlacementCommand, {type: "set-plan"}>, "requestId" | "placementId" | "expectedRev"> | Omit<Extract<PlacementCommand, {type: "record-answer"}>, "requestId" | "placementId" | "expectedRev"> | Omit<Extract<PlacementCommand, {type: "record-consent"}>, "requestId" | "placementId" | "expectedRev">) {
    state = applyPlacementCommand(state, {...command, placementId: id, expectedRev: state.placements.find(entry => entry.id === id)!.rev, requestId: `print-record-action-${++index}`} as PlacementCommand, context).state;
  }
  apply({type: "set-plan", trialPlan: {durationDays: 14, checkInDays: [2, 7, 14], successCriteria: "Everyone can join in, retreat, and ask for changes without pressure."}, relocationPlan: {destination: "The Willow House guest rooms", coordinator: "OLDA duty placement coordinator", trigger: "Anyone asks to end the stay or a shared boundary cannot be maintained.", handoverNotes: "Confirm a private room, arrange the move, and check in with each resident separately."}});
  for (const question of result.placement.evaluation.introductionQuestions.filter(question => question.requiredForTrial)) apply({type: "record-answer", spiritId: question.spiritId, questionId: question.id, answer: "yes", note: "The fictional household and spirit confirmed this point in the test introduction."});
  for (const party of ["household", "spirit-a", "spirit-b"] as const) apply({type: "record-consent", party, decision: "granted", note: "This fictional party independently agreed to the saved test plan."});
  await page.goto("/about");
  await page.evaluate(saved => localStorage.setItem("hearthafter-household-v1", JSON.stringify(saved)), {version: 1, home, placements: state.placements, events: state.events});
  await page.goto(`/stay/${id}/record`);
  await expect(page.getByTestId("record-status")).toHaveText("Ready for a trial");
  return {id, payload};
}

test("the case record preserves three decisions, prints, and survives reload", async ({page, request}) => {
  await openRecord(page, request);
  await expect(page.getByRole("heading", {name: "Iona Vale", exact: true})).toHaveCount(2);
  await expect(page.getByRole("heading", {name: "Orin Pell", exact: true})).toHaveCount(2);
  await expect(page.getByText("Agreement recorded", {exact: true})).toHaveCount(3);
  await expect(page.getByText(/I can mend a clock/)).toBeVisible();
  const issues = await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(issues.violations.map(issue => ({id: issue.id, nodes: issue.nodes.map(node => node.target)}))).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("record-status")).toHaveText("Ready for a trial");
  await expect(page.getByText("Agreement recorded", {exact: true})).toHaveCount(3);
  await page.evaluate(() => { window.print = () => {document.documentElement.dataset.printRequested = "yes";}; });
  await page.getByRole("button", {name: "Print case record"}).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-requested", "yes");
  mkdirSync(".tmp/qa", {recursive: true});
  await page.screenshot({path: ".tmp/qa/case-record-desktop.png", fullPage: true, animations: "disabled"});
  await page.pdf({path: ".tmp/qa/case-record-print.pdf", format: "A4", printBackground: true, preferCSSPageSize: true});
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: "reduce"});
  expect(await page.getByRole("article", {name: "Placement case record"}).evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  const mobileIssues = await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(mobileIssues.violations.map(issue => issue.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: ".tmp/qa/case-record-mobile.png", fullPage: true, animations: "disabled"});
});

test("source changes are visible on the paper copy and preserve historical decisions", async ({page, request}) => {
  const {payload} = await openRecord(page, request);
  payload.state.spirits.find((spirit: {id: string}) => spirit.id === "spirit_iona_vale").rev += "-print-test-changed";
  await page.route("**/api/content", route => route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify(payload)}));
  await page.reload();
  await expect(page.getByTestId("record-status")).toHaveText("Review required");
  await expect(page.getByText("Agreement needs review", {exact: true})).toHaveCount(3);
  await expect(page.getByText("Agreement recorded", {exact: true})).toHaveCount(0);
  await page.emulateMedia({media: "print"});
  await expect(page.getByTestId("record-status")).toBeVisible();
  await expect(page.getByText("Agreement needs review", {exact: true}).first()).toBeVisible();
  await page.screenshot({path: ".tmp/qa/case-record-stale-print.png", fullPage: true, animations: "disabled"});
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("hearthafter-household-v1")!).placements[0]);
  expect(Object.values(saved.consents).every(value => (value as {decision: string}).decision === "granted")).toBe(true);
});

test("a failed refresh prevents a confident print action", async ({page, request}) => {
  await page.clock.install();
  await openRecord(page, request);
  await page.route("**/api/content", route => route.fulfill({status: 503, contentType: "application/json", body: JSON.stringify({error: "Registry connection unavailable during print test."})}));
  await page.clock.fastForward(16000);
  await expect(page.getByTestId("record-status")).toHaveText("Registry check unavailable");
  await expect(page.getByRole("button", {name: "Print case record"})).toBeDisabled();
  await expect(page.getByText("Agreement needs review", {exact: true})).toHaveCount(3);
});

test("a missing browser case offers recovery without manufacturing a record", async ({page}) => {
  await page.goto("/stay/no-such-local-case/record");
  await expect(page.getByRole("heading", {name: "Case not found"})).toBeVisible();
  await expect(page.getByRole("button", {name: "Print case record"})).toHaveCount(0);
  await expect(page.getByRole("link", {name: "Your cases", exact: true})).toHaveAttribute("href", "/visits");
});
