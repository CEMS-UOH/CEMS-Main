// A thin wrapper around Groq's chat API (groq.com - not to be confused with xAI's "Grok").
// Uses Node's built-in fetch - no new dependency.
//
// Request and response shape confirmed against the official docs
// (https://console.groq.com/docs/reasoning, https://console.groq.com/docs/models) on 2026-10-24:
//
//   POST https://api.groq.com/openai/v1/chat/completions      (OpenAI-compatible)
//   Headers: Content-Type: application/json, Authorization: Bearer <key>
//   Body:    { model, messages: [{ role: "system"|"user"|"assistant", content }], ... }
//   Reply:   choices[0].message.content
//
// The default model, openai/gpt-oss-120b, is a reasoning model. For it:
//   - `include_reasoning: false` keeps the model's private reasoning out of the response (by
//     default Groq returns it in message.reasoning; we never need it).
//   - `reasoning_effort: "low"` - answering from a short list of events needs little thought,
//     and low effort keeps replies fast. ("reasoning_format" is NOT supported for gpt-oss.)
//
// A real request timeout: a slow model call must not hang an Express request (and the person
// waiting on it). We cut it off and report a clean failure instead.
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_REPLY_TOKENS = 800;

class AssistantError extends Error {}

/** gpt-oss models accept (and need) the reasoning controls; other models may reject them. */
const isGptOss = (model) => /gpt-oss/i.test(model);

/**
 * @param {object} args
 * @param {string} args.apiKey
 * @param {string} args.model
 * @param {{role: 'system'|'user'|'assistant', content: string}[]} args.messages
 * @returns {Promise<string>} the assistant's reply text
 * @throws {AssistantError} on a missing key, network failure, timeout, non-2xx response, or a
 *   response with no usable text - the caller turns this into a clean fail(), never a crash.
 */
async function askAssistant({ apiKey, model, messages }) {
  if (!apiKey) throw new AssistantError('GROQ_API_KEY is not configured');
  if (!model) throw new AssistantError('GROQ_MODEL is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: MAX_REPLY_TOKENS,
        ...(isGptOss(model) ? { include_reasoning: false, reasoning_effort: 'low' } : {}),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    // Network failure, DNS, or the abort signal firing (timeout) all land here.
    throw new AssistantError(`Could not reach Groq: ${e.name === 'AbortError' ? 'timed out' : e.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // Never include the response body - it could echo back request content. The status is
    // enough to log (401 = bad key, 404 = unknown model, 429 = rate limit).
    throw new AssistantError(`Groq responded with HTTP ${res.status}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new AssistantError('Groq returned a non-JSON response');
  }

  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || text.trim() === '') {
    throw new AssistantError(
      `Groq returned no usable text (finish_reason: ${body?.choices?.[0]?.finish_reason ?? 'unknown'})`
    );
  }

  return text.trim();
}

module.exports = { askAssistant, AssistantError };
