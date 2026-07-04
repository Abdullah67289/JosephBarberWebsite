// OpenNext Cloudflare adapter config.
// The public pages use `revalidate = 300` (ISR); without an incremental cache
// they fall back to dynamic rendering per request, which is fine at this
// site's traffic. Wire an R2/KV incremental cache here later if needed:
// https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
