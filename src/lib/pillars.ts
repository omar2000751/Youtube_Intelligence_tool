/**
 * Content pillar classification for YouTube videos.
 *
 * Maps video titles into three creator-focused pillars:
 * Tutorials · Reactions · Experiments
 * with a catch-all "Other" bucket.
 */

export type Pillar = 'Tutorials' | 'Reactions' | 'Experiments' | 'Other';

const TUTORIAL_KEYWORDS = [
  'how to',
  'tutorial',
  'guide',
  'build',
  'automate',
  'step-by-step',
  'step by step',
  'workflow',
];

const REACTION_KEYWORDS = [
  'reacting',
  'review',
  ' vs ',
  'first impression',
  'first look',
  'chatgpt vs',
  'gemini vs',
  'claude vs',
  'gpt-4 vs',
];

const EXPERIMENT_KEYWORDS = [
  'i tried',
  'testing',
  'experiment',
  'i built',
  'what happens if',
  'what if',
  'i tested',
  'we tested',
  'i used',
  'i spent',
];

export function classifyVideoToPillar(title: string): Pillar {
  const t = title.toLowerCase();
  if (TUTORIAL_KEYWORDS.some((k) => t.includes(k))) return 'Tutorials';
  if (REACTION_KEYWORDS.some((k) => t.includes(k))) return 'Reactions';
  if (EXPERIMENT_KEYWORDS.some((k) => t.includes(k))) return 'Experiments';
  return 'Other';
}

export const ALL_PILLARS: Pillar[] = ['Tutorials', 'Reactions', 'Experiments', 'Other'];

export interface PillarMeta {
  emoji: string;
  tagline: string;
  accent: string;      // hex for inline styles
  textClass: string;   // tailwind text
  bgClass: string;     // tailwind bg
  borderClass: string; // tailwind border
  glowColor: string;   // rgba for box-shadow
}

export const PILLAR_META: Record<Pillar, PillarMeta> = {
  Tutorials: {
    emoji: '🎓',
    tagline: 'How-to guides, step-by-step workflows & build tutorials',
    accent: '#4D65FF',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/25',
    glowColor: 'rgba(77,101,255,0.25)',
  },
  Reactions: {
    emoji: '🔥',
    tagline: 'Reviews, comparisons & first impressions',
    accent: '#f97316',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/25',
    glowColor: 'rgba(249,115,22,0.25)',
  },
  Experiments: {
    emoji: '🧪',
    tagline: 'Testing new tools, building things & experiments',
    accent: '#a855f7',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/25',
    glowColor: 'rgba(168,85,247,0.25)',
  },
  Other: {
    emoji: '📺',
    tagline: 'General AI & automation content',
    accent: '#94a3b8',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/25',
    glowColor: 'rgba(148,163,184,0.2)',
  },
};
