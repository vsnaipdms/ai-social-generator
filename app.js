function trackEvent(name, params) {
  try { if (typeof gtag === 'function') gtag('event', name, params || {}); } catch (e) {}
}

const dom = {
  businessType: document.getElementById('businessType'),
  platform: document.getElementById('platform'),
  contentType: document.getElementById('contentType'),
  audience: document.getElementById('audience'),
  language: document.getElementById('language'),
  englishLevel: document.getElementById('englishLevel'),
  writingStyle: document.getElementById('writingStyle'),
  tone: document.getElementById('tone'),
  length: document.getElementById('length'),
  goal: document.getElementById('goal'),
  variations: document.getElementById('variations'),
  includeSeo: document.getElementById('includeSeo'),
  addEmojis: document.getElementById('addEmojis'),
  includeCta: document.getElementById('includeCta'),
  genHashtags: document.getElementById('genHashtags'),
  humanizeContent: document.getElementById('humanizeContent'),
  avoidAi: document.getElementById('avoidAi'),
  generateBtn: document.getElementById('generateBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  presetSelect: document.getElementById('presetSelect'),
  resultBadge: document.getElementById('resultBadge'),
  resultMeta: document.getElementById('resultMeta'),
  emptyState: document.getElementById('emptyState'),
  loadingState: document.getElementById('loadingState'),
  loadingText: document.getElementById('loadingText'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  errorDetail: document.getElementById('errorDetail'),
  outputArea: document.getElementById('outputArea'),
  hookContent: document.getElementById('hookContent'),
  mainContent: document.getElementById('mainContent'),
  ctaContent: document.getElementById('ctaContent'),
  hashtagContent: document.getElementById('hashtagContent'),
  seoContent: document.getElementById('seoContent'),
  variationsContent: document.getElementById('variationsContent'),
  charCount: document.getElementById('charCount'),
  wordCount: document.getElementById('wordCount'),
  copyBtn: document.getElementById('copyBtn'),
  downloadTxtBtn: document.getElementById('downloadTxtBtn'),
  downloadDocBtn: document.getElementById('downloadDocBtn'),
  cardHook: document.getElementById('cardHook'),
  cardCta: document.getElementById('cardCta'),
  cardHashtags: document.getElementById('cardHashtags'),
  cardSeo: document.getElementById('cardSeo'),
  cardVariations: document.getElementById('cardVariations'),
  recentHistory: document.getElementById('recentHistory'),
  savedTemplates: document.getElementById('savedTemplates')
};

const PRESETS = {
  artist: {
    businessType: 'Artist / Creative Professional', platform: 'Instagram', contentType: 'Social Media Post',
    audience: 'Artists', tone: 'Emotional', writingStyle: 'Storytelling', goal: 'Brand Awareness',
    length: 'Medium', englishLevel: 'Simple English'
  },
  realestate: {
    businessType: 'Real Estate Agency', platform: 'Facebook', contentType: 'Ad Copy',
    audience: 'Real Estate Buyers', tone: 'Professional', writingStyle: 'Persuasive', goal: 'Leads',
    length: 'Medium', englishLevel: 'Professional English'
  },
  smallbiz: {
    businessType: 'Local Small Business', platform: 'Instagram', contentType: 'Social Media Post',
    audience: 'Local Businesses', tone: 'Friendly', writingStyle: 'Friendly', goal: 'Engagement',
    length: 'Short', englishLevel: 'Simple English'
  },
  personal: {
    businessType: 'Personal Brand / Coach', platform: 'LinkedIn', contentType: 'LinkedIn Post',
    audience: 'Professionals', tone: 'Professional', writingStyle: 'Storytelling', goal: 'Brand Awareness',
    length: 'Medium', englishLevel: 'Professional English'
  },
  seo: {
    businessType: 'SEO Consulting Service', platform: 'Website', contentType: 'SEO Content',
    audience: 'Small Business', tone: 'Professional', writingStyle: 'Professional', goal: 'Website Traffic',
    length: 'Long', englishLevel: 'Professional English'
  },
  googleads: {
    businessType: 'Product Brand', platform: 'Google Ads', contentType: 'Google Ads Copy',
    audience: 'Customers', tone: 'Sales Focused', writingStyle: 'Persuasive', goal: 'Sales',
    length: 'Short', englishLevel: 'Simple English'
  },
  whatsapp: {
    businessType: 'Online Store', platform: 'WhatsApp', contentType: 'Social Media Post',
    audience: 'Customers', tone: 'Friendly', writingStyle: 'Humanized', goal: 'Engagement',
    length: 'Short', englishLevel: 'Simple English'
  },
  website: {
    businessType: 'SaaS Platform', platform: 'Website', contentType: 'Website Content',
    audience: 'Professionals', tone: 'Professional', writingStyle: 'Professional', goal: 'Leads',
    length: 'Detailed', englishLevel: 'Professional English'
  }
};

const LOADING_MSGS = [
  'Crafting your content...', 'Researching your topic...', 'Adding creative touches...',
  'Optimizing for your platform...', 'Polishing the copy...', 'Making it human-friendly...', 'Almost there...'
];

let currentContent = '';
let currentData = null;
let history = JSON.parse(localStorage.getItem('aigen_history') || '[]');
let templates = JSON.parse(localStorage.getItem('aigen_templates') || '[]');

function showState(state, msg, detail) {
  [dom.emptyState, dom.loadingState, dom.errorState, dom.outputArea].forEach(e => e.classList.add('hidden'));
  if (state === 'empty') dom.emptyState.classList.remove('hidden');
  else if (state === 'loading') { dom.loadingState.classList.remove('hidden'); rotateText(); }
  else if (state === 'error') { dom.errorState.classList.remove('hidden'); dom.errorMessage.textContent = msg || 'Error'; dom.errorDetail.textContent = detail || ''; }
  else if (state === 'result') dom.outputArea.classList.remove('hidden');
}

let loadInt;
function rotateText() {
  let i = 0;
  if (dom.loadingText) dom.loadingText.textContent = LOADING_MSGS[0];
  clearInterval(loadInt);
  loadInt = setInterval(() => { i = (i + 1) % LOADING_MSGS.length; if (dom.loadingText) dom.loadingText.textContent = LOADING_MSGS[i]; }, 2000);
}

function updateStats(text) {
  currentContent = text;
  if (dom.charCount) dom.charCount.innerHTML = '<i class="fas fa-font"></i> ' + text.length + ' chars';
  if (dom.wordCount) dom.wordCount.innerHTML = '<i class="fas fa-align-left"></i> ' + (text.trim() ? text.trim().split(/\s+/).length : 0) + ' words';
}

function parseOutput(text) {
  const sections = { hook: '', main: '', cta: '', hashtags: '', seo: '', variations: [] };
  let section = 'main', currentVar = [];

  for (const line of text.split('\n')) {
    const l = line.trim();
    const h = l.toLowerCase();
    if (h.startsWith('=== ') && h.endsWith(' ===') || h.startsWith('===')) {
      const name = h.replace(/={2,}/g, '').trim().replace(/:$/, '');
      if (name === 'hook') section = 'hook';
      else if (name === 'main content' || name === 'main') section = 'main';
      else if (name === 'cta' || name === 'call to action') section = 'cta';
      else if (name === 'hashtags') section = 'hashtags';
      else if (name === 'seo keywords' || name === 'seo') section = 'seo';
      else if (name.startsWith('variation') || name.startsWith('alternative') || name.startsWith('version')) {
        section = 'var';
        if (currentVar.length) { sections.variations.push(currentVar.join('\n')); currentVar = []; }
      } else section = 'main';
      continue;
    }
    if (section === 'var') { if (l) currentVar.push(line); }
    else if (l) sections[section] += (sections[section] ? '\n' : '') + line;
  }
  if (currentVar.length) sections.variations.push(currentVar.join('\n'));

  if (!sections.hook && !sections.main && !sections.cta && !sections.hashtags && !sections.seo && !sections.variations.length) sections.main = text;
  return sections;
}

function renderOutput(sections, data) {
  const show = (id, has) => { const el = document.getElementById(id); if (el) el.style.display = has ? '' : 'none'; };
  show('cardHook', !!sections.hook);
  show('cardCta', !!sections.cta);
  show('cardHashtags', !!sections.hashtags);
  show('cardSeo', !!sections.seo);
  show('cardVariations', sections.variations.length > 0);

  if (dom.hookContent) dom.hookContent.textContent = sections.hook || '\u2014';
  if (dom.mainContent) dom.mainContent.textContent = sections.main || '\u2014';
  if (dom.ctaContent) dom.ctaContent.textContent = sections.cta || '\u2014';
  if (dom.hashtagContent) dom.hashtagContent.textContent = sections.hashtags || '\u2014';
  if (dom.seoContent) dom.seoContent.textContent = sections.seo || '\u2014';

  if (dom.variationsContent) {
    if (sections.variations.length) {
      dom.variationsContent.innerHTML = sections.variations.map((v, i) =>
        '<div class="variation-item"><div class="variation-label">Variation ' + (i + 1) + '</div>' + v.trim() + '</div>'
      ).join('');
    } else dom.variationsContent.innerHTML = '<span style="color:var(--gray-400)">\u2014</span>';
  }

  const all = [sections.hook, sections.main, sections.cta, sections.hashtags, sections.seo, ...sections.variations].filter(Boolean).join('\n\n');
  updateStats(all);

  if (dom.resultBadge) dom.resultBadge.textContent = (data.platform || '') + ' \u00b7 ' + (data.contentType || '');
  if (dom.resultMeta) dom.resultMeta.textContent = (data.writingStyle || '') + ' \u00b7 ' + (data.length || '') + ' \u00b7 ' + (data.tone || '');
  const providerBadge = document.getElementById('providerBadge');
  if (providerBadge && data._provider) {
    providerBadge.textContent = data._provider + ' \u00b7 ' + (data._elapsed || '') + 'ms';
    providerBadge.style.display = 'inline-flex';
    providerBadge.className = 'provider-badge provider-' + (data._providerId || 'unknown');
  } else if (providerBadge) {
    providerBadge.style.display = 'none';
  }
}

const COOLDOWN_MS = 10000;
const TIMEOUT_MS = 30000;
let currentAbort = null;

function getCooldown() {
  const t = parseInt(localStorage.getItem('aigen_cooldown') || '0');
  return Math.max(0, t - Date.now());
}

function setCooldown() {
  localStorage.setItem('aigen_cooldown', String(Date.now() + COOLDOWN_MS));
}

function updateCooldownDisplay() {
  const el = document.getElementById('cooldownDisplay');
  if (!el) return;
  const remaining = getCooldown();
  if (remaining > 0) {
    el.textContent = 'Wait ' + Math.ceil(remaining / 1000) + 's';
    el.style.display = 'inline';
  } else {
    el.style.display = 'none';
  }
}

function setButtonsLoading(loading) {
  [dom.generateBtn, dom.regenerateBtn].forEach(btn => {
    if (!btn) return;
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
  if (loading && dom.generateBtn) {
    const span = dom.generateBtn.querySelector('.btn-text');
    if (span) span.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generating...';
  }
  if (!loading && dom.generateBtn) {
    const span = dom.generateBtn.querySelector('.btn-text');
    if (span) span.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Content';
  }
}

function setCooldownTimer() {
  const el = document.getElementById('cooldownDisplay');
  if (!el) return;
  setCooldown();
  updateCooldownDisplay();
  if (getCooldown() > 0) {
    const ci = setInterval(() => {
      updateCooldownDisplay();
      if (getCooldown() <= 0) { clearInterval(ci); updateCooldownDisplay(); }
    }, 500);
  }
}

async function handleGenerate() {
  const biz = (dom.businessType?.value || '').trim();
  if (!biz) {
    if (dom.businessType) { dom.businessType.style.borderColor = 'var(--red)'; dom.businessType.focus(); setTimeout(() => { dom.businessType.style.borderColor = ''; }, 2000); }
    return;
  }

  const cooldown = getCooldown();
  if (cooldown > 0) {
    showState('error', 'Please wait', 'Wait ' + Math.ceil(cooldown / 1000) + ' seconds before generating again.');
    return;
  }

  trackEvent('generate_content', {
    platform: dom.platform?.value || '',
    content_type: dom.contentType?.value || '',
    length: dom.length?.value || '',
    goal: dom.goal?.value || '',
    tone: dom.tone?.value || ''
  });

  setButtonsLoading(true);
  showState('loading');
  if (dom.loadingText) dom.loadingText.textContent = 'Connecting...';

  currentAbort = new AbortController();
  const timeoutId = setTimeout(() => currentAbort.abort(), TIMEOUT_MS);

  const payload = {
    businessType: biz,
    platform: dom.platform?.value || 'Instagram',
    contentType: dom.contentType?.value || 'Social Media Post',
    audience: dom.audience?.value || 'Customers',
    language: dom.language?.value || 'English',
    englishLevel: dom.englishLevel?.value || 'Simple English',
    writingStyle: dom.writingStyle?.value || 'Humanized',
    tone: dom.tone?.value || 'Professional',
    length: dom.length?.value || 'Medium',
    goal: dom.goal?.value || 'Sales',
    variations: parseInt(dom.variations?.value) || 1,
    includeSeoKeywords: dom.includeSeo?.checked || false,
    addEmojis: dom.addEmojis?.checked || false,
    includeCta: dom.includeCta?.checked || false,
    generateHashtags: dom.genHashtags?.checked || false,
    humanizeContent: dom.humanizeContent?.checked || false,
    avoidAiSounding: dom.avoidAi?.checked || false
  };

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: currentAbort.signal
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let resultData = null;
    let errorData = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.status === 'trying') {
            if (dom.loadingText) dom.loadingText.textContent = 'Trying ' + msg.provider + '...';
          } else if (msg.status === 'switching') {
            if (dom.loadingText) dom.loadingText.textContent = 'Switching to ' + msg.to + '...';
          } else if (msg.status === 'done') {
            if (dom.loadingText) dom.loadingText.textContent = 'Generating with ' + msg.provider + '...';
          } else if (msg.status === 'success') {
            resultData = msg;
          } else if (msg.status === 'error') {
            errorData = msg;
          }
        } catch (e) {}
      }
    }

    if (resultData) {
      if (!resultData.content || !resultData.content.trim()) {
        showState('error', 'Empty Response', 'The provider returned empty content. Please try again.');
        trackEvent('failed_generation', { code: 'empty_content' });
      } else {
        currentData = {
          ...payload,
          platform: dom.platform?.value,
          contentType: dom.contentType?.value,
          _provider: resultData.provider || resultData._provider,
          _providerId: resultData.providerId || resultData._providerId,
          _model: resultData.model || resultData._model,
          _elapsed: resultData.elapsed || resultData._elapsed
        };
        const sections = parseOutput(resultData.content);
        renderOutput(sections, currentData);
        showState('result');
        addHistory(currentData, resultData.content);
        setCooldownTimer();
        trackEvent('provider_used', { provider: currentData._providerId, model: currentData._model, elapsed: currentData._elapsed });
      }
    } else if (errorData) {
      trackEvent('failed_generation', { code: errorData.code || '' });
      if (errorData.code === 'quota_exceeded') trackEvent('quota_error', {});
      showState('error', errorData.error || 'Generation Failed', errorData.detail || '');
    } else {
      showState('error', 'Generation Failed', 'No response received.');
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      trackEvent('failed_generation', { code: 'timeout' });
      showState('error', 'Request taking too long. Please retry.', '');
    } else {
      trackEvent('failed_generation', { code: 'network' });
      showState('error', 'Network Error', 'Could not reach the server. Check your connection.');
    }
  } finally {
    clearTimeout(timeoutId);
    currentAbort = null;
    setButtonsLoading(false);
    clearInterval(loadInt);
    updateCooldownDisplay();
  }
}

