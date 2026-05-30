// Pure-logic unit tests — no network. Exercise the request/response helpers directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTexts, buildEmbedBody, parseEmbedResponse } from "../src/forge.js";

test("normalizeTexts: string → single-element array", () => {
  assert.deepEqual(normalizeTexts("hello"), ["hello"]);
});

test("normalizeTexts: array passes through", () => {
  assert.deepEqual(normalizeTexts(["a", "b"]), ["a", "b"]);
});

test("normalizeTexts: empty string throws", () => {
  assert.throws(() => normalizeTexts(""));
});

test("normalizeTexts: empty array throws", () => {
  assert.throws(() => normalizeTexts([]));
});

test("normalizeTexts: non-string throws", () => {
  assert.throws(() => normalizeTexts(123 as unknown));
});

test("normalizeTexts: array containing a non-string throws", () => {
  assert.throws(() => normalizeTexts(["ok", 5 as unknown as string]));
});

test("buildEmbedBody: defaults model=turbo, input_type=document, no dim", () => {
  const b = buildEmbedBody({ input: "x" });
  assert.equal(b.model, "turbo");
  assert.equal(b.input_type, "document");
  assert.deepEqual(b.texts, ["x"]);
  assert.equal(b.dim, undefined);
});

test("buildEmbedBody: passes model, dim, input_type", () => {
  const b = buildEmbedBody({ input: ["q"], model: "pro", dim: 512, input_type: "query" });
  assert.equal(b.model, "pro");
  assert.equal(b.dim, 512);
  assert.equal(b.input_type, "query");
});

test("buildEmbedBody: dim<=0 is dropped (uses model default)", () => {
  assert.equal(buildEmbedBody({ input: "x", dim: 0 }).dim, undefined);
});

test("buildEmbedBody: accepts `texts` as well as `input`", () => {
  assert.deepEqual(buildEmbedBody({ texts: ["a", "b"] }).texts, ["a", "b"]);
});

test("parseEmbedResponse: valid response", () => {
  const r = parseEmbedResponse({
    embeddings: [[0.1, 0.2]],
    tokens: 5,
    model: "turbo",
    dim: 2,
    latency_ms: 10,
  });
  assert.equal(r.embeddings.length, 1);
  assert.equal(r.dim, 2);
  assert.equal(r.tokens, 5);
  assert.equal(r.model, "turbo");
});

test("parseEmbedResponse: missing embeddings throws", () => {
  assert.throws(() => parseEmbedResponse({ tokens: 1 }));
});

test("parseEmbedResponse: empty embeddings throws", () => {
  assert.throws(() => parseEmbedResponse({ embeddings: [] }));
});

test("parseEmbedResponse: infers dim from vector length when absent", () => {
  assert.equal(parseEmbedResponse({ embeddings: [[1, 2, 3]] }).dim, 3);
});
