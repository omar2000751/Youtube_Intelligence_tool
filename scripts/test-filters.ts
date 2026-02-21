/**
 * Filter test script — run with: npx tsx scripts/test-filters.ts
 *
 * Tests passesQualityFilters() logic against representative AI-niche video data.
 * Keeps the filter logic in sync with youtube.ts manually — update here when
 * youtube.ts changes.
 */

// ─── Mirror of youtube.ts filter constants & functions ───────────────────────

const MIN_VIEW_COUNT = 5_000;

const NEGATIVE_TITLE_KEYWORDS = [
  // Pure entertainment — specific multi-word phrases only.
  // Single words like 'film', 'movie', 'trailer', 'episode', 'season' are removed
  // because they also appear in legitimate AI content titles
  // ("I Made a Short Film with AI", "AI Movie Trailer Generator", etc.)
  'official music video', 'official video', 'official audio', 'lyrics video',
  'music video',
  'full movie',    // "Batman Full Movie" = streaming, not AI tool
  'full episode',  // "Full Episode" = TV show, not AI tutorial
  // Gaming verbs — specific enough to not catch AI game-dev content
  'gameplay', "let's play", 'walkthrough',
  // Non-English language markers commonly found in English-title videos
  'hindi', 'urdu', 'tamil', 'telugu', 'marathi', 'kannada',
  'bengali', 'punjabi', 'gujarati', 'malayalam',
];

const NON_LATIN_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u0900-\u097F\u4E00-\u9FFF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u3040-\u30FF]/;

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? '0', 10) * 3600)
       + (parseInt(m[2] ?? '0', 10) * 60)
       + parseInt(m[3] ?? '0', 10);
}

