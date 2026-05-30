// Forge embedding API client — the thin core the MCP server wraps.
// Talks to the public GA endpoint: POST {baseUrl}/v1/embed with a Bearer API key.
// Pure helpers (normalizeTexts/buildEmbedBody/parseEmbedResponse) are exported so they
// can be unit-tested without any network.

export interface ForgeModel {
  id: string;
  dim: number;
  default: boolean;
}

// GA tiers. turbo is the recommended default (fast, 1024d, high quality).
export const FORGE_MODELS: ForgeModel[] = [
  { id: "turbo", dim: 1024, default: true },
  { id: "pro", dim: 2560, default: false },
  { id: "ultra", dim: 4096, default: false },
];

export interface EmbedArgs {
  input?: string | string[];
  texts?: string | string[];
  model?: string;
  dim?: number;
  input_type?: "query" | "document";
}

export interface EmbedBody {
  texts: string[];
  model: string;
  input_type: string;
  dim?: number;
}

export interface EmbedResponse {
  embeddings: number[][];
  tokens: number;
  model: string;
  dim: number;
  latency_ms: number;
}

export class ForgeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ForgeError";
    this.status = status;
  }
}

/** Accept a string or string[] (from `input` or `texts`); reject empties / non-strings. */
export function normalizeTexts(input: unknown): string[] {
  if (typeof input === "string") {
    if (input.length === 0) throw new Error("input text must not be empty");
    return [input];
  }
  if (Array.isArray(input)) {
    if (input.length === 0) throw new Error("input array must not be empty");
    for (const t of input) {
      if (typeof t !== "string" || t.length === 0) {
        throw new Error("every input item must be a non-empty string");
      }
    }
    return input as string[];
  }
  throw new Error("input must be a string or array of strings");
}

/** Build the /v1/embed request body. Defaults: model=turbo, input_type=document. */
export function buildEmbedBody(args: EmbedArgs): EmbedBody {
  const texts = normalizeTexts(args.input ?? args.texts);
  const body: EmbedBody = {
    texts,
    model: args.model && args.model.length > 0 ? args.model : "turbo",
    input_type: args.input_type ?? "document",
  };
  if (typeof args.dim === "number" && args.dim > 0) body.dim = args.dim;
  return body;
}

/** Validate + normalize the API response. Throws if embeddings are missing/malformed. */
export function parseEmbedResponse(raw: unknown): EmbedResponse {
  if (!raw || typeof raw !== "object") throw new Error("invalid Forge response: not an object");
  const r = raw as Record<string, unknown>;
  const e = r.embeddings;
  if (!Array.isArray(e) || e.length === 0 || !Array.isArray(e[0])) {
    throw new Error("invalid Forge response: missing embeddings");
  }
  const embeddings = e as number[][];
  return {
    embeddings,
    tokens: typeof r.tokens === "number" ? r.tokens : 0,
    model: typeof r.model === "string" ? r.model : "",
    dim: typeof r.dim === "number" ? r.dim : embeddings[0].length,
    latency_ms: typeof r.latency_ms === "number" ? r.latency_ms : 0,
  };
}

export interface ForgeClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class ForgeClient {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(opts: ForgeClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.voxell.ai").replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async embed(args: EmbedArgs): Promise<EmbedResponse> {
    const body = buildEmbedBody(args);
    const res = await this.fetchImpl(`${this.baseUrl}/v1/embed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = (await res.json()) as { error?: string };
        if (j && typeof j.error === "string") msg = j.error;
      } catch {
        /* non-JSON error body */
      }
      throw new ForgeError(`Forge API error ${res.status}: ${msg}`, res.status);
    }
    return parseEmbedResponse(await res.json());
  }
}
