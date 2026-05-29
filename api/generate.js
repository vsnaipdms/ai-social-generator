require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });

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
    Friendly: "Write like a helpful friend who's excited to share something useful. Use 'you' a lot. Be warm, approachable, and encouraging. Smile through the words.",
    Luxury: "Use elegant, refined language. Less is more. Create a feeling of exclusivity and sophistication. Use sensory words. Make every word feel premium.",
    Emotional: "Tap into feelings. Use vivid, sensory language. Share relatable struggles and desires. Make the reader feel understood on a deep level.",
    "Sales Focused": "Urgent, benefit-driven. Address pain points directly. Use power words. Create scarcity and desire. Every sentence should push toward the sale."
  };
  const toneGuide = toneGuides[tone] || "Natural, engaging, and appropriate for the audience.";

  const styleGuides = {
    Humanized: "Write exactly how a real person talks. Use contractions (don't, can't, it's, you'll). Vary sentence length. Start some sentences with 'And' or 'But'. Be imperfect. Real people don't write perfectly.",
    Persuasive: "Use the AIDA formula: grab Attention, build Interest, create Desire, prompt Action. Address objections before they arise. Use social proof language. Make benefits crystal clear.",
    Emotional: "Paint a picture. Use sensory details. Tell a mini-story. Make the reader feel something before you ask them to do something. Connection first, pitch second.",
    Storytelling: "Open with a specific moment, not a general statement. Use a character the reader can see themselves in. Include a small conflict or tension. End with a resolution or lesson.",
    Professional: "Clear, confident, authoritative. Use industry terms naturally. No markety fluff. Respect the reader's intelligence. Get straight to the point.",
    Friendly: "Write like you're talking to someone you know. Use everyday language. Be upbeat but not fake. Show personality. It's okay to be a little casual.",
    Luxury: "Refined, minimal, evocative. Use fewer words that carry more weight. Create space. Let the reader fill in the gaps. Exclusivity over accessibility.",
    Casual: "Keep it loose. Use slang if it fits. Write like a text or DM. Short punches. Real reactions. No corporate speak whatsoever."
  };
  const styleGuide = styleGuides[writingStyle] || "Natural, engaging copy that connects with the reader.";

  const audienceGuide = `Write directly to ${audience}. Use language, references, and pain points they actually experience. Show you understand their world.`;

  const antiPatterns = [
    "Never start with 'In today's digital age', 'In a world where', 'Let's face it', or 'Are you tired of'",
    "Never use 'game-changer', 'revolutionize', 'unlock your potential', 'unleash', 'supercharge', or 'transform your business'",
    "Never write generic motivational filler. Every sentence must earn its place.",
    "Never write like a textbook. No 'In conclusion', 'Furthermore', 'Moreover', 'It is important to note'",
    "Never use 'embark on a journey', 'dive into', 'let's explore', or 'picture this' as a crutch",
    "Avoid lists of three adjectives. One strong word beats three weak ones.",
    "No robotic sign-offs like 'Remember, your journey matters' or 'The power is in your hands'"
  ];

  const enLevelGuides = {
    "Grade 5 English": "Use very simple words. Short sentences (8-12 words max). One idea per sentence. No jargon. Write like you're explaining to a 10-year-old. Very clear. Very direct.",
    "Simple English": "Keep sentences short and clear. Use common words. No complex vocabulary. Easy to read and understand. Write like a helpful friend explaining something.",
    "Professional English": "Use proper business vocabulary. Sound competent and credible. Sentences can be varied length. Use industry terms where fitting. Professional but still human.",
    "Advanced English": "Use sophisticated vocabulary naturally. Varied and complex sentence structures. Subtle humor and nuance. Write at an executive level. Sound like a thought leader."
  };
  const enGuide = enLevelGuides[englishLevel] || "Clear, natural English that's easy to read.";

  let prompt = `You're a top-tier copywriter. Not a robot. A human who writes words that make people stop scrolling and take action.

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

## HOW TO WRITE

${styleGuide}

${toneGuide}

${audienceGuide}

English level guide: ${enGuide}

## WHAT TO NEVER DO

${antiPatterns.join("\n")}

${(humanizeContent || avoidAiSounding) ? "\n## HUMANITY RULES\n- Write like you're talking to ONE person. Not a crowd.\n- Use contractions: don't, can't, won't, it's, you're, they'll\n- Start sentences with And, But, Or, So sometimes. Real people do.\n- End some sentences early. Let them breathe.\n- Read every sentence aloud before writing it. If it sounds weird spoken, rewrite it.\n- Add small imperfections. A perfect paragraph feels fake.\n- Use 'you' and 'your' constantly. Talk TO the reader, not about them." : ""}

${includeSeoKeywords ? "\n## SEO\nSprinkle these naturally. Don't force them. If they fit, great. If not, the reader comes first." : ""}

## OUTPUT STRUCTURE

You MUST output using these EXACT headers:

=== HOOK ===
One short sentence that stops the scroll. No warm-ups. No introductions. Just a punch.

=== MAIN CONTENT ===
The body. ${wordCount} words. Write in ${writingStyle} style with ${tone} tone. Target ${audience}. Every sentence moves toward ${goal}. No filler.

=== CTA ===`;

  prompt += includeCta
    ? "\nOne clear action. Tell them exactly what to do next. Make it easy. Make it urgent."
    : "\n[No CTA requested]";

  if (generateHashtags) {
    prompt += `\n\n=== HASHTAGS ===\n10-15 hashtags for ${platform}. Mix popular and niche. No spaces, all lowercase.`;
  }

  if (includeSeoKeywords) {
    prompt += `\n\n=== SEO KEYWORDS ===\n5-8 keywords or phrases. Real search terms people use.`;
  }

  if (variations > 1) {
    prompt += `\n`;
    for (let i = 1; i <= Math.min(variations, 5); i++) {
      prompt += `\n=== VARIATION ${i} ===\nSame message, totally different angle. Change the opening, the structure, the voice. Make it feel like a different person wrote it.`;
    }
  }

  prompt += `\n\n## FINAL RULES\n- ${addEmojis ? "Use emojis naturally. 1-3 max. Not every paragraph." : "No emojis."}\n- Write everything in ${language}.\n- Zero greetings, zero sign-offs, zero meta-commentary.\n- If your first draft sounds like AI, delete it and start over.\n- Read it once more before output. Cut any sentence that feels generic.`;

  return prompt;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  if (!req.body.businessType || !req.body.businessType.toString().trim()) {
    return res.status(400).json({ error: "Missing required field: businessType" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server configuration error: API key not set.",
      detail: "Set GEMINI_API_KEY in .env.local (local) or Vercel env vars (production)."
    });
  }

  try {
    const prompt = buildPrompt(req.body);
    const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-pro-latest"];
    let lastError = null;

    for (const model of models) {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return res.status(200).json({
            success: true,
            data: {
              content: text.trim(),
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
            }
          });
        }
      }
      lastError = await response.json().then(j => j.error?.message || JSON.stringify(j)).catch(() => response.statusText);
    }

    return res.status(500).json({ error: "AI service error: " + lastError });

  } catch (err) {
    console.error("Server error:", err.message);
    return res.status(500).json({ error: "Failed to generate content: " + err.message });
  }
};