// Returns null = PASS, string = reason for rejection
function filterReason(v: {
  title: string;
  views: number;
  duration: string;
  lang?: string;
}): string | null {
  const title = v.title;
  const titleLower = title.toLowerCase();
  const lang = v.lang ?? '';

  if (lang && !lang.startsWith('en')) return `lang tag: "${lang}"`;
  if (NON_LATIN_SCRIPT_RE.test(title))  return `non-latin script in title`;

  const secs = parseIsoDuration(v.duration);
  if (secs > 0 && secs < 60)            return `short (${secs}s < 60s)`;

  const tags = (title.match(/#\w+/g) ?? []).length;
  if (tags >= 2)                         return `hashtag spam (${tags} tags)`;

  if (v.views < MIN_VIEW_COUNT)          return `low views (${v.views.toLocaleString()} < 5 000)`;

  const hit = NEGATIVE_TITLE_KEYWORDS.find(kw => titleLower.includes(kw));
  if (hit)                               return `negative keyword: "${hit}"`;

  return null;
}

// ─── Test cases ──────────────────────────────────────────────────────────────

type TestCase = {
  title: string;
  views: number;
  duration: string;  // ISO 8601
  lang?: string;
  expect: 'PASS' | 'FAIL';
  note: string;
};

const cases: TestCase[] = [
  // ── Should PASS — good AI niche content ─────────────────────────────────────
  {
    title: 'ChatGPT vs Claude vs Gemini: The 2024 Complete Comparison',
    views: 520_000, duration: 'PT18M42S', expect: 'PASS',
    note: 'Comparison / Reactions pillar — should appear',
  },
  {
    title: 'I Tested Every AI Coding Tool So You Don\'t Have To',
    views: 310_000, duration: 'PT14M20S', expect: 'PASS',
    note: 'Experiment pillar — should appear',
  },
  {
    title: 'How to Build a Custom AI Agent (No Code)',
    views: 180_000, duration: 'PT12M05S', expect: 'PASS',
    note: 'Tutorial pillar — Jeff Su / Matt Wolfe style',
  },
  {
    title: 'I Made a Short Film Using ONLY AI Tools',
    views: 95_000, duration: 'PT10M18S', expect: 'PASS',
    note: 'AI filmmaking content — LEGITIMATE, should not be blocked by "film"',
  },
  {
    title: 'Best AI Video Generator for Filmmakers in 2024',
    views: 72_000, duration: 'PT9M30S', expect: 'PASS',
    note: 'AI filmmaking tools review — LEGITIMATE, should not be blocked by "film"',
  },
  {
    title: 'I Generated an Entire Movie Trailer with AI in 10 Minutes',
    views: 64_000, duration: 'PT8M15S', expect: 'PASS',
    note: 'AI video tools — LEGITIMATE, should not be blocked by "movie" or "trailer"',
  },
  {
    title: 'Building an AI Game with GPT-4 Codex (Full Tutorial)',
    views: 58_000, duration: 'PT22M10S', expect: 'PASS',
    note: 'AI game dev — LEGITIMATE, should not be blocked',
  },
  {
    title: 'Claude AI Just Changed Everything — My Full Workflow',
    views: 44_000, duration: 'PT11M00S', expect: 'PASS',
    note: 'General AI content — should appear',
  },
  {
    title: 'My AI Podcast Workflow (Episode-by-Episode Breakdown)',
    views: 38_000, duration: 'PT16M40S', expect: 'PASS',
    note: 'Creator workflow — LEGITIMATE, should not be blocked by "episode"',
  },
  {
    title: 'I Replaced My Entire Content Season with AI Tools',
    views: 22_000, duration: 'PT13M00S', expect: 'PASS',
    note: 'AI productivity — LEGITIMATE, should not be blocked by "season"',
  },
  {
    title: 'Runway vs Sora vs Pika: AI Video Battle',
    views: 19_000, duration: 'PT15M00S', expect: 'PASS',
    note: 'AI video tools comparison — should appear',
  },
  {
    title: 'I Tested AI Music Generators for 30 Days',
    views: 16_000, duration: 'PT11M30S', expect: 'PASS',
    note: 'AI music tools — "music" removed from keywords so should PASS',
  },

  // ── Should FAIL — slop / off-topic ──────────────────────────────────────────
  {
    title: 'this random video would pull the lever without hesitation #memes #ai #grox #chatgpt',
    views: 2_100_000, duration: 'PT1M28S', expect: 'FAIL',
    note: 'Hashtag slop — exact video user complained about',
  },
  {
    title: 'AI Tutorial #shorts #ai #chatgpt',
    views: 500_000, duration: 'PT45S', expect: 'FAIL',
    note: 'YouTube Short with hashtag spam',
  },
  {
    title: 'ChatGPT kaise use kare (हिंदी में)',
    views: 800_000, duration: 'PT12M00S', expect: 'FAIL',
    note: 'Devanagari script in title — Hindi tutorial',
  },
  {
    title: 'AI Tutorial in Hindi 2024 - ChatGPT सीखें',
    views: 600_000, duration: 'PT10M00S', expect: 'FAIL',
    note: 'Mixed Hindi/English title with Devanagari',
  },
  {
    title: 'كيفية استخدام ChatGPT بالعربي',
    views: 400_000, duration: 'PT8M00S', expect: 'FAIL',
    note: 'Arabic-script title',
  },
  {
    title: 'ChatGPT Tutorial',
    views: 3_200, duration: 'PT7M00S', expect: 'FAIL',
    note: 'Below 5k view threshold',
  },
  {
    title: 'Best AI Songs 2024 - Official Music Video Compilation',
    views: 900_000, duration: 'PT4M00S', expect: 'FAIL',
    note: 'Pure music content — "official music video" phrase',
  },
  {
    title: 'Grok AI Explained #ai #tech',
    views: 50_000, duration: 'PT45S', expect: 'FAIL',
    note: 'YouTube Short (45s)',
  },
  {
    title: 'ChatGPT se paisa kaise kamaye',
    views: 250_000, duration: 'PT9M00S', lang: 'hi', expect: 'FAIL',
    note: 'Hindi language tag set',
  },
];

// ─── Run & report ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0, wrongPass = 0, wrongFail = 0;

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  YouTube Quality Filter — Test Results');
console.log('══════════════════════════════════════════════════════════════════\n');

for (const tc of cases) {
  const reason = filterReason(tc);
  const actual = reason === null ? 'PASS' : 'FAIL';
  const ok = actual === tc.expect;

  if (ok) {
    if (actual === 'PASS') passed++; else failed++;
    console.log(`  ✅ ${actual.padEnd(4)} — ${tc.title.slice(0, 60)}`);
    if (reason) console.log(`         reason: ${reason}`);
  } else {
    if (actual === 'PASS') wrongPass++; else wrongFail++;
    console.log(`  ❌ GOT ${actual} (expected ${tc.expect}) — ${tc.title.slice(0, 60)}`);
    if (reason) console.log(`         reason: ${reason}`);
    console.log(`         note:   ${tc.note}`);
  }
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  ${passed + failed}/${cases.length} correct  |  `
  + `${wrongPass} false-positives (slop let through)  |  `
  + `${wrongFail} false-negatives (good content blocked)`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (wrongPass + wrongFail > 0) {
  process.exit(1);
}
