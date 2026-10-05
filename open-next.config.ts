import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Use the supported no-persistent-cache defaults. Registry reads remain live;
// this app uses neither ISR nor on-demand revalidation. Next 16.3's route cache
// keys do not match the adapter's exported static cache assets in this build.
export default defineCloudflareConfig();
