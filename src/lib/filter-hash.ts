/**
 * Deterministic fingerprint of the active filter configuration.
 *
 * Any change to NEGATIVE_TITLE_KEYWORDS, TUTORIAL_KEYWORDS,
 * REACTION_KEYWORDS, or EXPERIMENT_KEYWORDS produces a different hash.
 * The fetch route stores this hash with each successful refresh and
 * checks it on the next request — if it differs the 24-hour cache is
 * bypassed and a fresh YouTube fetch runs automatically.
 */
import { NEGATIVE_TITLE_KEYWORDS } from './youtube';
import { TUTORIAL_KEYWORDS, REACTION_KEYWORDS, EXPERIMENT_KEYWORDS } from './pillars';

export function computeFilterHash(): string {
  // Pipe-delimited section separators prevent cross-section hash collisions
  // (e.g. moving a keyword from one array to another changes the hash)
  const config = [
    ...NEGATIVE_TITLE_KEYWORDS,
    '|tutorial|',
    ...TUTORIAL_KEYWORDS,
    '|reaction|',
    ...REACTION_KEYWORDS,
    '|experiment|',
    ...EXPERIMENT_KEYWORDS,
  ].join('\n');

  // FNV-1a 32-bit — deterministic, no external dependencies
  let h = 2166136261 >>> 0;
  for (let i = 0; i < config.length; i++) {
    h = Math.imul(h ^ config.charCodeAt(i), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
