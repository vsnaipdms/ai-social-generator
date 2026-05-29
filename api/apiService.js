const PROVIDERS = [
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
    id: 'gemini',
    name: 'Gemini',
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
    fallbackModel: 'gemini-2.0-flash',
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
  },
  {
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
  }
];

const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 5000, 15000];

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function friendlyError(msg, code) {
  const text = (msg || '').toLowerCase();
  if (text.includes('quota') || text.includes('rate limit') || text.includes('too many') || text.includes('429') || text.includes('resource exhausted')) {
    return { error: 'AI service busy. Please wait a few seconds and try again.', detail: 'Too many requests. Retrying automatically...', code: 'quota_exceeded' };
  }
  if (text.includes('network') || text.includes('timeout') || text.includes('unavail') || text.includes('503') || text.includes('502') || text.includes('504')) {
    return { error: 'AI service temporarily unavailable.', detail: 'Please try again in a moment.', code: 'service_unavailable' };
  }
  if (text.includes('model') && (text.includes('not found') || text.includes('unavailable') || text.includes('not support'))) {
    return { error: 'Model configuration error.', detail: msg, code: 'model_error' };
  }
  return { error: 'AI service busy. Please wait a few seconds and try again.', detail: msg || '', code: code || 'unknown' };
}

async function callProvider(provider, apiKey, prompt, signal) {
  const models = provider.fallbackModel ? [provider.defaultModel, provider.fallbackModel] : [provider.defaultModel];

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const delay = RETRY_DELAYS[attempt - 1] || 0;
        if (delay > 0) await sleep(delay);

        const req = provider.formatRequest(apiKey, prompt, model);
        console.log(`[${provider.name}] Attempt ${attempt}/${MAX_RETRIES}, model: ${model}`);

        const start = Date.now();
        const response = await fetch(req.url, { ...req.options, signal });
        const elapsed = Date.now() - start;
        console.log(`[${provider.name}] Response: ${response.status}, ${elapsed}ms`);

        if (response.ok) {
          const json = await response.json();
          const text = provider.parseResponse(json);
          if (text && text.trim()) {
            console.log(`[${provider.name}] Success (${elapsed}ms)`);
            return { text: text.trim(), provider: provider.id, providerName: provider.name, model, elapsed };
          }
          console.log(`[${provider.name}] Empty response, retrying...`);
          continue;
        }

        let errMsg;
        try {
          const errJson = await response.json();
          errMsg = errJson.error?.message || errJson.error || JSON.stringify(errJson);
        } catch {
          errMsg = response.statusText;
        }

        if (isRetryableError(errMsg, response.status)) {
          console.log(`[${provider.name}] Retryable (${errMsg.slice(0, 80)}), retry ${attempt}`);
          continue;
        }

        console.log(`[${provider.name}] Non-retryable error: ${errMsg.slice(0, 100)}`);
        return { error: errMsg, code: 'non_retryable' };

      } catch (err) {
        if (err.name === 'AbortError') {
          return { error: 'Request timed out', code: 'timeout' };
        }
        if (isRetryableError(err.message)) {
          console.log(`[${provider.name}] Network retryable (${err.message.slice(0, 60)}), retry ${attempt}`);
          continue;
        }
        return { error: err.message, code: 'network_error' };
      }
    }
  }

  return { error: `All models exhausted for ${provider.name}`, code: 'models_exhausted' };
}

async function generate(prompt, options = {}) {
  const { signal } = options;
  const lastError = { msg: '', code: '' };

  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.envKey];
    if (!apiKey) {
      console.log(`[${provider.name}] No API key set, skipping`);
      continue;
    }

    console.log(`[PROVIDER] Trying ${provider.name}...`);
    const result = await callProvider(provider, apiKey, prompt, signal);

    if (result.text) {
      return {
        success: true,
        content: result.text,
        provider: result.provider,
        providerName: result.providerName,
        model: result.model,
        elapsed: result.elapsed
      };
    }

    lastError.msg = result.error || lastError.msg;
    lastError.code = result.code || lastError.code;
    console.log(`[PROVIDER] ${provider.name} failed: ${result.error?.slice(0, 80)}, switching to next`);
  }

  const friendly = friendlyError(lastError.msg, lastError.code);
  return {
    success: false,
    error: friendly.error,
    detail: friendly.detail,
    code: friendly.code
  };
}

module.exports = { generate, PROVIDERS };
