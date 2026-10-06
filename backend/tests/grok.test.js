// Unit tests for the Grok (xAI) HTTP client itself - the one place that would ever touch the
// real network. global.fetch is mocked throughout; Grok is never called from tests.
const { askGrok, GrokError } = require('../src/modules/chatbot/grok');

const ENDPOINT = 'https://api.x.ai/v1/responses';
const okResponseBody = (text = 'Hello!') => ({
  status: 'completed',
  output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }],
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

describe('askGrok', () => {
  const call = (overrides = {}) =>
    askGrok({ apiKey: 'test-key', model: 'grok-test', input: [{ role: 'user', content: 'hi' }], ...overrides });

  it('posts to the responses endpoint with the right headers, model and store:false', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(okResponseBody()));

    await call();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-key',
    });
    const body = JSON.parse(init.body);
    expect(body.model).toBe('grok-test');
    expect(body.input).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.store).toBe(false);
  });

  it('returns the assistant text from output[0].content[0].text', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(okResponseBody('42 is the answer.')));
    const reply = await call();
    expect(reply).toBe('42 is the answer.');
  });

  it('throws GrokError without calling fetch when the API key is missing', async () => {
    await expect(call({ apiKey: '' })).rejects.toThrow(GrokError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws GrokError on a network failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
    await expect(call()).rejects.toThrow(GrokError);
  });

  it('throws GrokError on a non-2xx response, without leaking the body', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ error: 'bad key' }, false, 401));

    await expect(call()).rejects.toThrow(GrokError);

    global.fetch.mockResolvedValueOnce(jsonResponse({ error: 'bad key' }, false, 401));
    try {
      await call();
      throw new Error('expected call() to reject');
    } catch (e) {
      expect(e.message).not.toMatch(/bad key/);
      expect(e.message).toMatch(/401/);
    }
  });

  it('throws GrokError when the response has no output text', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ status: 'incomplete', output: [] }));
    await expect(call()).rejects.toThrow(GrokError);
  });

  it('throws GrokError when the response body is not valid JSON', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.reject(new Error('bad json')) });
    await expect(call()).rejects.toThrow(GrokError);
  });

  it('aborts and throws GrokError when the request takes too long', async () => {
    // Fake timers so this test does not actually wait out the real 25s timeout.
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
    await Promise.resolve(); // let askGrok start the fetch and register the abort listener
    jest.advanceTimersByTime(25_000);

    await expect(promise).rejects.toThrow(GrokError);
    jest.useRealTimers();
  });
});
