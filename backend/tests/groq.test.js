// Unit tests for the Groq HTTP client itself - the one place that would ever touch the real
// network. global.fetch is mocked throughout; Groq is never called from tests.
const { askAssistant, AssistantError } = require('../src/modules/chatbot/groq');

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const okResponseBody = (text = 'Hello!') => ({
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: text } }],
});

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
});

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

describe('askAssistant (Groq)', () => {
  const call = (overrides = {}) =>
    askAssistant({
      apiKey: 'test-key',
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: 'hi' }],
      ...overrides,
    });

  it('posts to the chat completions endpoint with the key, model and messages', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(okResponseBody()));

    await call();

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer test-key' });
    const body = JSON.parse(init.body);
    expect(body.model).toBe('openai/gpt-oss-120b');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.max_completion_tokens).toBe(800);
  });

  it('keeps the reasoning out of the answer and asks for low effort on gpt-oss models', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(okResponseBody()));
    await call();
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.include_reasoning).toBe(false);
    expect(body.reasoning_effort).toBe('low');
    expect(body.reasoning_format).toBeUndefined(); // not supported for gpt-oss
  });

  it('sends no reasoning controls to other models', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(okResponseBody()));
    await call({ model: 'llama-3.3-70b-versatile' });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.include_reasoning).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
  });

  it('returns choices[0].message.content, trimmed', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(okResponseBody('  42 is the answer. \n')));
    expect(await call()).toBe('42 is the answer.');
  });

  it.each([
    ['the API key', { apiKey: '' }],
    ['the model', { model: '' }],
  ])('throws without calling fetch when %s is missing', async (_label, overrides) => {
    await expect(call(overrides)).rejects.toThrow(AssistantError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws AssistantError on a network failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
    await expect(call()).rejects.toThrow(AssistantError);
  });

  it('throws AssistantError on a non-2xx response, without leaking the body', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ error: { message: 'bad key xyz' } }, false, 401));
    const error = await call().catch((e) => e);
    expect(error).toBeInstanceOf(AssistantError);
    expect(error.message).toMatch(/401/);
    expect(error.message).not.toMatch(/bad key/);
  });

  it('throws AssistantError when there is no reply text', async () => {
    global.fetch.mockResolvedValueOnce(
      jsonResponse({ choices: [{ finish_reason: 'length', message: { role: 'assistant', content: '' } }] })
    );
    await expect(call()).rejects.toThrow(/finish_reason: length/);
  });

  it('throws AssistantError when the body is not valid JSON', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.reject(new Error('bad json')) });
    await expect(call()).rejects.toThrow(AssistantError);
  });

  it('aborts and throws AssistantError when the request takes too long', async () => {
    jest.useFakeTimers();
    global.fetch.mockImplementationOnce(
      (url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        })
    );

    const promise = call();
    await Promise.resolve();
    jest.advanceTimersByTime(25_000);

    await expect(promise).rejects.toThrow(/timed out/);
    jest.useRealTimers();
  });
});
