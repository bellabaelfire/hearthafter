import {defineConfig,devices} from "@playwright/test";
import {existsSync} from "node:fs";
const edge="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const baseURL=process.env.HEARTH_TEST_URL||"http://localhost:3333";
export default defineConfig({
 testDir:"./tests/e2e",fullyParallel:false,workers:1,timeout:60000,
 expect:{timeout:10000},outputDir:"test-results",
 reporter:[["list"],["html",{outputFolder:"playwright-report",open:"never"}]],
 use:{baseURL,trace:"retain-on-failure",screenshot:"only-on-failure",launchOptions:existsSync(edge)?{executablePath:edge}:{}},
 projects:[{name:"desktop",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:1000}}}],
 webServer:{command:'"'+process.execPath+'" node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3333',url:baseURL,reuseExistingServer:!process.env.CI,timeout:120000}
});
