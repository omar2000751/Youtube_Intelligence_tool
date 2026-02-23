'use client';

import { useState } from 'react';
import {
  Zap,
  TrendingUp,
  BookOpen,
  Flame,
  FlaskConical,
  BarChart3,
  ExternalLink,
  Eye,
} from 'lucide-react';
import Image from 'next/image';
import { Trend, TrendingVideo } from '@/types';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/lib/utils';
import { PILLAR_META, Pillar } from '@/lib/pillars';

// Lucide icon per pillar — no emojis
const PILLAR_ICONS: Record<Pillar, React.ElementType> = {
  Tutorials: BookOpen,
  Reactions: Flame,
  Experiments: FlaskConical,
  Other: BarChart3,
};

/**
 * Returns a velocity badge config based on the normalised 0-100 score.
 * Thresholds mirror velocityLabel() in velocity.ts.
 */
function velocityBadge(score: number): { label: string; className: string } | null {
  if (score >= 85) return { label: 'VIRAL',    className: 'bg-red-500/20 text-red-400 border border-red-500/30' };
  if (score >= 65) return { label: 'TRENDING', className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' };
  if (score >= 45) return { label: 'RISING',   className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
  return null;
}

// ─── Individual video card ────────────────────────────────────────────────────

interface VideoCardProps {
  video: TrendingVideo;
  rank: number;
}

function VideoCard({ video, rank }: VideoCardProps) {
  const badge = velocityBadge(video.velocity_score);

  return (
    <a
      href={`https://youtube.com/watch?v=${video.youtube_id}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex-shrink-0 w-[185px] rounded-xl overflow-hidden border border-border/60 bg-background/50 hover:border-white/20 hover:bg-background/70 transition-all duration-200 group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted/40">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 text-xs font-bold">
            #{rank}
          </div>
        )}

        {/* Velocity badge — top-left */}
        {badge && (
          <span
            className={cn(
              'absolute top-1.5 left-1.5 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full',
              badge.className
            )}
          >
            {badge.label}
          </span>
        )}

        {/* External link — top-right, appears on hover */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="flex items-center justify-center h-5 w-5 rounded bg-black/60">
            <ExternalLink className="h-2.5 w-2.5 text-white" />
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-2.5 space-y-1">
        <p className="text-xs font-medium line-clamp-2 leading-snug text-foreground/90">
          {video.title}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{video.channel_name}</p>
        <div className="flex items-center gap-1 pt-0.5">
          <Eye className="h-2.5 w-2.5 text-muted-foreground/50 flex-shrink-0" />
          <span className="text-xs font-bold text-foreground">{formatNumber(video.view_count)}</span>
          <span className="text-[10px] text-muted-foreground">views</span>
        </div>
      </div>
    </a>
  );
}

// ─── Pillar trend card ────────────────────────────────────────────────────────

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
  const PillarIcon = PILLAR_ICONS[pillar] ?? BarChart3;
  const [sortBy, setSortBy] = useState<'momentum' | 'views'>('momentum');

  const videos = [...(trend.related_videos ?? [])].sort((a, b) =>
    sortBy === 'momentum' ? b.velocity_score - a.velocity_score : b.view_count - a.view_count
  );

  const totalViews = videos.reduce((s, v) => s + v.view_count, 0);

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
          'px-4 py-3.5 flex items-center gap-3 border-b',
          meta.bgClass,
          meta.borderClass
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border',
            meta.bgClass,
            meta.borderClass
          )}
        >
          <PillarIcon className={cn('h-4 w-4', meta.textClass)} />
        </div>

        {/* Title + tagline */}
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-bold text-sm leading-tight', meta.textClass)}>
            {meta.displayName}
          </h3>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
            {meta.tagline}
          </p>
        </div>

        {/* Sort toggle */}
        {videos.length > 0 && (
          <div className="flex items-center rounded-lg overflow-hidden border border-border/60 flex-shrink-0 text-[10px]">
            <button
              className={cn(
                'px-2 py-1.5 transition-colors',
                sortBy === 'momentum'
                  ? 'bg-white/10 text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSortBy('momentum');
              }}
            >
              Momentum
            </button>
            <div className="h-4 w-px bg-border/60" />
            <button
              className={cn(
                'px-2 py-1.5 transition-colors',
                sortBy === 'views'
                  ? 'bg-white/10 text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSortBy('views');
              }}
            >
              Views
            </button>
          </div>
        )}

        {/* Generate Brief — primary accent CTA */}
        <Button
          size="sm"
          className="h-7 text-xs px-3 font-semibold text-white flex-shrink-0"
          style={{
            background: meta.accent,
            boxShadow: `0 0 16px ${meta.glowColor}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onGenerateBrief();
          }}
          disabled={isGenerating || videos.length === 0}
        >
          {isGenerating ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              Generate Brief
            </span>
          )}
        </Button>
      </div>

      {/* ── Aggregate stats row ── */}
      {videos.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-3 text-[11px] text-muted-foreground border-b border-border/40 bg-muted/10">
          <span className={cn('font-semibold', meta.textClass)}>
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </span>
          <span className="text-border/60">·</span>
          <span>
            <strong className="text-foreground">{formatNumber(totalViews)}</strong> total views
          </span>
          <span className="text-border/60">·</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5 text-green-500/70" />
            Momentum <strong className="text-foreground ml-0.5">{trend.momentum_score}</strong>
          </span>
        </div>
      )}

      {/* ── Video card carousel ── */}
      {videos.length > 0 ? (
        <div
          className="p-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2.5">
            {videos.map((video, i) => (
              <VideoCard key={video.id} video={video} rank={i + 1} />
            ))}
          </div>
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center bg-muted/10">
          <p className="text-xs text-muted-foreground italic">
            No {meta.displayName.toLowerCase()} found — refresh to scan
          </p>
        </div>
      )}
    </div>
  );
}
