require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const apiService = require("./apiService");

function buildPrompt(fields) {
  const {
    businessType, platform, contentType, audience, language, englishLevel,
    writingStyle, tone, length, goal, variations, includeSeoKeywords, addEmojis,
    includeCta, generateHashtags, humanizeContent, avoidAiSounding
  } = fields;

  const wordMap = { Short: "80-120", Medium: "150-250", Long: "300-450", Detailed: "500-800" };
  const wordCount = wordMap[length] || "150-250";

  const toneGuides = {
    Professional: "Use confident, polished language. Short, direct sentences. No fluff. Sound like an industry expert who knows their stuff. Avoid hype words.",
    Friendly: "Write like a helpful friend excited to share something useful. Use 'you' a lot. Be warm, approachable, and encouraging. Smile through the words.",
    Luxury: "Refined, minimal, evocative. Use fewer words that carry more weight. Create a feeling of exclusivity and sophistication.",
    Emotional: "Tap into feelings. Use vivid, sensory language. Share relatable struggles and desires. Make the reader feel understood on a deep level.",
    "Sales Focused": "Urgent, benefit-driven. Address pain points directly. Create scarcity and desire. Every sentence pushes toward the sale."
  };
  const toneGuide = toneGuides[tone] || "Natural, engaging, and appropriate for the audience.";

  const styleGuides = {
    Humanized: "Write how a real person talks. Contractions. Varied sentence length. Start with 'And' or 'But' sometimes. Be imperfect. If it sounds perfect, it sounds fake.",
    Persuasive: "AIDA formula. Address objections before they arise. Use social proof. Make benefits crystal clear. Every paragraph earns the next.",
    Emotional: "Paint a picture with sensory details. Tell a mini-story. Make them feel something before you ask them to do something.",
    Storytelling: "Open with a specific moment, not a general statement. Use a character the reader sees themselves in. Small conflict. Resolution or lesson.",
    Professional: "Clear, confident, authoritative. Use industry terms naturally. No markety fluff. Respect the reader's intelligence.",
    Friendly: "Talk like you know them. Everyday language. Upbeat but not fake. Show personality. Okay to be a little casual.",
    Luxury: "Refined, minimal, evocative. Fewer words with more weight. Create space. Let the reader fill the gaps. Exclusivity over accessibility.",
    Casual: "Loose. Slang if it fits. Write like a text or DM. Short punches. Real reactions. No corporate speak."
  };
  const styleGuide = styleGuides[writingStyle] || "Natural, engaging copy that connects with the reader.";

  const audienceGuide = `Write directly to ${audience}. Use language, references, and pain points they actually experience. Show you understand their world better than anyone else.`;

  const platformGuides = {
    Instagram: "Short, punchy. Line breaks between sentences. Visual first. Keep scrolling, make them stop. Max 2-3 sentences per paragraph.",
    Facebook: "Conversational but valuable. Can be longer. Story-driven. Questions work well. Community feel.",
    LinkedIn: "Thought-leadership tone. Open with a strong opinion or surprising insight. Value-first. Use line breaks for readability. End with a question to drive comments.",
    YouTube: "Script format. Hook in first 5 seconds. Conversational spoken English. Short sentences. Transitions between sections. End with 'like and subscribe' style CTA.",
    "Twitter / X": "Tight. Every word earns its place. One strong idea per tweet. Use the character limit wisely. Threads ok for longer content.",
    Website: "Scanner-friendly. Headings. Short paragraphs. Benefits before features. Clear hierarchy. SEO-optimized naturally.",
    "Google Ads": "Keyword-rich headlines. Strict character limits. Urgency. Call out the search intent directly. Benefits in description lines. Use numbers.",
    WhatsApp: "Short. Direct. Personal. Like a message from a friend. No formatting. Emojis ok. One call to action."
  };
  const platformGuide = platformGuides[platform] || "Write for the platform naturally. Match the format and tone your audience expects there.";

  const psychologicalTriggers = `
- Open loops: start something you finish later
- Specificity: use exact numbers, names, places. Vague = forgettable.
- Contrast: before/after, problem/solution, without/with
- Social proof: imply others are already doing it
- Loss aversion: what they lose by not acting
- Curiosity gap: make them need to know what comes next`;

  const antiPatterns = [
    "ZERO GENERIC OPENERS: Never start with 'In today's digital age', 'In a world where', 'Let's face it', 'Are you tired of', 'Gone are the days', 'The landscape of', 'When it comes to', 'It's no secret that'",
    "ZERO HYPE WORDS: Never use 'game-changer', 'revolutionize', 'unlock your potential', 'unleash', 'supercharge', 'transform your business', 'cutting-edge', 'state-of-the-art', 'next-level', 'paradigm shift', 'robust solution'",
    "ZERO TRANSITION FILLER: No 'In conclusion', 'Furthermore', 'Moreover', 'It is important to note', 'It's worth mentioning', 'Needless to say', 'With that in mind'",
    "ZERO CRUTCH PHRASES: Never use 'embark on a journey', 'dive into', 'let's explore', 'picture this', 'imagine a world', 'the power of', 'the beauty of'",
    "ZERO CLOSING CLICHES: No 'Remember, your journey matters', 'The power is in your hands', 'The possibilities are endless', 'The sky's the limit', 'Your future self will thank you'",
    "ZERO ADJECTIVE STACKING: Never write three adjectives in a row. One strong word beats three weak ones.",
    "ZERO META: Never say 'As a [businessType]', 'In this post', 'I'm writing this because', 'I wanted to share'",
    "ZERO WEASEL WORDS: Avoid 'just', 'simply', 'basically', 'literally', 'actually', 'very', 'really', 'truly'",
    "ZERO QUESTION CRUTCH: Don't open with a rhetorical question. It's lazy. Surprise them instead.",
    "ZERO MOTIVATIONAL FILLER: Every sentence must do work. If you can delete it without losing meaning, delete it."
  ];

  const enLevelGuides = {
    "Grade 5 English": "MAX 12 words per sentence. One idea per sentence. No complex words. Write like you're explaining to a 10-year-old. Use short words: 'use' not 'utilize', 'help' not 'facilitate', 'show' not 'demonstrate'. No metaphors. Very direct.",
    "Simple English": "Keep sentences short. Use common words only. No jargon. Easy to read. Write like a helpful friend explaining something clearly. Short paragraphs. One idea at a time.",
    "Professional English": "Use proper business vocabulary naturally. Competent and credible. Varied sentence length. Industry terms where fitting. Professional but still sounds like a human wrote it.",
    "Advanced English": "Sophisticated vocabulary used naturally. Varied and complex sentence structures. Subtle humor and nuance. Executive-level writing. Sound like a thought leader, not a textbook."
  };
  const enGuide = enLevelGuides[englishLevel] || "Clear, natural English that's easy to read.";

  const hookRules = `
HOOK MUST BE ONE OF THESE TYPES (pick the best fit):
- Surprising stat: "Most creators spend 8 hours/week writing captions."
- Bold opinion: "Your website hero section is costing you leads."
- Relatable pain: "You've written 50 posts this month. Engagement? Crickets."
- Curiosity gap: "Here's why your best content isn't working."
- Direct address: "You're one email away from your next client."
- Specific promise: "This template doubles your response rate in 7 days."

HOOK RULES:
Never ask a question as the hook. Questions are lazy.
Never start with a quote.
Never use "How to" as the hook — be more specific.
One sentence only. 8-20 words.`;

  let prompt = `You are a world-class direct-response copywriter. You have been writing for 15+ years. You've written for brands like Apple, Nike, and HubSpot. You hate generic marketing. You write copy that converts.

## THE BRIEF

Business / Topic: ${businessType}
Platform: ${platform}
Content Type: ${contentType}
Target Audience: ${audience}
Goal: ${goal}
Writing Style: ${writingStyle}
Tone: ${tone}
Language: ${language}
English Level: ${englishLevel}
Word Count Target: ${wordCount}

## PLATFORM RULES

${platformGuide}

## HOW TO WRITE

Style: ${styleGuide}

Tone: ${toneGuide}

Audience: ${audienceGuide}

English Level: ${enGuide}

## PSYCHOLOGICAL TRIGGERS (use at least 2)
${psychologicalTriggers}

## WHAT TO NEVER DO — VIOLATE ANY OF THESE AND THE COPY IS REJECTED

${antiPatterns.join("\n")}

## HOOK REQUIREMENTS
${hookRules}

${(humanizeContent || avoidAiSounding) ? `
## HUMANITY RULES (MANDATORY)
- Write to ONE person, not a crowd. Use "you" constantly.
- Use contractions: don't, can't, won't, it's, you're, they'll, there's, I've
- Start sentences with And, But, Or, So, Yet, Because sometimes
- End some sentences abruptly. Let them breathe.
- Read every sentence aloud. If it sounds weird spoken, rewrite it.
- Add one small imperfection. A perfect paragraph feels fake.
- Vary sentence length: short. medium. longer for rhythm.
- Never use the word "leverage", "utilize", "optimize", "streamline"` : ""}

${includeSeoKeywords ? "\n## SEO RULES\nIncorporate 3-5 keywords naturally into the main content. Do not stuff. If it reads unnaturally, skip it. The reader comes first." : ""}

## CONTENT QUALITY CHECKLIST (self-verify before output)
✓ Every sentence passes the "so what?" test
✓ No sentence starts the same way as the previous one
✓ At least one specific number or concrete detail is included
✓ The hook is surprising or provocative, not generic
✓ Zero clichés or buzzwords from the banned list
✓ The copy has rhythm — short sentences next to longer ones

## OUTPUT STRUCTURE — USE THESE EXACT HEADERS

=== HOOK ===

=== MAIN CONTENT ===
${wordCount} words minimum. ${writingStyle} style. ${tone} tone. Target: ${audience}. Every sentence moves toward: ${goal}. No filler. Include specific details, not vague claims.

=== CTA ===`;

  prompt += includeCta
    ? "\nOne clear, specific action. Tell them exactly what to do next. Make it easy. Make it urgent. Do not say 'Click the link in bio' or 'Visit our website' generically."
    : "\n[No CTA requested]";

  if (generateHashtags) {
    prompt += `\n\n=== HASHTAGS ===\n8-12 hashtags for ${platform}. Mix of popular (500K+) and niche (10K-100K). No spaces, all lowercase. Group by category if helpful.`;
  }

  if (includeSeoKeywords) {
    prompt += `\n\n=== SEO KEYWORDS ===\n5-8 keywords or phrases people actually search for. Long-tail preferred. Separate by comma.`;
  }

  if (variations > 1) {
    prompt += `\n`;
    for (let i = 1; i <= Math.min(variations, 5); i++) {
      prompt += `\n=== VARIATION ${i} ===\nSame core message. Completely different approach. Change: HOOK structure, sentence rhythm, emotional angle, and CTA style. Make it feel like a different copywriter wrote this.`;
    }
  }

  prompt += `\n\n## FINAL RULES (non-negotiable)\n- ${addEmojis ? "Use exactly 1-3 emojis total. Only where they add meaning. Never open or close with an emoji." : "Zero emojis."}\n- Write everything in ${language}. Not a single word in any other language.\n- Zero greetings, zero sign-offs, zero meta-commentary. No "Hope this helps" or "Let me know what you think".\n- If your first draft sounds like AI, delete it and start over. No exceptions.\n- Read the output once more. Delete any sentence you've seen before in other AI content.\n- No explanations of what you're doing. Just write the copy.`;

  return prompt;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  console.log("--- ENV CHECK ---");
  console.log("GROQ:", !!process.env.GROQ_API_KEY);
  console.log("OPENROUTER:", !!process.env.OPENROUTER_API_KEY);
  console.log("GEMINI:", !!process.env.GEMINI_API_KEY);
  console.log("HF:", !!process.env.HF_TOKEN);
  console.log("TOGETHER:", !!process.env.TOGETHER_API_KEY);
  console.log("ENABLE_TOGETHER:", process.env.ENABLE_TOGETHER_AI);
  console.log("ENABLE_HUGGINGFACE:", process.env.ENABLE_HUGGINGFACE);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  if (!req.body.businessType || !req.body.businessType.toString().trim()) {
    return res.status(400).json({ error: "Missing required field: businessType" });
  }

  const hasAnyKey = ["GROQ_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY", "HF_TOKEN", "TOGETHER_API_KEY"]
    .some(k => process.env[k]);
  if (!hasAnyKey) {
    return res.status(500).json({
      error: "No AI provider API keys configured.",
      detail: "Set at least one of GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, HF_TOKEN, or TOGETHER_API_KEY."
    });
  }

  res.writeHead(200, { "Content-Type": "application/x-ndjson" });

  let ended = false;
  function emit(msg) {
    try {
      if (!ended) res.write(JSON.stringify(msg) + "\n");
    } catch (e) {}
  }

  try {
    const prompt = buildPrompt(req.body);
    const opts = { onStatus: emit };
    if (req.body.forceProvider) opts.forceProvider = req.body.forceProvider;
    const result = await apiService.generate(prompt, opts);

    if (result.success) {
      if (!result.content || !result.content.trim()) {
        console.error("Empty content from provider:", result.provider);
        emit({ status: "error", error: "Provider returned empty response.", code: "empty_content" });
        trackEvent("failed_generation", { code: "empty_content", provider: result.provider });
      } else {
        trackEvent("provider_used", { provider: result.provider, model: result.model, elapsed: result.elapsed });
        emit({
          status: "success",
          success: true,
          provider: result.providerName,
          content: result.content,
          _provider: result.providerName,
          _providerId: result.provider,
          _model: result.model,
          _elapsed: result.elapsed,
          platform: req.body.platform || "",
          contentType: req.body.contentType || "",
          tone: req.body.tone || "",
          language: req.body.language || "",
          goal: req.body.goal || "",
          businessType: req.body.businessType || "",
          writingStyle: req.body.writingStyle || "",
          length: req.body.length || "",
          audience: req.body.audience || "",
          englishLevel: req.body.englishLevel || ""
        });
      }
    } else {
      trackEvent("failed_generation", { code: result.code || 'all_providers_failed', error: result.error?.slice(0, 100) });
      emit({
        status: "error",
        error: result.error || "All AI providers are currently unavailable.",
        detail: result.detail || "",
        code: result.code || "all_providers_failed",
        failedProvider: result.provider || null,
        failedProviderName: result.providerName || null
      });
    }

  } catch (err) {
    if (!ended) {
      if (err.name === "AbortError") {
        emit({ status: "error", error: "Request taking too long. Please retry.", code: "timeout" });
      } else {
        console.error("Server error:", err.message);
        emit({ status: "error", error: "Failed to generate content. Please try again.", code: "server_error" });
      }
    }
  }

  ended = true;
  try { res.end(); } catch (e) {}
};

function trackEvent(name, data) {
  try {
    console.log(`[ANALYTICS] ${name}:`, JSON.stringify(data));
  } catch (e) {}
}
