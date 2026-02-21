/**
 * Proves that null bytes (\u0000) in YouTube text fields cause the
 * "invalid input syntax for type json" PostgreSQL error via PostgREST.
 *
 * Run: npx tsx scripts/test-null-bytes.ts
 */

// The sanitiser we're adding to route.ts
const clean = (s: string | null | undefined): string | null =>
  s ? s.replace(/[\u0000\x01-\x08\x0b\x0c\x0e-\x1f]/g, '') : null;

type Row = {
  title: string;
  description: string | null;
  comment_requests: string[];
};

// Simulate what YouTube returns for some videos
const dirtyRows: Row[] = [
  {
    title: 'Normal clean title',
    description: 'A normal description without special chars',
    comment_requests: ['make a video about X'],
  },
  {
    title: 'Title with null byte\u0000hidden here',
    description: 'Description is fine',
    comment_requests: [],
  },
  {
    title: 'Clean title',
    description: 'Description with null byte\u0000embedded mid-text',
    comment_requests: [],
  },
  {
    title: 'Clean title 2',
    description: null,
    comment_requests: ['request with null\u0000byte'],
  },
];

function wouldFailPostgrest(rows: Row[]): string[] {
  const failures: string[] = [];
  for (const row of rows) {
    try {
      const json = JSON.stringify(row);
      // PostgreSQL JSON parser rejects \u0000 in strings
      if (json.includes('\\u0000') || json.includes('\u0000')) {
        failures.push(`"${row.title.slice(0, 40)}" — contains null byte`);
      }
    } catch {
      failures.push(`"${row.title.slice(0, 40)}" — JSON.stringify failed`);
    }
  }
  return failures;
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  Null-byte sanitisation test');
console.log('══════════════════════════════════════════════════════════════════\n');

// Before sanitisation
const failsBefore = wouldFailPostgrest(dirtyRows);
console.log(`Before clean(): ${failsBefore.length} row(s) would fail PostgREST insert:`);
failsBefore.forEach(f => console.log(`  ❌ ${f}`));

// After sanitisation
const cleanRows: Row[] = dirtyRows.map(r => ({
  title: clean(r.title) ?? '',
  description: clean(r.description),
  comment_requests: r.comment_requests.map(s => clean(s) ?? ''),
}));

const failsAfter = wouldFailPostgrest(cleanRows);
console.log(`\nAfter clean(): ${failsAfter.length} row(s) would fail PostgREST insert.`);
if (failsAfter.length === 0) {
  console.log('  ✅ All rows safe to insert\n');
}

// Verify clean() doesn't mangle legitimate content
const legitimate = [
  'How to Build AI Agents with Claude 3.5',
  'Jeff Su\'s "Complete" AI Tools Guide — 2024',
  'I Tested 50 AI Tools So You Don\'t Have To 🔥',
  'ChatGPT vs Claude: My Honest Take After 6 Months',
  'Why Runway ML Changed My Life (Full Review)',
];

console.log('Verify clean() preserves legitimate titles:');
let allOk = true;
for (const title of legitimate) {
  const result = clean(title);
  if (result !== title) {
    console.log(`  ❌ MANGLED: "${title}" → "${result}"`);
    allOk = false;
  } else {
    console.log(`  ✅ Preserved: "${title}"`);
  }
}

console.log('\n══════════════════════════════════════════════════════════════════');
const passed = failsBefore.length > 0 && failsAfter.length === 0 && allOk;
console.log(passed ? '  All assertions passed' : '  FAILED');
console.log('══════════════════════════════════════════════════════════════════\n');

if (!passed) process.exit(1);
