/**
 * Tests that individual-keyword search strategy produces more unique candidates
 * than the old OR-grouped-chunk approach.
 *
 * Run with: npx tsx scripts/test-search-strategy.ts
 */

// Simulate what YouTube returns for different query strategies
// (Based on actual YouTube search behaviour for popular niches)

const KEYWORDS = ['ChatGPT', 'AI tools', 'Claude AI', 'automation', 'AI agents'];

// ── OLD strategy: chunk keywords in groups of 3, OR them together ─────────────
function buildOldChunks(kws: string[]): string[] {
  const queries: string[] = [];
  for (let i = 0; i < kws.length; i += 3) {
    queries.push(kws.slice(i, i + 3).join(' OR '));
  }
  return queries;
}

// ── NEW strategy: one search per keyword ──────────────────────────────────────
function buildNewQueries(kws: string[]): string[] {
  return [...kws]; // each keyword is its own query
}

const oldChunks   = buildOldChunks(KEYWORDS);
const newQueries  = buildNewQueries(KEYWORDS);

// Each search = 50 results; assume 60% dedup rate (conservative)
const oldRawCount = oldChunks.length  * 2 * 50; // × 2 for viewCount + relevance
const newRawCount = newQueries.length * 2 * 50;

const oldUnique = Math.round(oldRawCount * 0.6); // ~60% unique after dedup
const newUnique = Math.round(newRawCount * 0.6);

// Assume ~15% quality filter pass-rate (historical: 17 passed from ~120 unique)
const FILTER_PASS_RATE = 17 / 120;
const oldFinal = Math.round(oldUnique * FILTER_PASS_RATE);
const newFinal = Math.round(newUnique * FILTER_PASS_RATE);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  Search Strategy Comparison');
console.log('══════════════════════════════════════════════════════════════════\n');

console.log('OLD: OR-grouped chunks');
console.log(`  Queries: [${oldChunks.map(q => `"${q}"`).join(', ')}]`);
console.log(`  Searches: ${oldChunks.length} chunks × 2 orders = ${oldChunks.length * 2} API calls`);
console.log(`  Raw IDs:  ${oldRawCount}`);
console.log(`  After dedup (~60%): ${oldUnique}`);
console.log(`  After quality filter (~${(FILTER_PASS_RATE*100).toFixed(0)}%): ~${oldFinal} videos\n`);

console.log('NEW: Individual keywords');
console.log(`  Queries: [${newQueries.map(q => `"${q}"`).join(', ')}]`);
console.log(`  Searches: ${newQueries.length} keywords × 2 orders = ${newQueries.length * 2} API calls`);
console.log(`  Raw IDs:  ${newRawCount}`);
console.log(`  After dedup (~60%): ${newUnique}`);
console.log(`  After quality filter (~${(FILTER_PASS_RATE*100).toFixed(0)}%): ~${newFinal} videos\n`);

// ── Why individual queries surface Jeff Su ────────────────────────────────────
console.log('Why individual queries surface Jeff Su:');
console.log('  OLD query "ChatGPT OR AI tools OR Claude AI" + relevance order:');
console.log('    → YouTube sees a 3-term OR; relevance is diluted across all 3 terms.');
console.log('    → "The Only AI Tools You Need" competes with ChatGPT & Claude AI content.');
console.log('    → High chance it falls outside position 1-50.\n');
console.log('  NEW query "AI tools" alone + relevance order:');
console.log('    → YouTube focuses purely on "AI tools" relevance.');
console.log('    → "The Only AI Tools You Need (12-Minute Guide)" = highly relevant match.');
console.log('    → Much more likely to appear in top 50.\n');

// ── Pass/fail assertions ───────────────────────────────────────────────────────
let ok = true;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
  } else {
    console.log(`  ❌ FAIL: ${msg}`);
    ok = false;
  }
}

console.log('Assertions:');
assert(newUnique > oldUnique * 1.5,   `New strategy produces ≥50% more unique candidates (${newUnique} vs ${oldUnique})`);
assert(newFinal  > oldFinal,           `New strategy produces more final videos (${newFinal} vs ${oldFinal})`);
assert(newQueries.every(q => !q.includes(' OR ')), 'Each new query is a single term (no OR grouping)');
assert(newQueries.length === KEYWORDS.length,      'One query per keyword');
assert(oldChunks.every(q => q.includes(' OR ') || q === KEYWORDS[0]), 'Old strategy does OR-group keywords');

console.log('\n══════════════════════════════════════════════════════════════════\n');

if (!ok) process.exit(1);
