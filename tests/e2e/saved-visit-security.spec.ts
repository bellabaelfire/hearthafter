import {expect, test, type Page} from "@playwright/test";
import {createInitialHearthState} from "../../src/lib/hearth/fixtures";
import {rankPairs} from "../../src/lib/hearth/matching";
import {applyPlacementCommand} from "../../src/lib/hearth/placement";
import type {SavedVisit} from "../../src/lib/hearth/saved-visit";

const storageKey = "hearthafter-household-v1";
function validVisit(): SavedVisit {
  const state = createInitialHearthState(), home = state.homes[0].preferences;
  const pair = rankPairs(state, home, ["quiet-hours"]).find(entry => entry.status === "eligible")!;
  const result = applyPlacementCommand(state, {type: "create", requestId: "security-browser-case", home, spiritIds: pair.spiritIds, acceptedClauseIds: pair.acceptedClauseIds, sourceSnapshot: pair.sourceSnapshot}, {actor: "Local demonstration reviewer", now: "2026-10-02T12:00:00.000Z"});
  return {version: 1, home, placements: result.state.placements, events: result.state.events};
}
async function mockRegistry(page: Page) {
  await page.route("**/api/content", route => route.fulfill({json: {state: createInitialHearthState(), mode: "offline"}}));
}
async function seedVisit(page: Page, visit: SavedVisit) {
  await page.addInitScript(({key, value}) => {if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));}, {key: storageKey, value: visit});
}

test("a malformed saved case recovers without a render crash and can be replaced", async ({page}) => {
  await mockRegistry(page);
  const visit = validVisit();
  Object.assign(visit.placements[0], {consents: {}, evaluation: {sourceSnapshot: {}}});
  await seedVisit(page, visit);
  await page.goto(`/stay/${visit.placements[0].id}`);
  await expect(page.getByRole("heading", {name: "Case not found"})).toBeVisible();
  await expect(page.getByText(/Your saved visit could not be restored/)).toBeVisible();
  await expect(page.getByText("We couldn't open this page.")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", {name: "Case not found"})).toBeVisible();
  await page.goto("/find");
  await page.getByRole("button", {name: /CASE 001 June/}).click();
  await page.getByRole("button", {name: /see its possible (pairings|placements) now/}).click();
  await expect(page).toHaveURL(/\/matches$/);
  await expect(page.getByText(/Your saved visit could not be restored/)).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).placements.length, storageKey)).toBe(0);
});

test("saved notes display literally and remain inert after reload", async ({page}) => {
  await mockRegistry(page);
  const visit = validVisit();
  const note = '<img src=x onerror="window.untrustedNoteRan=true">';
  visit.events[0].note = note;
  await seedVisit(page, visit);
  await page.goto(`/stay/${visit.placements[0].id}`);
  await expect(page.locator("#case-notes")).toContainText(note);
  await expect(page.locator('#case-notes img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => "untrustedNoteRan" in window)).toBe(false);
  await page.reload();
  await expect(page.locator("#case-notes")).toContainText(note);
  await expect(page.getByText(/Your saved visit could not be restored/)).toHaveCount(0);
});
