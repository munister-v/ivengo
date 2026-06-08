import type { GenerationRequest, GeneratedPost, ContentType } from './types'

const LANG_LABELS: Record<string, string> = {
  uk: 'Ukrainian (Українська)',
  ru: 'Russian (Русский)',
}

const UA_CITIES = [
  'Київ', 'Харків', 'Одеса', 'Дніпро', 'Запоріжжя', 'Львів', 'Суми',
  'Полтава', 'Вінниця', 'Черкаси', 'Миколаїв', 'Херсон', 'Житомир', 'Рівне',
]

const UA_NAMES_M = ['Павло', 'Олексій', 'Ігор', 'Дмитро', 'Максим', 'Андрій', 'Сергій', 'Роман']
const UA_NAMES_F = ['Оксана', 'Тетяна', 'Наталія', 'Ірина', 'Марина', 'Людмила', 'Олена']
const RU_CITIES = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Краснодар', 'Казань', 'Ростов', 'Новосибирск']
const RU_NAMES_M = ['Алексей', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Роман', 'Павел']
const RU_NAMES_F = ['Ольга', 'Наталья', 'Татьяна', 'Ирина', 'Марина', 'Людмила']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomAmount(): string {
  const amounts = [4850, 7200, 9500, 12750, 16985, 21400, 34600, 48000, 67500, 112000]
  const a = randomFrom(amounts)
  return a.toLocaleString('uk-UA') + ' грн'
}

function randomCodesLeft(): number {
  return [23, 31, 37, 41, 45, 52, 67].at(Math.floor(Math.random() * 7)) ?? 45
}

function buildContext(req: GenerationRequest) {
  const isUk = req.language === 'uk'
  const cities = isUk ? UA_CITIES : RU_CITIES
  const namesM = isUk ? UA_NAMES_M : RU_NAMES_M
  const namesF = isUk ? UA_NAMES_F : RU_NAMES_F
  const allNames = [...namesM, ...namesF]

  return {
    city: randomFrom(cities),
    name: randomFrom(allNames),
    amount: randomAmount(),
    codesLeft: randomCodesLeft(),
    ctaUrl: req.ctaUrl || 'https://t.me/your_channel',
    channelName: req.channelName || 'Гральний Клуб',
  }
}

// ─────────────────────────────────────────────
// Per-type system + user prompts
// ─────────────────────────────────────────────

export function buildPrompt(req: GenerationRequest, count: number) {
  const isUk = req.language === 'uk'
  const ctx = buildContext(req)
  const lang = LANG_LABELS[req.language]

  const commonRules = `
Language: ${lang}.
Return ONLY a valid JSON array of ${count} post objects — no extra text, no markdown code fences.
Each object fields: "title" (string|null), "content" (string, use Telegram Markdown: *bold*, _italic_, use emojis liberally), "buttons" ([{"text": string, "url": string}]|null).
All posts must be unique. Make each post feel natural and conversational, not robotic.`.trim()

  switch (req.type) {
    // ── USER STORY ──────────────────────────────
    case 'user_story': {
      const system = `You are a copywriter for a Ukrainian Telegram casino channel "${ctx.channelName}".
Write viral user-story posts exactly matching this proven template:

TEMPLATE (adapt text, keep structure):
---
🚨 УВАГА Тільки для підписників ${ctx.channelName}!

[Name] з міста [City] сьогодні поділився з нами таким скріншотом виграшу.

❗️ Ми знайшли бонус для нових гравців, який діє тільки для підписників ${ctx.channelName}!

🔴 Переходь за посиланням та забирай 1 з [N] бонусних кодів, їх розбирають дуже швидко 🔴
---

Rules:
- Use a random Ukrainian name + city for each post (make them feel real)
- Win amount should be impressive but believable (5 000 – 130 000 грн)
- Number of bonus codes: 20–67
- The "button" text should be urgent: ПІДТВЕРДИТИ, ЗАБРАТИ БОНУС, ОТРИМАТИ КОД
- Do NOT claim guaranteed wins — frame as "user shared a screenshot"
- Include 18+ somewhere subtle
${commonRules}`

      const user = `Generate ${count} user-story posts about the topic: "${req.theme}".
Use these for variation — names: ${UA_NAMES_M.concat(UA_NAMES_F).join(', ')}; cities: ${UA_CITIES.join(', ')}.
CTA URL: ${ctx.ctaUrl}`

      return { system, user }
    }

    // ── URGENCY OFFER ───────────────────────────
    case 'urgency_offer': {
      const system = `You are a copywriter for a Ukrainian Telegram casino channel "${ctx.channelName}".
Write high-converting urgency posts. Two proven formats:

FORMAT A (countdown):
---
[Short punchy title like "Призи розбирають..." or "Годинник цікає..."]

[1-line quote creating FOMO, e.g. "Встигни стати тим самим щасливчиком, про котрого напишуть у новинах"]
---
Button: КРУТАНУТИ / ЗАБРАТИ ЗАРАЗ / ВСТИГНУТИ

FORMAT B (limited offer):
---
🔥 [CAPS headline] 🔥

[2-3 lines: what's available, how many left, expires when]

⏰ Залишилось [N] місць!
---
Button: ЗАЙНЯТИ МІСЦЕ / ОТРИМАТИ БОНУС

Rules:
- Use CAPS for key phrases in title/headline
- Mix 🔥⏰🔴⚡️ emojis for urgency
- Keep it SHORT — max 5 lines of text
- No guaranteed win claims
- 18+ label at the end
${commonRules}`

      const user = `Generate ${count} urgency posts about: "${req.theme}".
Vary between FORMAT A and FORMAT B. Make each feel genuinely urgent and different.
CTA URL: ${ctx.ctaUrl}`

      return { system, user }
    }

    // ── ENGAGEMENT POLL ─────────────────────────
    case 'engagement_poll': {
      const system = `You are a copywriter for a Ukrainian Telegram casino channel "${ctx.channelName}".
Write short engagement poll posts exactly like these examples:

Example 1: question = "ВСТИГ ЗАБРАТИ БОНУС?", options = ["ТАК ✅", "НІ ❌"]
Example 2: question = "Яку суму ти виграв цього тижня?", options = ["До 1000 грн 😐", "1000–10 000 грн 💰", "10 000+ грн 🔥", "Ще не грав 😴"]
Example 3: question = "Який твій улюблений слот?", options = ["Book of Ra 📖", "Gates of Olympus ⚡️", "Sweet Bonanza 🍬", "Інший 🎰"]

Rules:
- Poll content goes in "poll" JSON key: {"question": string, "options": string[] (2-4 items), "isAnonymous": true}
- "content" field: just a short 1-2 line teaser before the poll (or empty string)
- Options should use emojis, be short (max 5 words)
- CAPS in question for emphasis
- "buttons" can be null for polls
${commonRules}`

      const user = `Generate ${count} engagement poll posts about: "${req.theme}".
Include a "poll" object in each post. Make polls fun and relatable for casino players.`

      // Add poll field to output schema instruction
      return {
        system: system + '\nEach object must also have "poll": {"question": string, "options": string[], "isAnonymous": true}.',
        user,
      }
    }

    // ── SHORT POST ──────────────────────────────
    case 'short_post': {
      const system = `You are a copywriter for a Ukrainian Telegram casino channel "${ctx.channelName}".
Write punchy, engaging short posts (100–350 chars) with strong hook and CTA.

Style reference:
- Start with a bold hook: emoji + CAPS word or rhetorical question
- 2-3 short sentences with emojis
- End with a CTA button if ctaUrl provided

Topic: "${req.theme}"
${commonRules}`
      const user = `Generate ${count} short posts. CTA URL: ${ctx.ctaUrl || 'none'}`
      return { system, user }
    }

    // ── MYTH / FACT ─────────────────────────────
    case 'myth_fact': {
      const system = `You are an expert copywriter for a Ukrainian Telegram casino channel.
Write "Міф vs Факт" posts in this format:

🔴 МІФ: "[common player misconception]"

✅ ФАКТ: "[truthful debunking, educational, 2-3 sentences]"

💡 [short takeaway tip]

Rules:
- Use myths players actually believe (hot slots, lucky numbers, card counting in online, etc.)
- Fact must be accurate and educational
- Tone: smart but accessible, not preachy
- End with 18+ label
${commonRules}`
      const user = `Generate ${count} myth-fact posts about: "${req.theme}".`
      return { system, user }
    }

    // ── RESPONSIBLE GAMBLING ────────────────────
    case 'responsible_gambling': {
      const system = `You are writing responsible gambling awareness content for a Ukrainian Telegram casino channel.
Format:
⚠️ [Short attention headline]

[3-5 practical tips with checkmark emojis]

📞 [Support line or resource]

Rules:
- Genuinely helpful, not preachy
- Practical, actionable tips
- Must include 18+ and a support contact reference
- NO promotional content whatsoever
${commonRules}`
      const user = `Generate ${count} responsible gambling posts about: "${req.theme}".`
      return { system, user }
    }

    // ── POLL (quiz style) ───────────────────────
    case 'poll': {
      const system = `You are a copywriter for a Ukrainian Telegram casino channel.
Create quiz/trivia polls about casino topics.
Each post: "content" = short intro text, "poll" = {"question": string, "options": string[], "correctOptionId": number (0-indexed), "isAnonymous": false}
Make it a QUIZ (one correct answer). Include the answer explanation in "content" after "||" spoiler if possible.
${commonRules}`
      const user = `Generate ${count} quiz poll posts about: "${req.theme}".`
      return {
        system: system + '\nInclude "poll" field with correctOptionId.',
        user,
      }
    }

    // ── DEFAULT (article, review, faq, news) ────
    default: {
      const typeInstructions: Record<string, string> = {
        article: 'Informative article (600–1000 chars) with clear sections, headers (bold), emojis. Educational tone.',
        review: 'Casino game/platform review with pros/cons. Use ✅ for pros, ❌ for cons. Rating at end.',
        faq: 'FAQ format: ❓ Question in bold, then clear answer. 2-3 Q&A pairs per post.',
        news: 'News-style post: headline in caps, then 2-3 short paragraphs. Factual tone.',
      }
      const system = `You are a copywriter for a Ukrainian Telegram casino channel "${ctx.channelName}".
Post type: ${typeInstructions[req.type] ?? 'engaging post'}
Topic: "${req.theme}"
${commonRules}`
      const user = `Generate ${count} posts. CTA URL if relevant: ${ctx.ctaUrl || 'none'}`
      return { system, user }
    }
  }
}
