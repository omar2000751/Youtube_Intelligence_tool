'use client';

import { TrendingUp, Zap } from 'lucide-react';
import Image from 'next/image';
import { Trend } from '@/types';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/lib/utils';
import { PILLAR_META, Pillar } from '@/lib/pillars';

interface TrendCardProps {
  trend: Trend;
  rank: number;
  isSelected?: boolean;
  onClick: () => void;
  onGenerateBrief: () => void;
  isGenerating?: boolean;
}

export function TrendCard({
  trend,
  rank,
  isSelected,
  onClick,
  onGenerateBrief,
  isGenerating,
}: TrendCardProps) {
  const pillar = trend.topic as Pillar;
  const meta = PILLAR_META[pillar] ?? PILLAR_META.Other;
  const videos = trend.related_videos ?? [];
  const thumbVideos = videos.slice(0, 3);

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-xl border bg-card overflow-hidden transition-all duration-200',
        isSelected ? meta.borderClass : 'border-border hover:border-white/15'
      )}
      style={
        isSelected
          ? { boxShadow: `0 0 0 1px ${meta.glowColor}, 0 8px 32px ${meta.glowColor}` }
          : undefined
      }
      onClick={onClick}
    >
      {/* ── Pillar header ── */}
      <div
        className={cn(
          'px-4 py-3 flex items-center justify-between border-b',
          meta.bgClass,
          meta.borderClass
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" role="img" aria-label={pillar}>
            {meta.emoji}
          </span>
          <div>
            <h3 className={cn('font-bold text-base leading-tight', meta.textClass)}>
              {pillar}
            </h3>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{meta.tagline}</p>
          </div>
        </div>
        <span
          className={cn(
            'text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0',
            meta.bgClass,
            meta.textClass,
            meta.borderClass
          )}
        >
          {videos.length} video{videos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Thumbnail mosaic (3-column grid) ── */}
      {thumbVideos.length > 0 ? (
        <div className="grid grid-cols-3 gap-px bg-border/30">
          {[0, 1, 2].map((i) => {
            const v = thumbVideos[i];
            return (
              <div key={i} className="relative aspect-video overflow-hidden bg-muted/40">
                {v?.thumbnail_url ? (
                  <>
                    <Image
                      src={v.thumbnail_url}
                      alt={v.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    {/* Rank badge on first thumb */}
                    {i === 0 && (
                      <div className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-black/70 text-white rounded px-1.5 py-0.5">
                        #{rank}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-muted-foreground/20 text-xs font-bold">#{i + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center bg-muted/20">
          <p className="text-xs text-muted-foreground italic">
            No {pillar.toLowerCase()} found — refresh to scan
          </p>
        </div>
      )}

      {/* ── Video title list ── */}
      <div className="px-4 py-3 space-y-1.5">
        {videos.slice(0, 3).map((v) => (
          <div key={v.id} className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <TrendingUp className={cn('h-3 w-3 flex-shrink-0', meta.textClass)} />
            <span className="truncate flex-1 text-foreground/80">{v.title}</span>
            <span className="flex-shrink-0 tabular-nums text-muted-foreground/60">
              {formatNumber(v.view_count)}
            </span>
          </div>
        ))}
        {videos.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No videos classified yet — try refreshing
          </p>
        )}
      </div>

      {/* ── Footer: scores + brief button ── */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className={cn('h-3 w-3', meta.textClass)} />
            <span>
              Avg score:{' '}
              <strong className={meta.textClass}>{trend.opportunity_score}</strong>
            </span>
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span>
              Momentum: <strong className="text-foreground">{trend.momentum_score}</strong>
            </span>
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className={cn(
            'h-7 text-xs px-3 border font-medium transition-all',
            meta.bgClass,
            meta.textClass,
            meta.borderClass,
            'hover:opacity-90'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onGenerateBrief();
          }}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 border-2 border-current/30 border-t-current rounded-full animate-spin"
                style={{ borderTopColor: meta.accent }}
              />
              Generating...
            </span>
          ) : (
            'Generate Brief'
          )}
        </Button>
      </div>
    </div>
  );
}
