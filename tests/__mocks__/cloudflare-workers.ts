// Test stub for the `cloudflare:workers` runtime module.
// In the Worker runtime this module exposes the real Worker env (KV, secrets…).
// In vitest (Node.js) we return an empty env so code that reads optional
// bindings degrades gracefully — KV cache is simply a no-op in tests.
export const env: Record<string, unknown> = {};
