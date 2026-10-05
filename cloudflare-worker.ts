// The generated handler is created by the OpenNext build, never edited by hand.
// @ts-ignore Generated only after opennextjs-cloudflare build.
import handler from "./.open-next/worker.js";
import { withApiProtection } from "./src/lib/cloudflare/api-protection";
import { canonicalHearthafterRedirect } from "./src/lib/cloudflare/canonical-host";

export default {
  // Ingress limits run before redirects; write requests retain the established origin checks.
  fetch: withApiProtection(async (request, env, context) =>
    canonicalHearthafterRedirect(request) ?? handler.fetch(request, env, context)),
};