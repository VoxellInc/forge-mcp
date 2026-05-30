// Smoke tests of the ACTUAL shipped bin (`dist/cli.js`), launched THROUGH A SYMLINK — exactly
// how npx / an MCP client's `.bin` shim runs it. This reproduces the ESM "is-main" pitfall:
// a guard like `argv[1] === import.meta.url` no-ops under a symlinked bin. cli.ts must run
// main() unconditionally; these tests fail loudly if it ever regresses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, symlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const KEY = process.env.FORGE_API_KEY;
const BASE = process.env.FORGE_BASE_URL || "https://api.voxell.ai";
const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, "..", "dist", "cli.js");
const builtSkip = existsSync(bin) ? false : "run `npm run build` first (dist/cli.js missing)";

// A symlink to the built bin, mimicking node_modules/.bin/forge-mcp.
function linkToBin(): string {
  const dir = mkdtempSync(join(tmpdir(), "forge-mcp-bin-"));
  const link = join(dir, "forge-mcp");
  symlinkSync(bin, link);
  return link;
}

// No key needed: proves the symlinked bin (a) runs main() (the is-main-guard regression) AND
// (b) starts WITHOUT a key and answers tools/list — exactly what registries/Glama introspect.
test("stdio(symlink): starts keyless and serves tools/list (introspection)", { skip: builtSkip }, async () => {
  const link = linkToBin();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [link],
    env: { PATH: process.env.PATH ?? "" }, // deliberately NO FORGE_API_KEY
  });
  const client = new Client({ name: "forge-mcp-introspect", version: "0" });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((t) => t.name).sort(), ["embed", "list_models"]);
  } finally {
    await client.close();
  }
});

// Full MCP round-trip through the symlinked bin + real Forge call. Gated on a key.
test("stdio(symlink): real MCP round-trip via the bin", { skip: KEY ? builtSkip : "set FORGE_API_KEY to run" }, async () => {
  const link = linkToBin();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [link],
    env: { FORGE_API_KEY: KEY!, FORGE_BASE_URL: BASE, PATH: process.env.PATH ?? "" },
  });
  const client = new Client({ name: "forge-mcp-stdio-test", version: "0" });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some((t) => t.name === "embed"));
    const res = (await client.callTool({
      name: "embed",
      arguments: { input: "stdio smoke", model: "turbo" },
    })) as { structuredContent: { dim: number; embeddings: number[][] } };
    assert.equal(res.structuredContent.dim, 1024);
    assert.equal(res.structuredContent.embeddings[0].length, 1024);
  } finally {
    await client.close();
  }
});
