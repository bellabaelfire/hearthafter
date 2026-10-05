import assert from "node:assert/strict";
import test from "node:test";
import {matchRemotePattern} from "next/dist/shared/lib/match-remote-pattern";

test("image requests are limited to raw assets in the configured project and dataset", async () => {
  const previousProject = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const previousDataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "o3jy1zm6";
  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  try {
    const {default: config} = await import("../next.config");
    const patterns = config.images!.remotePatterns!;
    const allowed = (url: string) => patterns.some(pattern => matchRemotePattern(pattern, new URL(url)));
    assert.equal(allowed("https://cdn.sanity.io/images/o3jy1zm6/production/artwork-1672x941.png"), true);
    for (const url of [
      "https://cdn.sanity.io/images/unrelated/production/artwork-1672x941.png",
      "https://cdn.sanity.io/images/o3jy1zm6/private/artwork-1672x941.png",
      "https://cdn.sanity.io/images/o3jy1zm6/production/artwork-1672x941.png?unique=1",
      "https://cdn.sanity.io:8443/images/o3jy1zm6/production/artwork-1672x941.png",
      "https://cdn.sanity.io/files/o3jy1zm6/production/document.pdf",
      "http://127.0.0.1:3333/api/content",
      "http://cdn.sanity.io/images/o3jy1zm6/production/artwork-1672x941.png",
      "https://example.com/images/o3jy1zm6/production/artwork-1672x941.png",
    ]) assert.equal(allowed(url), false, url);
    assert.equal(config.images!.maximumRedirects, 0);
    assert.deepEqual(config.images!.qualities, [75]);
    assert.ok(config.images!.deviceSizes!.includes(1920), "Two-times portrait atlas keeps its full original resolution");
    const headers = await config.headers!();
    assert.equal(headers[0].headers.find(header => header.key === "Content-Security-Policy")?.value, "object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  } finally {
    if (previousProject === undefined) delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID; else process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = previousProject;
    if (previousDataset === undefined) delete process.env.NEXT_PUBLIC_SANITY_DATASET; else process.env.NEXT_PUBLIC_SANITY_DATASET = previousDataset;
  }
});
