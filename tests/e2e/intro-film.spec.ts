import {test, expect, type Page} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {mkdirSync} from "node:fs";

async function openFilm(page: Page) {
  await page.goto("/");
  const trigger = page.getByRole("button", {name: /Watch the Overlap/});
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.getByRole("dialog", {name: "The Overlap", exact: true})).toBeVisible();
}

test("an early animation timestamp cannot turn the first scene into a missing scene", async ({page}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {name: /Watch the Overlap/});
  await expect(trigger).toBeEnabled();
  // A frame timestamp may precede the effect's performance.now() sample. Force that case.
  await page.evaluate(() => {
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => original(() => callback(performance.now() - 1000));
  });
  await trigger.click();
  await expect(page.getByRole("dialog", {name: "The Overlap", exact: true})).toBeVisible();
  await expect(page.locator('[data-scene="grid"]')).toBeVisible();
  await page.waitForTimeout(180);
  await expect(page.getByRole("heading", {name: "We couldn't open this page."})).toHaveCount(0);
  await expect(page.locator('[data-scene="grid"]')).toBeVisible();
  await expect(page.getByRole("button", {name: "Close introduction", exact: true})).toBeFocused();
});

test("the clock pauses visual motion and completes one minute without navigating", async ({page}) => {
  await page.clock.install();
  await openFilm(page);
  expect(await page.getByRole("dialog").locator("header").first().evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.clock.runFor(2100);
  await page.getByRole("button", {name: "Pause introduction", exact: true}).click();
  const stage = page.locator("[data-scene]");
  const pausedTime = await stage.evaluate(element => (element as HTMLElement).style.getPropertyValue("--scene-time"));
  const pausedScene = await stage.getAttribute("data-scene");
  await page.clock.fastForward(7000);
  expect(await stage.evaluate(element => (element as HTMLElement).style.getPropertyValue("--scene-time"))).toBe(pausedTime);
  await expect(stage).toHaveAttribute("data-scene", pausedScene!);
  await page.getByRole("button", {name: "Play introduction", exact: true}).click();
  await page.clock.runFor(58000);
  await expect(stage).toHaveAttribute("data-scene", "hearth");
  await expect(page.getByRole("button", {name: "Replay introduction", exact: true})).toBeVisible();
  await expect(page.getByLabel("60 of 60 seconds", {exact: true})).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.locator("audio, video").count()).toBe(0);
  await page.getByRole("dialog").getByRole("link", {name: "Begin host application", exact: true}).first().click();
  await expect(page).toHaveURL(/\/find$/);
});

test("twenty repeat launches and both dismissal controls restore focus", async ({page}) => {
  await page.emulateMedia({reducedMotion: "reduce"});
  await page.goto("/");
  const trigger = page.getByRole("button", {name: /Watch the Overlap/});
  for (let index = 0; index < 20; index++) {
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator('[data-scene="grid"]')).toBeVisible();
    if (index % 2) await page.getByRole("button", {name: "Skip introduction", exact: true}).click();
    else await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await expect(page).toHaveURL(/\/$/);
});

test("all five scenes remain readable with reduced motion on a small screen", async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: "reduce"});
  await openFilm(page);
  const sceneIds = ["grid", "overlap", "welcome", "review", "hearth"];
  for (let index = 0; index < sceneIds.length; index++) {
    await page.getByRole("button", {name: new RegExp(`^Scene ${index + 1}:`)}).click();
    const stage = page.locator(`[data-scene="${sceneIds[index]}"]`);
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute("data-paused", "true");
    const caption = stage.locator("[data-film-caption]");
    await expect(caption).toBeVisible();
    for (const image of await stage.locator("img").all()) {
      const source = new URL((await image.getAttribute("src"))!, page.url());
      expect(source.pathname.startsWith("/_next/image")).toBe(false);
      if (source.hostname === "cdn.sanity.io") {
        expect(Number(source.searchParams.get("w"))).toBeGreaterThan(0);
        expect(Number(source.searchParams.get("w"))).toBeLessThanOrEqual(1920);
        expect(Number(source.searchParams.get("q"))).toBe(75);
      } else expect(source.pathname).toMatch(/^\/art\/(hearthafter-hero|overlap-establishing)\.png$/);
    }
    expect(await caption.evaluate(element => { const text = element.querySelector("p")!; const a = element.getBoundingClientRect(); const b = text.getBoundingClientRect(); const c = element.parentElement!.getBoundingClientRect(); return b.bottom <= a.bottom && a.bottom <= c.bottom && a.left >= c.left && a.right <= c.right; })).toBe(true);
    expect(await stage.evaluate(element => [...element.querySelectorAll("*")].every(child => getComputedStyle(child).animationName === "none"))).toBe(true);
    expect(await page.getByRole("dialog").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    const result = await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.map(issue => ({id: issue.id, targets: issue.nodes.map(node => node.target)}))).toEqual([]);
  }
  await expect(page.getByRole("button", {name: "Play introduction", exact: true})).toHaveCount(0);
  await page.getByText("Read the full transcript", {exact: true}).click();
  await expect(page.getByText("Ashburn’s Data Center Alley demanded unprecedented electricity.", {exact: false})).toBeVisible();
  await expect(page.getByRole("button", {name: "Next scene", exact: true})).toBeDisabled();
});

