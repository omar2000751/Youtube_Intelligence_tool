'use client';

import { ExternalLink, Youtube, Zap, X, TrendingUp, MessageSquare, Eye } from 'lucide-react';
import Image from 'next/image';
import { Trend } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import { velocityLabel } from '@/lib/velocity';

interface TrendDetailProps {
  trend: Trend;
  onGenerateBrief: () => void;
  isGenerating: boolean;
  onClose: () => void;
}

function scoreStyle(score: number) {
  if (score >= 85) return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', label: 'Viral' };
  if (score >= 65) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', label: 'Hot' };
  if (score >= 45) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', label: 'Rising' };
  if (score >= 25) return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/25', label: 'Steady' };
  return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/25', label: 'Low' };
}

export function TrendDetail({ trend, onGenerateBrief, isGenerating, onClose }: TrendDetailProps) {
  const oppStyle = scoreStyle(trend.opportunity_score);
  const videos = trend.related_videos ?? [];

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-start gap-3">
          {/* Left: badge + topic */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                <Youtube className="h-2.5 w-2.5" />
                YouTube Trend
              </span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(trend.detected_at)}</span>
            </div>
            <h2 className="text-lg font-bold leading-snug line-clamp-3">{trend.topic}</h2>
          </div>

          {/* Right: score + close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={cn(
              'flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 font-black text-2xl',
              oppStyle.text, oppStyle.bg, oppStyle.border
            )}>
              <span>{trend.opportunity_score}</span>
              <span className="text-[9px] font-medium opacity-60 -mt-0.5">{oppStyle.label}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Opportunity: <strong className={oppStyle.text}>{trend.opportunity_score}/100</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            Momentum: <strong className="text-foreground">{trend.momentum_score}/100</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-red-400" />
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Video list */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-3">
          {videos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No related videos found.</p>
          )}

          {videos.map((video, idx) => {
            const { label, color } = velocityLabel(video.velocity_score);
            return (
              <div
                key={video.id}
                className="rounded-lg border border-border bg-background/40 overflow-hidden"
              >
                {/* Video header row */}
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  {video.thumbnail_url && (
                    <div className="relative w-28 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute bottom-1 left-1 text-[10px] font-bold bg-black/70 text-white rounded px-1">
                        #{idx + 1}
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-2 mb-1">{video.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{video.channel_name}</span>
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-3 w-3" />
                        {formatNumber(video.view_count)}
                      </span>
                      <span className={cn('font-semibold', color)}>
                        {label} ({video.velocity_score})
                      </span>
                    </div>
                    {video.core_topic && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic truncate">
                        {video.core_topic}
                      </p>
                    )}
                  </div>

                  {/* External link */}
                  <a
                    href={`https://youtube.com/watch?v=${video.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 self-start text-muted-foreground hover:text-primary transition-colors mt-0.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Comment requests (if any) */}
                {video.comment_requests && video.comment_requests.length > 0 && (
                  <div className="border-t border-border/50 px-3 py-2 space-y-1.5 bg-muted/20">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" />
                      Audience asking for
                    </p>
                    {video.comment_requests.slice(0, 2).map((req, i) => (
                      <p key={i} className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5 border border-border/50">
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

      {/* CTA */}
      <div className="px-5 py-4 border-t border-border flex-shrink-0">
        <Button
          className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(77,101,255,0.25)]"
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
              Generate Video Brief
            </span>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          AI-powered title ideas, hook, outline &amp; thumbnail concept
        </p>
      </div>
    </div>
  );
}
