const PROVIDER_TIMEOUT = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [0, 2000];

const PROVIDERS = [
  {
    id: 'groq', name: 'Groq', envKey: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    formatRequest(apiKey, prompt, model) {
      return {
        url: this.baseUrl,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: model || this.defaultModel, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096 })
        }
      };
    },
    parseResponse(json) { return json.choices?.[0]?.message?.content; }
  },
  {
    id: 'openrouter', name: 'OpenRouter', envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'mistralai/mistral-7b-instruct:free',
    formatRequest(apiKey, prompt, model) {
      return {
        url: this.baseUrl,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: model || this.defaultModel, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096 })
        }
      };
    },
    parseResponse(json) { return json.choices?.[0]?.message?.content; }
  },
  {
    id: 'gemini', name: 'Gemini', envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.0-flash',
    formatRequest(apiKey, prompt, model) {
      const m = model || this.defaultModel;
      return { url: `${this.baseUrl}/${m}:generateContent?key=${apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }) } };
    },
    parseResponse(json) { return json.candidates?.[0]?.content?.parts?.[0]?.text; }
  }
];

const HUGGINGFACE_PROVIDER = {
  id: 'huggingface', name: 'Hugging Face', envKey: 'HF_TOKEN',
  baseUrl: 'https://api-inference.huggingface.co/models',
  defaultModel: 'google/flan-t5-large',
  formatRequest(apiKey, prompt, model) {
    return {
      url: `${this.baseUrl}/${model || this.defaultModel}`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } })
      }
    };
  },
  parseResponse(json) {
    if (Array.isArray(json)) return json[0]?.generated_text;
    if (json.generated_text) return json.generated_text;
    return null;
  }
};

const TOGETHER_PROVIDER = {
  id: 'togetherai', name: 'Together AI', envKey: 'TOGETHER_API_KEY',
  baseUrl: 'https://api.together.xyz/v1/chat/completions',
  defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  formatRequest(apiKey, prompt, model) {
    return {
      url: this.baseUrl,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model || this.defaultModel, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096 })
      }
    };
  },
  parseResponse(json) { return json.choices?.[0]?.message?.content; }
};

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function callProvider(provider, apiKey, prompt, signal, emit) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const delay = RETRY_DELAYS[attempt - 1] || 0;
    if (delay > 0) await sleep(delay);

    const model = provider.defaultModel;
    const req = provider.formatRequest(apiKey, prompt, model);
    if (emit) emit({ status: 'trying', attempt });

    const controller = new AbortController();
    const providerTimeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);
    if (signal) {
      signal.addEventListener('abort', () => { clearTimeout(providerTimeout); controller.abort(signal.reason); }, { once: true });
    }

    try {
      const start = Date.now();
      const response = await fetch(req.url, { ...req.options, signal: controller.signal });
      const elapsed = Date.now() - start;

      console.log("Provider:", provider.name);
      console.log("Response:", response.status, response.statusText);

      if (provider.id === 'huggingface') {
        console.log("HF_TOKEN exists:", !!process.env.HF_TOKEN);
        console.log("HF model:", model);
        const raw = await response.text();
        console.log("HF response:", raw.slice(0, 600));
        if (!response.ok) throw new Error("HF " + response.status);
        let json;
        try { json = JSON.parse(raw); } catch { throw new Error("Invalid HF response"); }
        let content;
        if (Array.isArray(json)) content = json[0]?.generated_text;
        else if (json.generated_text) content = json.generated_text;
        if (!content || !content.trim()) throw new Error("Empty HF response");
        console.log("[HF] Success (" + elapsed + "ms)");
        return { content: content.trim(), provider: provider.id, providerName: provider.name, model, elapsed };
      }

      if (!response.ok) {
        let errMsg;
        try { const j = await response.json(); errMsg = j.error?.message || j.error || JSON.stringify(j); } catch { errMsg = response.statusText; }
        console.log("[" + provider.name + "] Error:", errMsg.slice(0, 100));
        if (isRetryableError(errMsg, response.status)) continue;
        throw new Error(errMsg);
      }

      const json = await response.json();
      const text = provider.parseResponse(json);
      if (!text || !text.trim()) {
        console.log("[" + provider.name + "] Empty response");
        continue;
      }
      console.log("[" + provider.name + "] Success (" + elapsed + "ms):", text.slice(0, 60) + "...");
      return { content: text.trim(), provider: provider.id, providerName: provider.name, model, elapsed };

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("[" + provider.name + "] Timeout (" + PROVIDER_TIMEOUT + "ms)");
        throw new Error("Timeout");
      }
      console.log("[" + provider.name + "] Attempt " + attempt + " failed:", err.message.slice(0, 80));
      if (attempt < MAX_RETRIES && isRetryableError(err.message, 0)) continue;
      throw err;
    } finally {
      clearTimeout(providerTimeout);
    }
  }
  throw new Error("Exhausted retries");
}

function isRetryableError(msg, status) {
  const text = (msg || '').toLowerCase();
  const patterns = ['quota exceeded', 'rate limit', 'too many requests', '429', '503', 'temporary unavail', 'api unavail', 'network timeout', 'service unavail', 'resource exhausted', 'request rate limit', 'model overloaded', 'internal server error', 'bad gateway', 'service unavailable', '504', '502', 'no available', 'capacity'];
  return patterns.some(p => text.includes(p)) || [429, 502, 503, 504].includes(status);
}

async function generate(prompt, options = {}) {
  const { signal, onStatus, forceProvider } = options;

  const activeProviders = [...PROVIDERS];
  if (process.env.ENABLE_TOGETHER_AI === 'true' && process.env.TOGETHER_API_KEY) activeProviders.push(TOGETHER_PROVIDER);
  if (process.env.ENABLE_HUGGINGFACE === 'true' && process.env.HF_TOKEN) activeProviders.push(HUGGINGFACE_PROVIDER);

  const providersToTry = forceProvider ? activeProviders.filter(p => p.id === forceProvider) : activeProviders;
  if (forceProvider && providersToTry.length === 0) {
    return { success: false, error: 'Unknown provider: ' + forceProvider, provider: forceProvider, providerName: forceProvider };
  }

  for (let i = 0; i < providersToTry.length; i++) {
    const provider = providersToTry[i];
    const apiKey = process.env[provider.envKey];
    if (!apiKey) {
      console.log("[" + provider.name + "] No API key, skipping");
      continue;
    }

    console.log("Trying:", provider.name);
    if (onStatus) onStatus({ status: 'trying' });

    let lastErrMsg = '';
    try {
      const result = await callProvider(provider, apiKey, prompt, signal, onStatus);
      if (result && result.content && result.content.trim()) {
        console.log("[DONE] " + provider.name + " responded in " + result.elapsed + "ms");
        if (onStatus) onStatus({ status: 'done', elapsed: result.elapsed });
        return { success: true, provider: result.provider, providerName: result.providerName, content: result.content, model: result.model, elapsed: result.elapsed };
      }
    } catch (err) {
      lastErrMsg = err.message;
      console.error("Provider failed:", provider.name, lastErrMsg);
      console.log("Moving to next provider");
    }

    if (!forceProvider && i < providersToTry.length - 1) {
      const next = providersToTry[i + 1];
      if (onStatus) onStatus({ status: 'switching' });
    }
  }

  return { success: false, error: 'All providers failed' };
}

module.exports = { generate, PROVIDERS };