test("small-screen playback controls stay reachable before and after dialog scrolling", async ({page}) => {
  await page.setViewportSize({width: 320, height: 568});
  await page.clock.install();
  const uncaught: string[] = [];
  page.on("pageerror", error => uncaught.push(error.message));
  for (let load = 0; load < 3; load++) {
    await openFilm(page);
    await page.clock.runFor(550);
    await expect(page.getByRole("heading", {name: "We couldn't open this page."})).toHaveCount(0);
    await expect(page.locator('[data-scene="grid"]')).toBeVisible();
    if (load < 2) await page.keyboard.press("Escape");
  }
  expect(uncaught).toEqual([]);
  const pause = page.getByRole("button", {name: "Pause introduction", exact: true});
  const dialog = page.getByRole("dialog");
  async function assertWithinScreen(button: ReturnType<Page["getByRole"]>) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    expect(box!.y + box!.height).toBeLessThanOrEqual(568);
    expect(await button.evaluate(element => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return Boolean(hit && element.contains(hit));
    })).toBe(true);
  }
  await expect(pause).toHaveCount(1);
  await assertWithinScreen(pause);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  mkdirSync(".tmp/qa/newsreel", {recursive: true});
  await page.screenshot({path: ".tmp/qa/newsreel/320-sticky-pause.png", animations: "disabled"});
  await pause.click();
  const stage = page.locator("[data-scene]");
  const pausedTime = await stage.evaluate(element => (element as HTMLElement).style.getPropertyValue("--scene-time"));
  await page.clock.fastForward(6000);
  expect(await stage.evaluate(element => (element as HTMLElement).style.getPropertyValue("--scene-time"))).toBe(pausedTime);
  await dialog.evaluate(element => { element.scrollTop = element.scrollHeight; });
  expect(await dialog.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const play = page.getByRole("button", {name: "Play introduction", exact: true});
  await assertWithinScreen(play);
  await play.click();
  await page.clock.runFor(1200);
  expect(await stage.evaluate(element => (element as HTMLElement).style.getPropertyValue("--scene-time"))).not.toBe(pausedTime);
  await assertWithinScreen(pause);
  await page.screenshot({path: ".tmp/qa/newsreel/320-sticky-pause-scrolled.png", animations: "disabled"});
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", {name: /Watch the Overlap/})).toBeFocused();
});


test("the film and field guide share the full Overlap cause and variable-group policy", async ({page}) => {
  await page.emulateMedia({reducedMotion: "reduce"});
  await openFilm(page);
  await expect(page.locator("[data-film-caption]")).toContainText("Data Center Alley");
  await expect(page.locator("[data-film-caption]")).toContainText("generation systems and transmission infrastructure");
  await page.getByRole("button", {name: "Next scene", exact: true}).click();
  await expect(page.locator("[data-film-caption]")).toContainText("unforeseen physical effect");
  await expect(page.locator("[data-film-caption]")).toContainText("Northern Virginia’s data-center corridor");
  await page.getByRole("button", {name: /^Scene 3:/}).click();
  await expect(page.locator("[data-film-caption]")).toContainText("vast numbers, from many eras");
  await expect(page.locator("[data-film-caption]")).toContainText("crowded with conflicting needs");
  await page.getByRole("button", {name: /^Scene 4:/}).click();
  await expect(page.locator("[data-film-caption]")).toContainText("new voluntary placement programme to keep the peace");
  await expect(page.locator("[data-film-caption]")).toContainText("groups begin at two");
  await expect(page.locator("[data-film-caption]")).not.toContainText("three separate decisions");
  await page.keyboard.press("Escape");
  await page.goto("/world");
  await expect(page.getByText(/Unprecedented new power-generation systems/)).toBeVisible();
  await expect(page.getByText(/extreme concentrated demand/)).toBeVisible();
  await expect(page.getByText(/The living already had homes/)).toBeVisible();
  await expect(page.getByText(/has newly introduced Hearthafter/)).toBeVisible();
  await expect(page.getByRole("heading", {name: "How we review a group"})).toBeVisible();
  await expect(page.getByText(/Children need guardian review and age-appropriate assent/)).toBeVisible();
});
