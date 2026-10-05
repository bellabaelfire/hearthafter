import assert from "node:assert/strict";
import test from "node:test";
import {persistPairingGuidance} from "../src/lib/hearth/sanity/persist-pairing-guidance";

test("guidance remains pending after the optimistic edit until the server accepts it", async () => {
  const server = Promise.withResolvers<void>();
  const submissionStarted = Promise.withResolvers<void>();
  let saved = false;
  const operation = persistPairingGuidance(async value => {
    assert.equal(value, "do-not-pair");
    return {submitted: () => {submissionStarted.resolve(); return server.promise;}};
  }, "do-not-pair").then(() => {saved = true;});
  await submissionStarted.promise;
  assert.equal(saved, false, "Optimistic application must not produce a saved result");
  server.resolve();
  await operation;
  assert.equal(saved, true);
});

test("a server rejection after optimistic editing rejects the saved result", async () => {
  const rejected = new Error("Sanity did not accept this edit");
  await assert.rejects(persistPairingGuidance(async () => ({submitted: async () => {throw rejected;}}), "unacquainted"), error => error === rejected);
});

test("an edit that fails before submission cannot report success", async () => {
  const rejected = new Error("The document is unavailable");
  await assert.rejects(persistPairingGuidance(async () => {throw rejected;}, "friendly"), error => error === rejected);
});
