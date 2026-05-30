// Smoke test of the ACTUAL shipped artifact: spawn the built `dist/index.js` as a child
// process and drive it as a real MCP client over real stdio — exactly how `npx` runs it.
// Gated on FORGE_API_KEY (the child makes a real Forge call).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const KEY = process.env.FORGE_API_KEY;
const BASE = process.env.FORGE_BASE_URL || "https://api.voxell.ai";
const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, "..", "dist", "index.js");
const skip = !KEY
  ? "set FORGE_API_KEY to run the stdio smoke test"
  : !existsSync(bin)
    ? "run `npm run build` first (dist/index.js missing)"
    : false;

test("stdio: built binary serves embed over a spawned process", { skip }, async () => {
  const transport = new StdioClientTransport({
    command: process.execPath, // node
    args: [bin],
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
