# @voxell/forge-mcp

An MCP server for **Forge** — Voxell's hosted text-embedding API. It exposes Forge to any
MCP client (Claude, Cursor, Cline, Windsurf, VS Code, …) as two tools:

- **`embed`** — turn text into vectors
- **`list_models`** — list available models and their dimensions

You bring a Forge API key. The server is stateless, and **Voxell does not store the text you
send or the vectors it returns** — only usage metadata (token counts) is recorded, for billing.
It does embeddings only — no storage, no search, no RAG. Those are different products.

## What you can do with it

- **Add semantic search** — embed your documents with `input_type: "document"` and each query
  with `input_type: "query"`, then rank by cosine similarity.
- **Build RAG** — embed a knowledge base, store the vectors, and retrieve the closest chunks to
  ground an LLM.
- **Find similar or duplicate text** — embed two texts and compare their vectors.
- **Cluster or classify** — embed a batch, then cluster or train a classifier on the vectors.
- **Shrink vector storage** — set `dim` to truncate (Matryoshka) and trade a little accuracy
  for smaller, cheaper vectors.
- **Straight from your editor** — ask your AI agent (Cursor, Claude, …) to embed a snippet, a
  batch, or a file via the `embed` tool — no separate script.

## Requirements

- Node.js ≥ 18 (tested on 20)
- A Forge API key — create one at https://dash.voxell.ai. New accounts start with 10M free
  tokens, no credit card.

## Use it

Most MCP clients run it on demand with `npx`. Add this to your client's MCP config:

```json
{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["-y", "@voxell/forge-mcp"],
      "env": { "FORGE_API_KEY": "your-key-here" }
    }
  }
}
```

(Cursor, Claude Desktop, Cline, Windsurf, and VS Code all use this `mcpServers` shape.)

## Tools

### `embed`

| arg | type | default | notes |
|-----|------|---------|-------|
| `input` | string or string[] | — | text(s) to embed (required) |
| `model` | string | `turbo` | `turbo` (1024-d), `pro` (2560-d), `ultra` (4096-d) |
| `dim` | number | model default | truncate to N dimensions (Matryoshka) — works on every model |
| `input_type` | `"query"` \| `"document"` | `document` | use `query` for search queries |

Returns the vectors plus the model, dimension, and token count.

Default is `turbo` — the one you probably want. `pro`/`ultra` trade size and speed for more
dimensions.

### `list_models`

Lists the available models and their dimensions.

## Configuration

| env | required | default |
|-----|----------|---------|
| `FORGE_API_KEY` | yes | — |
| `FORGE_BASE_URL` | no | `https://api.voxell.ai` |

## License

MIT © Voxell, Inc.
