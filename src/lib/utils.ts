import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function getScoreColor(score: number): string {
  if (score >= 85) return 'text-red-500';
  if (score >= 65) return 'text-orange-500';
  if (score >= 45) return 'text-yellow-500';
  if (score >= 25) return 'text-green-500';
  return 'text-slate-400';
}

export function getScoreBg(score: number): string {
  if (score >= 85) return 'bg-red-500/10 border-red-500/30';
  if (score >= 65) return 'bg-orange-500/10 border-orange-500/30';
  if (score >= 45) return 'bg-yellow-500/10 border-yellow-500/30';
  if (score >= 25) return 'bg-green-500/10 border-green-500/30';
  return 'bg-slate-500/10 border-slate-500/30';
}

export function getSourceBadgeStyle(source: string): string {
  if (source === 'youtube') return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

/**
 * Safely extract a human-readable error message from any value.
 * Prevents [object Object] from showing up in toast notifications.
 */
export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    // Handle {message: "..."} shaped objects (e.g. Supabase errors)
    if ('message' in err && typeof (err as Record<string, unknown>).message === 'string') {
      return (err as Record<string, unknown>).message as string;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return 'An unknown error occurred';
    }
  }
  return String(err ?? 'An unknown error occurred');
}
