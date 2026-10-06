// A thin wrapper around xAI's Grok HTTP API. Uses Node's built-in fetch - no new dependency,
// as instructed.
//
// Endpoint, headers, request/response shape confirmed against the official docs
// (https://docs.x.ai/docs/api-reference, https://docs.x.ai/docs/guides/chat) on 2026-10-07:
//
//   POST https://api.x.ai/v1/responses
//   Headers: Content-Type: application/json, Authorization: Bearer <key>
//   Body:    { model, input: [{ role: "system"|"user"|"assistant", content }], store: false }
//   Reply:   output[0].content[0].text   (output[0] is {type:"message", role:"assistant", content:[...]})
//
// Two deliberate deviations from the example in the docs, both noted in the PR description:
//   - `store: false` - we already persist the conversation ourselves in ChatSession; there is
//     no reason to also keep a copy on xAI's servers (the docs say stateful storage defaults
//     to ON, 30 days).
//   - A real request timeout. The docs' own curl example passes `-m 3600` (one hour!), which
//     cannot be acceptable for a synchronous HTTP endpoint - a slow model call would hang an
//     Express request (and the attendee waiting on it) for up to an hour. We cut it off well
//     before that instead and report a clean failure.
const ENDPOINT = 'https://api.x.ai/v1/responses';
const REQUEST_TIMEOUT_MS = 25_000;

class GrokError extends Error {}

/**
 * @param {object} args
 * @param {string} args.apiKey
 * @param {string} args.model
 * @param {{role: 'system'|'user'|'assistant', content: string}[]} args.input
 * @returns {Promise<string>} the assistant's reply text
 * @throws {GrokError} on a missing key, network failure, timeout, non-2xx response, or a
 *   response with no usable text - the caller turns this into a clean fail(), never a crash.
 */
async function askGrok({ apiKey, model, input }) {
  if (!apiKey) throw new GrokError('GROK_API_KEY is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input, store: false }),
      signal: controller.signal,
    });
  } catch (e) {
    // Network failure, DNS, or the abort signal firing (timeout) all land here.
    throw new GrokError(`Could not reach Grok: ${e.name === 'AbortError' ? 'timed out' : e.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // Never include the response body - it could echo back request content, and xAI's error
    // shape for 4xx/5xx is not documented, so treat it as opaque. The status is enough to log.
    throw new GrokError(`Grok responded with HTTP ${res.status}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new GrokError('Grok returned a non-JSON response');
  }

  const text = body?.output?.[0]?.content?.find((c) => c.type === 'output_text')?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    throw new GrokError(`Grok returned no usable text (status: ${body?.status ?? 'unknown'})`);
  }

  return text;
}

module.exports = { askGrok, GrokError };
