'use client';

import { TrendingUp, Youtube, Play, Zap } from 'lucide-react';
import Image from 'next/image';
import { Trend } from '@/types';
import { Button } from '@/components/ui/button';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';

interface TrendCardProps {
  trend: Trend;
  rank: number;
  isSelected?: boolean;
  onClick: () => void;
  onGenerateBrief: () => void;
  isGenerating?: boolean;
}

function scoreStyle(score: number) {
  if (score >= 85) return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', label: 'Viral' };
  if (score >= 65) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', label: 'Hot' };
  if (score >= 45) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', label: 'Rising' };
  if (score >= 25) return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/25', label: 'Steady' };
  return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/25', label: 'Low' };
}

export function TrendCard({
  trend,
  rank,
  isSelected,
  onClick,
  onGenerateBrief,
  isGenerating,
}: TrendCardProps) {
  const style = scoreStyle(trend.opportunity_score);
  const firstVideo = trend.related_videos?.[0];
  const videoCount = trend.related_videos?.length ?? 0;

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-xl border bg-card card-electric-hover p-0 overflow-hidden',
        isSelected ? 'border-primary/50 electric-glow' : 'border-border'
      )}
      onClick={onClick}
    >
      <div className="flex">
        {/* Thumbnail strip */}
        <div className="relative w-36 flex-shrink-0">
          {firstVideo?.thumbnail_url ? (
            <div className="relative h-full min-h-[7rem]">
              <Image
                src={firstVideo.thumbnail_url}
                alt={firstVideo.title}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Rank overlay */}
              <div className="absolute top-2 left-2 h-6 w-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center text-xs font-bold text-white">
                {rank}
              </div>
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-6 w-6 text-white drop-shadow" fill="white" />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[7rem] bg-muted flex items-center justify-center">
              <span className="text-3xl font-black text-muted-foreground/20">{rank}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
          {/* Top row: badge + score */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Source + meta */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  <Youtube className="h-2.5 w-2.5" />
                  YouTube
                </span>
                <span className="text-xs text-muted-foreground">
                  {videoCount} video{videoCount !== 1 ? 's' : ''} · {formatRelativeTime(trend.detected_at)}
                </span>
              </div>
              {/* Topic title */}
              <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground">
                {trend.topic}
              </h3>
            </div>

            {/* Score badge */}
            <div
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 font-black text-xl',
                style.text,
                style.bg,
                style.border
              )}
            >
              <span>{trend.opportunity_score}</span>
              <span className="text-[9px] font-medium opacity-60 -mt-0.5">{style.label}</span>
            </div>
          </div>

          {/* Related video titles */}
          {videoCount > 0 && (
            <div className="space-y-1">
              {trend.related_videos!.slice(0, 2).map((v) => (
                <div key={v.id} className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                  <TrendingUp className="h-2.5 w-2.5 text-primary/50 flex-shrink-0" />
                  <span className="truncate flex-1">{v.title}</span>
                  <span className="flex-shrink-0 text-muted-foreground/50 font-medium">
                    {formatNumber(v.view_count)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom row: momentum + brief button */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary/70" />
                <span>Momentum <strong className="text-foreground">{trend.momentum_score}</strong></span>
              </span>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs px-3 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 hover:border-primary/40 transition-all"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateBrief();
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate Brief'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
