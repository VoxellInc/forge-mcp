// Forge MCP server — exposes Voxell's GA embedding API as MCP tools (embed, list_models)
// over stdio. The developer supplies FORGE_API_KEY; no Voxell infra is involved.
// The bin entrypoint is cli.ts (it calls main()); this file stays a pure importable module.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ForgeClient, FORGE_MODELS } from "./forge.js";

export const SERVER_NAME = "forge";
export const SERVER_VERSION = "0.1.5";

/** Build the MCP server bound to a Forge client. Exported so tests can drive it
 *  over an in-memory transport with a real client. */
export function buildServer(client: ForgeClient): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "embed",
    {
      title: "Embed text with Forge",
      description:
        "Generate vector embeddings for one or more texts with Forge (Voxell's hosted embedding " +
        "API). Use it to turn text into vectors for semantic search, RAG, clustering, or " +
        "similarity. Set input_type='query' for search queries and 'document' for content you " +
        "index. Choose model by quality/cost: turbo (1024d, fast, default) -> pro (2560d) -> ultra " +
        "(4096d, #4 on MTEB English, top usable). Optionally set dim to truncate (Matryoshka, re-normalized).",
      inputSchema: {
        input: z
          .union([z.string(), z.array(z.string())])
          .describe("A text, or array of texts, to embed."),
        model: z
          .string()
          .optional()
          .describe("Model by quality/cost: turbo (1024d, fast, default), pro (2560d), ultra (4096d, #4 on MTEB English, top usable)."),
        dim: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Truncate to N dimensions (Matryoshka, re-normalized) — fewer dims = smaller, cheaper vectors. Omit for the model's native size."),
        input_type: z
          .enum(["query", "document"])
          .optional()
          .describe("'query' applies a retrieval prefix; 'document' is raw. Default 'document'."),
      },
      outputSchema: {
        model: z.string(),
        dim: z.number(),
        count: z.number(),
        tokens: z.number(),
        embeddings: z.array(z.array(z.number())),
      },
    },
    async (args) => {
      const r = await client.embed(args);
      const structuredContent = {
        model: r.model,
        dim: r.dim,
        count: r.embeddings.length,
        tokens: r.tokens,
        embeddings: r.embeddings,
      };
      return {
        content: [
          {
            type: "text",
            text: `Embedded ${r.embeddings.length} text(s) → ${r.dim}-dim vectors (model=${r.model}, tokens=${r.tokens}, ${r.latency_ms}ms).`,
          },
        ],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "list_models",
    {
      title: "List Forge embedding models",
      description: "List the available Forge embedding models and their dimensions. Call this to pick a model before embedding.",
      inputSchema: {},
      outputSchema: {
        models: z.array(
          z.object({ id: z.string(), dim: z.number(), default: z.boolean() }),
        ),
      },
    },
    async () => ({
      content: [
        {
          type: "text",
          text: FORGE_MODELS.map(
            (m) => `${m.id} (${m.dim}d)${m.default ? " [default]" : ""}`,
          ).join("\n"),
        },
      ],
      structuredContent: { models: FORGE_MODELS },
    }),
  );

  return server;
}

export async function main(): Promise<void> {
  const apiKey = process.env.FORGE_API_KEY ?? "";
  const baseUrl = process.env.FORGE_BASE_URL || "https://api.voxell.ai";
  if (!apiKey) {
    // Don't exit — start anyway so the server is introspectable (tools/list, list_models,
    // and registry/Glama checks work without a key). `embed` returns a clear error until set.
    console.error(
      "forge-mcp: FORGE_API_KEY not set — tools are listed, but `embed` will error until you provide it. Get a key at https://dash.voxell.ai",
    );
  }
  const client = new ForgeClient({ apiKey, baseUrl });
  const server = buildServer(client);
  await server.connect(new StdioServerTransport());
  console.error(`forge-mcp ${SERVER_VERSION} running on stdio (base=${baseUrl})`);
}

// (No is-main guard here — the bin is cli.ts, which calls main() unconditionally. A guard
// based on argv[1]===import.meta.url silently fails under symlinked bins and would no-op npx.)
