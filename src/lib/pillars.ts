/**
 * Content pillar classification for YouTube videos.
 *
 * Maps video titles into three creator-focused pillars:
 * Tutorials · Reactions · Experiments
 * with a catch-all "Other" bucket.
 */

export type Pillar = 'Tutorials' | 'Reactions' | 'Experiments' | 'Other';

export const TUTORIAL_KEYWORDS = [
  'how to',
  'how i',       // "How I Study Machine Learning", "How I Use ChatGPT"
  'tutorial',
  'guide',
  'build',
  'automate',
  'step-by-step',
  'step by step',
  'workflow',
  'beginner',    // "Python for Beginners", "Beginner AI Guide"
  'learn',       // "Learn Machine Learning", "Learn Python"
  'course',      // "Free AI Course 2024"
  'crash course',
  'masterclass',
  'explained',   // "LLMs Explained", "Machine Learning Explained"
  'introduction',
  'getting started',
  'basics',
  'fundamentals',
  'complete guide',
];

export const REACTION_KEYWORDS = [
  'reacting',
  'reaction',
  'review',
  ' vs ',
  'first impression',
  'first look',
  'chatgpt vs',
  'gemini vs',
  'claude vs',
  'gpt-4 vs',
  'breakdown',   // "GPT-4o Breakdown: What Changed"
  'compared',    // "Top AI Models Compared"
  'comparison',
  'worth it',    // "Is Claude Pro Worth It?"
  'honest review',
  'ranked',
  'which is better',
];

export const EXPERIMENT_KEYWORDS = [
  'i tried',
  'testing',
  'experiment',
  'i built',
  'i made',      // "I Made an AI That..."
  'i created',
  'i asked',     // "I Asked ChatGPT to Write My Resume"
  'i replaced',  // "I Replaced My Team with AI"
  'i automated',
  'what happens if',
  'what if',
  'i tested',
  'we tested',
  'i used',
  'i spent',
  'challenge',   // "The 30-Day AI Challenge"
  'can ai',      // "Can AI Do This?"
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
  displayName: string; // human-readable label shown in UI (replaces raw Pillar key for display)
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
    displayName: 'Tutorials',
    tagline: 'How-to guides, step-by-step workflows & build tutorials',
    accent: '#4D65FF',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/25',
    glowColor: 'rgba(77,101,255,0.25)',
  },
  Reactions: {
    emoji: '🔥',
    displayName: 'Reviews & Reactions',
    tagline: 'Reviews, comparisons & first impressions',
    accent: '#f97316',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/25',
    glowColor: 'rgba(249,115,22,0.25)',
  },
  Experiments: {
    emoji: '🧪',
    displayName: 'Experiments',
    tagline: 'Testing new tools, building things & hands-on experiments',
    accent: '#a855f7',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/25',
    glowColor: 'rgba(168,85,247,0.25)',
  },
  Other: {
    emoji: '📺',
    displayName: 'Trending Now',
    tagline: 'High-momentum content that does not fit a single format',
    accent: '#94a3b8',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/25',
    glowColor: 'rgba(148,163,184,0.2)',
  },
};