function handleCopy() {
  let text = '';
  document.querySelectorAll('.card-body').forEach(c => { const t = c.textContent; if (t && t !== '\u2014') text += t + '\n\n'; });
  if (!text.trim()) return;
  trackEvent('copy_content');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text.trim()).then(() => feedback(dom.copyBtn, 'Copied!')).catch(() => fallbackCopy(text.trim()));
  else fallbackCopy(text.trim());
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); feedback(dom.copyBtn, 'Copied!'); } catch { feedback(dom.copyBtn, 'Failed'); }
  document.body.removeChild(ta);
}

function handleDownloadTxt() {
  if (!currentContent) return;
  trackEvent('download_txt');
  const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, (dom.platform?.value || 'content') + '_' + ((dom.businessType?.value || '').replace(/\s+/g, '_') || 'content') + '.txt');
  feedback(dom.downloadTxtBtn, 'Downloaded!');
}

function handleDownloadDoc() {
  if (!currentContent) return;
  trackEvent('download_doc');
  const html = '<html><body><pre style="font-family:Inter,sans-serif;font-size:14px;line-height:1.7">' + currentContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></body></html>';
  downloadBlob(new Blob([html], { type: 'application/msword' }), (dom.platform?.value || 'content') + '_' + ((dom.businessType?.value || '').replace(/\s+/g, '_') || 'content') + '.doc');
  feedback(dom.downloadDocBtn, 'Downloaded!');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function feedback(el, msg) {
  if (!el) return;
  const orig = el.innerHTML;
  el.innerHTML = msg; el.style.pointerEvents = 'none';
  setTimeout(() => { el.innerHTML = orig; el.style.pointerEvents = ''; }, 1500);
}

function applyPreset(name) {
  if (!name || !PRESETS[name]) return;
  const p = PRESETS[name];
  Object.keys(p).forEach(key => {
    const el = document.getElementById(key);
    if (el) {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = p[key] || '';
    }
  });
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
  const chip = document.querySelector('.preset-chip[data-preset="' + name + '"]');
  if (chip) chip.classList.add('active');
}

function resetForm() {
  document.querySelectorAll('.form-input').forEach(i => {
    if (i.type !== 'checkbox') i.value = i.defaultValue || '';
    else i.checked = i.defaultChecked || false;
  });
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
}

function addHistory(data, raw) {
  const entry = {
    id: Date.now(), timestamp: new Date().toLocaleString(),
    businessType: data.businessType, platform: data.platform,
    contentType: data.contentType,
    content: raw.slice(0, 100) + (raw.length > 100 ? '...' : '')
  };
  history.unshift(entry);
  if (history.length > 20) history = history.slice(0, 20);
  localStorage.setItem('aigen_history', JSON.stringify(history));
  renderHistory();

  const exists = templates.some(t => t.businessType === data.businessType && t.platform === data.platform && t.contentType === data.contentType);
  if (!exists && templates.length < 15) {
    templates.push({ id: Date.now() + 1, name: data.businessType + ' (' + data.platform + ')', ...data });
    localStorage.setItem('aigen_templates', JSON.stringify(templates));
    renderTemplates();
  }
}

function renderHistory() {
  if (!dom.recentHistory) return;
  if (!history.length) { dom.recentHistory.innerHTML = '<p class="empty-hint">No recent generations.</p>'; return; }
  dom.recentHistory.innerHTML = history.map(h =>
    '<div class="saved-item" data-id="' + h.id + '">' +
      '<span class="saved-del" data-id="' + h.id + '" data-type="history">&times;</span>' +
      '<strong>' + h.businessType + '</strong>' +
      '<div class="saved-meta">' + h.platform + ' \u00b7 ' + h.contentType + ' \u00b7 ' + h.timestamp + '</div></div>'
  ).join('');
  dom.recentHistory.querySelectorAll('.saved-item').forEach(el => {
    el.addEventListener('click', function(e) {
      if (e.target.dataset.type === 'history') return;
      const id = parseInt(this.dataset.id);
      const entry = history.find(h => h.id === id);
      if (!entry) return;
      if (dom.businessType) dom.businessType.value = entry.businessType || '';
      if (dom.platform) dom.platform.value = entry.platform || '';
      if (dom.contentType) dom.contentType.value = entry.contentType || '';
    });
  });
  dom.recentHistory.querySelectorAll('.saved-del[data-type="history"]').forEach(el => {
    el.addEventListener('click', function(e) { e.stopPropagation();
      history = history.filter(h => h.id !== parseInt(this.dataset.id));
      localStorage.setItem('aigen_history', JSON.stringify(history)); renderHistory();
    });
  });
}

function renderTemplates() {
  if (!dom.savedTemplates) return;
  if (!templates.length) { dom.savedTemplates.innerHTML = '<p class="empty-hint">No saved templates yet.</p>'; return; }
  dom.savedTemplates.innerHTML = templates.map(t =>
    '<div class="saved-item" data-id="' + t.id + '">' +
      '<span class="saved-del" data-id="' + t.id + '" data-type="template">&times;</span>' +
      '<strong>' + (t.name || t.businessType) + '</strong>' +
      '<div class="saved-meta">' + t.platform + ' \u00b7 ' + t.contentType + '</div></div>'
  ).join('');
  dom.savedTemplates.querySelectorAll('.saved-item').forEach(el => {
    el.addEventListener('click', function(e) {
      if (e.target.dataset.type === 'template') return;
      const id = parseInt(this.dataset.id);
      const t = templates.find(t => t.id === id);
      if (!t) return;
      Object.keys(t).forEach(key => {
        if (['id','name','timestamp','content'].includes(key)) return;
        const el2 = document.getElementById(key);
        if (el2) {
          if (el2.type === 'checkbox') el2.checked = !!t[key];
          else el2.value = t[key] || '';
        }
      });
    });
  });
  dom.savedTemplates.querySelectorAll('.saved-del[data-type="template"]').forEach(el => {
    el.addEventListener('click', function(e) { e.stopPropagation();
      templates = templates.filter(t => t.id !== parseInt(this.dataset.id));
      localStorage.setItem('aigen_templates', JSON.stringify(templates)); renderTemplates();
    });
  });
}

function copySection(id) {
  const el = document.getElementById(id);
  if (!el || !el.textContent || el.textContent === '\u2014') return;
  const text = el.textContent;
  const btn = el.closest('.output-card')?.querySelector('.copy-card-btn');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => { if (btn) feedback(btn, 'Copied!'); }).catch(() => { if (btn) feedback(btn, 'Failed'); });
  else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if (btn) feedback(btn, 'Copied!'); } catch { if (btn) feedback(btn, 'Failed'); }
    document.body.removeChild(ta);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  if (dom.generateBtn) dom.generateBtn.addEventListener('click', handleGenerate);
  if (dom.regenerateBtn) dom.regenerateBtn.addEventListener('click', handleGenerate);
  if (dom.copyBtn) dom.copyBtn.addEventListener('click', handleCopy);
  if (dom.downloadTxtBtn) dom.downloadTxtBtn.addEventListener('click', handleDownloadTxt);
  if (dom.downloadDocBtn) dom.downloadDocBtn.addEventListener('click', handleDownloadDoc);
  if (dom.businessType) dom.businessType.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleGenerate(); });

  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      trackEvent('preset_click', { preset: this.dataset.preset });
      applyPreset(this.dataset.preset);
    });
  });
  document.getElementById('resetPresetBtn')?.addEventListener('click', resetForm);

  document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', function() {
      const preset = this.dataset.preset;
      if (preset) { trackEvent('preset_click', { preset: preset, source: 'section' }); applyPreset(preset); }
      const target = document.getElementById('tools');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', function() {
      const item = this.closest('.faq-item');
      if (item) item.classList.toggle('active');
    });
  });

  document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
    a.addEventListener('click', function() { trackEvent('whatsapp_click', { text: this.textContent.trim().slice(0, 30) }); });
  });

  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() { navMenu.classList.toggle('active'); this.classList.toggle('active'); });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function() { navMenu.classList.remove('active'); navToggle.classList.remove('active'); });
    });
  }

  window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat-number').forEach(el => {
          const target = parseInt(el.dataset.count);
          if (target) animateCount(el, target);
        });
      }
    });
  }, { threshold: 0.5 });
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) observer.observe(heroStats);

  renderHistory();
  renderTemplates();
  updateCooldownDisplay();
});

function animateCount(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(interval); }
    el.textContent = current;
  }, 30);
}
