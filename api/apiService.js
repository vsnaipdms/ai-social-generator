const PROVIDER_TIMEOUT = 15000;
const GLOBAL_TIMEOUT = 20000;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [0, 2000];

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Gemini',
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
    formatRequest(apiKey, prompt, model) {
      const m = model || this.defaultModel;
      return {
        url: `${this.baseUrl}/${m}:generateContent?key=${apiKey}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
        }
      };
    },
    parseResponse(json) {
      return json.candidates?.[0]?.content?.parts?.[0]?.text;
    }
  },
  {
    id: 'groq',
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama3-70b-8192',
    formatRequest(apiKey, prompt, model) {
      return {
        url: this.baseUrl,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model || this.defaultModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, max_tokens: 4096
          })
        }
      };
    },
    parseResponse(json) {
      return json.choices?.[0]?.message?.content;
    }
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    formatRequest(apiKey, prompt, model) {
      return {
        url: this.baseUrl,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model || this.defaultModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, max_tokens: 4096
          })
        }
      };
    },
    parseResponse(json) {
      return json.choices?.[0]?.message?.content;
    }
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    envKey: 'HF_TOKEN',
    baseUrl: 'https://api-inference.huggingface.co/models',
    defaultModel: 'mistralai/Mistral-7B-Instruct-v0.3',
    formatRequest(apiKey, prompt, model) {
      return {
        url: `${this.baseUrl}/${model || this.defaultModel}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { temperature: 0.7, max_new_tokens: 4096, return_full_text: false }
          })
        }
      };
    },
    parseResponse(json) {
      if (Array.isArray(json)) return json[0]?.generated_text;
      if (json.generated_text) return json.generated_text;
      return null;
    }
  }
];

const TOGETHER_PROVIDER = {
  id: 'togetherai',
  name: 'Together AI',
  envKey: 'TOGETHER_API_KEY',
  baseUrl: 'https://api.together.xyz/v1/chat/completions',
  defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  formatRequest(apiKey, prompt, model) {
    return {
      url: this.baseUrl,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || this.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7, max_tokens: 4096
        })
      }
    };
  },
  parseResponse(json) {
    return json.choices?.[0]?.message?.content;
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(msg, status) {
  const text = (msg || '').toLowerCase();
  const patterns = [
    'quota exceeded', 'rate limit', 'too many requests', '429', '503',
    'temporary unavail', 'api unavail', 'network timeout', 'service unavail',
    'resource exhausted', 'request rate limit', 'model overloaded',
    'internal server error', 'bad gateway', 'service unavailable',
    '504', '502', 'no available', 'capacity'
  ];
  return patterns.some(p => text.includes(p)) || [429, 502, 503, 504].includes(status);
}

async function callProvider(provider, apiKey, prompt, signal, emit) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const delay = RETRY_DELAYS[attempt - 1] || 0;
    if (delay > 0) await sleep(delay);

    const model = provider.defaultModel;
    const req = provider.formatRequest(apiKey, prompt, model);

    if (emit) emit({ status: 'trying', provider: provider.name, attempt });

    const controller = new AbortController();
    const providerTimeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(providerTimeout);
        controller.abort(signal.reason);
      }, { once: true });
    }

    try {
      const start = Date.now();
      const response = await fetch(req.url, { ...req.options, signal: controller.signal });
      const elapsed = Date.now() - start;

      console.log("Provider:", provider.name);
      console.log("Response:", response.status, response.statusText);

      if (!response.ok) {
        let errMsg;
        try {
          const errJson = await response.json();
          errMsg = errJson.error?.message || errJson.error || JSON.stringify(errJson);
        } catch {
          errMsg = response.statusText;
        }
        console.log(`[${provider.name}] Error: ${errMsg.slice(0, 100)}`);

        if (!isRetryableError(errMsg, response.status)) {
          return { error: errMsg, code: 'non_retryable' };
        }
        continue;
      }

      const json = await response.json();
      const text = provider.parseResponse(json);

      if (!text || !text.trim()) {
        console.log(`[${provider.name}] Empty/invalid response content`);
        continue;
      }

      console.log(`[${provider.name}] Success (${elapsed}ms): ${text.slice(0, 60)}...`);
      return { text: text.trim(), provider: provider.id, providerName: provider.name, model, elapsed };

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log(`[${provider.name}] Timeout (${PROVIDER_TIMEOUT}ms)`);
        return { error: 'Provider timeout', code: 'timeout' };
      }
      console.log(`[${provider.name}] Network error: ${err.message.slice(0, 60)}`);
      if (isRetryableError(err.message)) continue;
      return { error: err.message, code: 'network_error' };
    } finally {
      clearTimeout(providerTimeout);
    }
  }

  return { error: `Exhausted retries for ${provider.name}`, code: 'exhausted' };
}

