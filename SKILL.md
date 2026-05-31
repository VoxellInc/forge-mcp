---
name: forge-embeddings
description: Turn text into embedding vectors with Forge (Voxell's hosted embedding API) for semantic search, RAG retrieval, clustering, dedup, or similarity. Use when the user wants to embed text/documents/queries, build or query a vector index, find similar or duplicate text, or pick an embedding model and dimension. Provides the `embed` and `list_models` MCP tools.
---

# Forge embeddings

Forge is Voxell's hosted text-embedding API. This skill covers using it through the
`@voxell/forge-mcp` server, which exposes two tools: **`embed`** (text → vectors) and
**`list_models`**. Forge does embeddings only — it does not store text, search, or do RAG for
you; you keep and query the vectors yourself.

## Setup

The server runs over `npx` and needs one env var, `FORGE_API_KEY` (free key, 10M tokens, no card,
at https://dash.voxell.ai). Standard MCP config:

```json
{ "mcpServers": { "forge": { "command": "npx", "args": ["-y", "@voxell/forge-mcp"],
  "env": { "FORGE_API_KEY": "your-key-here" } } } }
```

## Choosing a model

Call `list_models` if unsure. Three tiers trade quality for size/cost:

| model | dim | when to use |
|-------|-----|-------------|
| `turbo` | 1024 | default — fast, cheap, good for most search/RAG |
| `pro` | 2560 | higher quality when turbo isn't separating results well |
| `ultra` | 4096 | top quality — Qwen3-Embedding-8B (~75+ avg task score on MTEB, currently #4 on MTEB English; the models ranked above it are research-only, so it's the top *usable* one) |

Start with `turbo`; move up only if retrieval quality is the bottleneck. Higher dims cost more to
store and compare.

## Using `embed`

Arguments: `input` (string or string[]), `model` (default `turbo`), `dim` (optional, Matryoshka
truncation), `input_type` (`"query"` or `"document"`, default `document`).

Rules that matter for quality:

- **Match `input_type` to the role.** Embed stored content with `input_type: "document"` and the
  user's search text with `input_type: "query"`. Mismatching them degrades retrieval.
- **Compare with cosine similarity.** Vectors are L2-normalized; rank by dot product / cosine.
- **Same model + same dim on both sides.** Never compare vectors from different models or dims.
- **Matryoshka (`dim`).** Set `dim` below the model default (e.g. `256`) for smaller, cheaper
  vectors that stay re-normalized — trade a little accuracy for ~4× less storage. Use the *same*
  `dim` for documents and queries.
- **Batch.** Pass an array of texts in one call rather than one call per text.

## Typical flows

- **Semantic search / RAG retrieval:** `embed` each document chunk with `input_type:"document"`,
  store the vectors; at query time `embed` the query with `input_type:"query"` and rank stored
  vectors by cosine similarity. Forge returns the vectors — storage and the nearest-neighbor
  search are yours (a vector DB, numpy, etc.).
- **Similar / duplicate detection:** `embed` two (or many) texts, compare cosine similarity; high
  similarity ⇒ near-duplicate.
- **Cluster / classify:** `embed` a batch, then cluster (k-means) or train a classifier on the
  vectors.

## Don't

- Don't claim Forge stores data, searches, or does RAG — it returns vectors only.
- Don't call `ultra` "the best/top-ranked" embedding model — say "~75+ avg task score, #4 on MTEB
  English, top *usable* model." Don't link a leaderboard.
- Don't apply the MTEB number to `turbo`/`pro` — it's the `ultra`/8B model.
