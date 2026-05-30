// Integration tests: the REAL MCP server over the REAL MCP protocol (in-memory transport),
// and the REAL Forge API (no mocks). Live tests are gated on FORGE_API_KEY so the suite is
// honest when no key is present (they SKIP, they don't fake a pass).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ForgeClient, ForgeError } from "../src/forge.js";
import { buildServer } from "../src/index.js";

const KEY = process.env.FORGE_API_KEY;
const BASE = process.env.FORGE_BASE_URL || "https://api.voxell.ai";
const liveSkip = KEY ? false : "set FORGE_API_KEY to run live Forge tests";

async function connectedClient(forge: ForgeClient): Promise<Client> {
  const server = buildServer(forge);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: "forge-mcp-test", version: "0" });
  await client.connect(clientT);
  return client;
}

test("protocol: server exposes embed + list_models", async () => {
  const client = await connectedClient(new ForgeClient({ apiKey: "unused", baseUrl: BASE }));
  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["embed", "list_models"]);
  await client.close();
});

test("protocol: list_models returns the catalog (no network)", async () => {
  const client = await connectedClient(new ForgeClient({ apiKey: "unused", baseUrl: BASE }));
  const res = (await client.callTool({ name: "list_models", arguments: {} })) as {
    structuredContent: { models: Array<{ id: string; dim: number }> };
  };
  const ids = res.structuredContent.models.map((m) => m.id);
  assert.ok(ids.includes("turbo"));
  const turbo = res.structuredContent.models.find((m) => m.id === "turbo")!;
  assert.equal(turbo.dim, 1024);
  await client.close();
});

// Native dimensions, verified live against api.voxell.ai (2026-05-29).
const VERIFIED_DIMS: Array<[string, number]> = [
  ["turbo", 1024],
  ["pro", 2560],
  ["ultra", 4096],
];
for (const [model, dim] of VERIFIED_DIMS) {
  test(`live: ${model} → ${dim}-dim vectors`, { skip: liveSkip }, async () => {
    const forge = new ForgeClient({ apiKey: KEY!, baseUrl: BASE });
    const r = await forge.embed({ input: "verify dims", model });
    assert.equal(r.dim, dim, `${model} reported dim`);
    assert.equal(r.embeddings[0].length, dim, `${model} vector length`);
    assert.ok(r.embeddings[0].every((n) => Number.isFinite(n)), "finite floats");
  });
}

// MRL truncation, verified live per tier.
const TRUNCATIONS: Array<[string, number]> = [
  ["turbo", 256],
  ["pro", 512],
  ["ultra", 1024],
];
for (const [model, dim] of TRUNCATIONS) {
  test(`live: ${model} MRL truncation → ${dim}-dim`, { skip: liveSkip }, async () => {
    const forge = new ForgeClient({ apiKey: KEY!, baseUrl: BASE });
    const r = await forge.embed({ input: "truncate me", model, dim });
    assert.equal(r.embeddings[0].length, dim);
  });
}

test("live: batch of 2 texts → 2 vectors, positive tokens", { skip: liveSkip }, async () => {
  const forge = new ForgeClient({ apiKey: KEY!, baseUrl: BASE });
  const r = await forge.embed({ input: ["hello world", "second text"], model: "turbo" });
  assert.equal(r.embeddings.length, 2);
  assert.ok(r.tokens > 0, "expected a positive token count");
});

test("live: invalid key → ForgeError(401)", { skip: liveSkip }, async () => {
  const forge = new ForgeClient({ apiKey: "sk-invalid-deadbeef", baseUrl: BASE });
  await assert.rejects(
    () => forge.embed({ input: "x" }),
    (e: unknown) => e instanceof ForgeError && e.status === 401,
  );
});

test("live: full MCP round-trip (protocol + real Forge embed)", { skip: liveSkip }, async () => {
  const client = await connectedClient(new ForgeClient({ apiKey: KEY!, baseUrl: BASE }));
  const res = (await client.callTool({
    name: "embed",
    arguments: { input: "mcp roundtrip", model: "turbo" },
  })) as { structuredContent: { dim: number; count: number; embeddings: number[][] } };
  assert.equal(res.structuredContent.count, 1);
  assert.equal(res.structuredContent.dim, 1024);
  assert.equal(res.structuredContent.embeddings[0].length, 1024);
  await client.close();
});
