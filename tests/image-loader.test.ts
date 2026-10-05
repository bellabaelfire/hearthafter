import assert from "node:assert/strict";
import test from "node:test";
import loader from "../image-loader";

const source = "https://cdn.sanity.io/images/o3jy1zm6/production/" + "a".repeat(40) + "-1672x941.png";
process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "o3jy1zm6";
process.env.NEXT_PUBLIC_SANITY_DATASET = "production";

test("Sanity artwork is transformed directly by the existing CDN with bounded dimensions", () => {
  const actual = new URL(loader({src:source,width:828,quality:75}));
  assert.equal(actual.origin,"https://cdn.sanity.io");
  assert.equal(actual.pathname,new URL(source).pathname);
  assert.equal(actual.search,"?auto=format&fit=max&w=828&q=75");
  assert.equal(new URL(loader({src:source,width:9000,quality:100})).searchParams.get("w"),"1920");
  assert.equal(new URL(loader({src:source,width:9000,quality:100})).searchParams.get("q"),"75");
});

test("the three bundled offline originals stay functional without a proxy", () => {
  for (const src of ["/art/hearthafter-hero.png","/art/overlap-establishing.png","/art/spirit-portraits-atlas.png"]) {
    assert.equal(loader({src,width:828}),src);
  }
});

test("cross-project, cross-dataset, local, untrusted and parameterized images are rejected", () => {
  for (const src of [source.replace("o3jy1zm6","other"),source.replace("/production/","/private/"),source.replace("https:","http:"),source.replace("cdn.sanity.io","attacker.example"),source.replace("cdn.sanity.io","cdn.sanity.io.attacker.example"),source.replace("https://","https://user:pass@"),source+"?w=99999",source+"#fragment",source.replace(".png",".svg"),"http://127.0.0.1/private","//cdn.sanity.io/images/whatever","/art/unknown.png","data:image/svg+xml,test","javascript:alert(1)"]) {
    assert.throws(() => loader({src,width:800}), /Unsupported artwork/);
  }
  for (const width of [0,-1,NaN,Infinity]) assert.throws(() => loader({src:source,width}),/Invalid image/);
  assert.throws(() => loader({src:source,width:800,quality:NaN}),/Invalid image/);
});

