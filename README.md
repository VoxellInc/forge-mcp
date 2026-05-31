# @voxell/forge-mcp

An MCP server for **Forge** — Voxell's hosted text-embedding API. It exposes Forge to any
MCP client (Claude, Cursor, Cline, Windsurf, VS Code, …) as two tools:

- **`embed`** — turn text into vectors
- **`list_models`** — list available models and their dimensions

You bring a Forge API key. The server is stateless, and **Voxell does not store the text you
send or the vectors it returns** — only usage metadata (token counts) is recorded, for billing.
It does embeddings only — no storage, no search, no RAG. Those are different products.

## Quick install

One-click install in your editor (then replace `your-key-here` with a real key from
[dash.voxell.ai](https://dash.voxell.ai)):

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=forge&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkB2b3hlbGwvZm9yZ2UtbWNwIl0sImVudiI6eyJGT1JHRV9BUElfS0VZIjoieW91ci1rZXktaGVyZSJ9fQ==)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](vscode:mcp/install?%7B%22name%22%3A%22forge%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40voxell%2Fforge-mcp%22%5D%2C%22env%22%3A%7B%22FORGE_API_KEY%22%3A%22your-key-here%22%7D%7D)

**Claude Code** — one command:

```bash
claude mcp add forge -e FORGE_API_KEY=your-key-here -- npx -y @voxell/forge-mcp
```

Any other client (Claude Desktop, Cline, Windsurf, Zed, …) uses the standard `mcpServers`
block — see [Use it](#use-it) below.

## Why Forge

- **Quality you can dial.** Forge runs the Qwen3-Embedding family; `ultra` is the 8B — ~75+
  average task score on MTEB, currently #4 on MTEB (English), and the top *usable* model (the
  three ranked above it are research-only). `turbo` (0.6B) is the fast/cheap default. Pick your
  quality/cost point.
- **Matryoshka (MRL).** Set `dim` to truncate (re-normalized) for ~4× smaller, cheaper vectors.
- **Low latency** (Go + CUDA engine), **zero-trust** (per-key auth; mTLS available), and **free to
  start** (10M tokens, no card — [dash.voxell.ai](https://dash.voxell.ai); more at
  [voxell.ai/forge](https://voxell.ai/forge)).

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

## Beyond MCP: OpenAI-compatible API

Forge speaks the **OpenAI embeddings API**. Point any OpenAI client at Forge — **no code change**,
and your existing vector dimensions are preserved:

```python
from openai import OpenAI

client = OpenAI(base_url="https://api.voxell.ai/v1", api_key="your-forge-key")
# the exact call you already make — now on a higher-ranked engine:
client.embeddings.create(model="text-embedding-3-large", input=["hello world"])  # -> 3072-d
```

Your OpenAI model names map to a **matching-dimension** Forge tier (`text-embedding-3-small`/
`ada-002` → 1536-d, `text-embedding-3-large` → 3072-d), so existing vector stores slot in
unchanged. Or address Forge tiers directly — `turbo` | `pro` | `ultra`. Also supports `dimensions`
(Matryoshka, re-normalized) and `encoding_format: "base64"`.

**It's an upgrade on every path.** Forge's *smallest* tier (`turbo`, Qwen3-Embedding-0.6B)
outranks OpenAI's *largest* embedding model (`text-embedding-3-large`) on MTEB — so there's no
drop-in that lands worse. `ultra` (Qwen3-Embedding-8B, ~75+ average task score, #4 on MTEB English)
is a different league.

**Why re-embedding onto Forge is worth it.** Embedding is a one-way door: whatever an encoder
discards at write time is gone — no reranker, longer prompt, or bigger LLM downstream reconstructs
what the vectors never captured. The model you embed with sets the ceiling on everything above it.
Re-embed once onto a higher-ranked engine and that ceiling rises — permanently.

## License

MIT © Voxell, Inc.