async function generate(prompt, options = {}) {
  const { signal, onStatus, forceProvider } = options;
  const startTime = Date.now();
  const lastError = { msg: '', code: '' };
  let lastProviderId = '';
  let lastProviderName = '';

  const activeProviders = [...PROVIDERS];
  if (process.env.ENABLE_TOGETHER_AI === 'true' && process.env.TOGETHER_API_KEY) {
    activeProviders.push(TOGETHER_PROVIDER);
  }

  const providersToTry = forceProvider
    ? activeProviders.filter(p => p.id === forceProvider)
    : activeProviders;

  if (forceProvider && providersToTry.length === 0) {
    return {
      success: false,
      error: 'Unknown provider: ' + forceProvider,
      provider: forceProvider,
      providerName: forceProvider
    };
  }

  for (let i = 0; i < providersToTry.length; i++) {
    const provider = providersToTry[i];

    if (!forceProvider && Date.now() - startTime > GLOBAL_TIMEOUT) {
      console.log(`[GLOBAL] 20s timeout reached`);
      lastError.msg = 'Global timeout exceeded';
      lastError.code = 'global_timeout';
      lastProviderName = provider.name;
      lastProviderId = provider.id;
      break;
    }

    const apiKey = process.env[provider.envKey];
    if (!apiKey) {
      console.log(`[${provider.name}] No API key, skipping`);
      continue;
    }

    if (onStatus) onStatus({ status: 'trying', provider: provider.name });

    let result;
    try {
      result = await callProvider(provider, apiKey, prompt, signal, onStatus);
    } catch (err) {
      console.error(provider.name, err.message);
      result = { error: err.message, code: 'exception' };
    }

    if (result.text) {
      const totalElapsed = Date.now() - startTime;
      console.log(`[DONE] ${provider.name} responded in ${result.elapsed}ms (total: ${totalElapsed}ms)`);
      if (onStatus) onStatus({ status: 'done', provider: provider.name, elapsed: result.elapsed });
      return {
        success: true,
        content: result.text,
        provider: result.provider,
        providerName: result.providerName,
        model: result.model,
        elapsed: result.elapsed,
        totalElapsed
      };
    }

    lastError.msg = result.error || lastError.msg;
    lastError.code = result.code || lastError.code;
    lastProviderId = provider.id;
    lastProviderName = provider.name;

    if (forceProvider) {
      return {
        success: false,
        error: result.error || 'Provider failed',
        detail: result.error || '',
        code: result.code || 'provider_failed',
        provider: provider.id,
        providerName: provider.name
      };
    }

    if (i < providersToTry.length - 1) {
      const next = providersToTry[i + 1];
      const reason = result.code === 'timeout' ? 'Timeout (' + PROVIDER_TIMEOUT + 'ms)' : result.code === 'non_retryable' ? 'Provider error' : result.code || 'Failed';
      console.log(`[FALLBACK] ${provider.name} -> ${next.name} (${reason})`);
      if (onStatus) onStatus({ status: 'switching', from: provider.name, to: next.name, reason });
    }
  }

  console.log(`[FAIL] All providers failed after ${Date.now() - startTime}ms`);
  return {
    success: false,
    error: 'All AI providers temporarily unavailable. Please retry.',
    detail: lastError.msg,
    code: lastError.code || 'all_providers_failed',
    provider: lastProviderId || null,
    providerName: lastProviderName || null
  };
}

module.exports = { generate, PROVIDERS };
