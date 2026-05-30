#!/usr/bin/env node
// Bin entrypoint. Kept separate from index.ts so `main()` runs unconditionally — the old
// `argv[1] === import.meta.url` "is-main" guard silently failed when launched via a symlinked
// bin (npx / MCP-client `.bin` shims), because ESM resolves import.meta.url to the real path
// while argv[1] is the symlink. index.ts stays a pure importable module for tests.
import { main } from "./index.js";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
