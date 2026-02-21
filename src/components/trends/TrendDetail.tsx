'use client';

import { ExternalLink, Zap, X, TrendingUp, MessageSquare, Eye } from 'lucide-react';
import Image from 'next/image';
import { Trend } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import { velocityLabel } from '@/lib/velocity';
import { PILLAR_META, Pillar } from '@/lib/pillars';

interface TrendDetailProps {
  trend: Trend;
  onGenerateBrief: () => void;
  isGenerating: boolean;
  onClose: () => void;
}

export function TrendDetail({ trend, onGenerateBrief, isGenerating, onClose }: TrendDetailProps) {
  const pillar = trend.topic as Pillar;
  const meta = PILLAR_META[pillar] ?? PILLAR_META.Other;
  const videos = trend.related_videos ?? [];

  return (
    <div className="flex flex-col h-full bg-card">
      {/* ── Header ── */}
      <div
        className={cn('px-5 py-4 border-b flex-shrink-0', meta.bgClass, meta.borderClass)}
      >
        <div className="flex items-start gap-3">
          {/* Pillar identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl leading-none">{meta.emoji}</span>
              <h2 className={cn('text-xl font-bold', meta.textClass)}>{pillar}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{meta.tagline}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Refreshed {formatRelativeTime(trend.detected_at)}
            </p>
          </div>

          {/* Score badge + close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={cn(
                'flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 font-black text-2xl',
                meta.textClass,
                meta.bgClass,
                meta.borderClass
              )}
            >
              <span>{trend.opportunity_score}</span>
              <span className="text-[9px] font-medium opacity-60 -mt-0.5">score</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className={cn('h-3.5 w-3.5', meta.textClass)} />
            Opportunity:{' '}
            <strong className={meta.textClass}>{trend.opportunity_score}/100</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            Momentum: <strong className="text-foreground">{trend.momentum_score}/100</strong>
          </span>
          <span
            className={cn(
              'ml-auto font-semibold px-2 py-0.5 rounded-full border text-xs',
              meta.bgClass,
              meta.textClass,
              meta.borderClass
            )}
          >
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Video list ── */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-3">
          {videos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              No videos classified into this pillar yet. Try refreshing.
            </p>
          )}

          {videos.map((video, idx) => {
            const { label, color } = velocityLabel(video.velocity_score);
            return (
              <div
                key={video.id}
                className="rounded-lg border border-border overflow-hidden bg-background/40"
              >
                {/* Video row */}
                <div className="flex gap-3 p-3">
                  {video.thumbnail_url && (
                    <div className="relative w-28 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/70 text-white rounded px-1">
                        #{idx + 1}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-2 mb-1">{video.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{video.channel_name}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(video.view_count)}
                      </span>
                      <span className={cn('font-semibold', color)}>
                        {label} ({video.velocity_score})
                      </span>
                    </div>
                    {video.core_topic && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 italic truncate">
                        {video.core_topic}
                      </p>
                    )}
                  </div>

                  <a
                    href={`https://youtube.com/watch?v=${video.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'flex-shrink-0 self-start mt-0.5 transition-colors',
                      'text-muted-foreground hover:' + meta.textClass.replace('text-', '')
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Comment requests */}
                {video.comment_requests && video.comment_requests.length > 0 && (
                  <div className="border-t border-border/50 px-3 py-2 space-y-1.5 bg-muted/20">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" />
                      Audience is asking for
                    </p>
                    {video.comment_requests.slice(0, 2).map((req, i) => (
                      <p
                        key={i}
                        className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5 border border-border/50"
                      >
                        &ldquo;{req}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* ── CTA ── */}
      <div className="px-5 py-4 border-t border-border flex-shrink-0">
        <Button
          className="w-full h-11 font-semibold text-white"
          style={{
            background: meta.accent,
            boxShadow: `0 0 24px ${meta.glowColor}`,
          }}
          onClick={onGenerateBrief}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Brief...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Generate {pillar} Brief
            </span>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          AI-generated title ideas, hook, outline &amp; thumbnail concept
        </p>
      </div>
    </div>
  );
}
