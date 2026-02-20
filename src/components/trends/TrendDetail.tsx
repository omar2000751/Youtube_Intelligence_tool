'use client';

import { ExternalLink, Youtube, TrendingUp, MessageSquare, Zap, X } from 'lucide-react';
import Image from 'next/image';
import { Trend } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatNumber, formatRelativeTime, getScoreColor, getScoreBg } from '@/lib/utils';
import { velocityLabel } from '@/lib/velocity';

interface TrendDetailProps {
  trend: Trend;
  onGenerateBrief: () => void;
  isGenerating: boolean;
  onClose: () => void;
}

export function TrendDetail({ trend, onGenerateBrief, isGenerating, onClose }: TrendDetailProps) {
  const scoreColor = getScoreColor(trend.opportunity_score);
  const scoreBg = getScoreBg(trend.opportunity_score);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium bg-red-500/20 text-red-400 border-red-500/30">
              <Zap className="h-3 w-3" />
              YouTube Trend
            </span>
          </div>
          <h2 className="text-xl font-bold">{trend.topic}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detected {formatRelativeTime(trend.detected_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center',
              scoreBg,
              scoreColor
            )}
          >
            <span className="text-2xl font-black">{trend.opportunity_score}</span>
            <span className="text-[10px] font-medium opacity-70">score</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Score breakdown */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                YouTube Momentum
              </span>
              <span className="font-bold">{trend.momentum_score}/100</span>
            </div>
            <Progress value={trend.momentum_score} className="h-2" />
          </div>

          {/* Related Videos */}
          {trend.related_videos && trend.related_videos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                High-Velocity Videos
              </h3>

              <div className="space-y-3">
                {trend.related_videos.map((video) => {
                  const { label, color } = velocityLabel(video.velocity_score);
                  return (
                    <div key={video.id} className="flex gap-3 rounded-lg border p-3">
                      {video.thumbnail_url && (
                        <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                          <Image
                            src={video.thumbnail_url}
                            alt={video.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {video.channel_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatNumber(video.view_count)} views
                          </span>
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              color
                            )}
                          >
                            {label} ({video.velocity_score})
                          </span>
                        </div>
                        {video.core_topic && (
                          <p className="text-xs text-muted-foreground italic">
                            Topic: {video.core_topic}
                          </p>
                        )}

                        {/* Comment requests */}
                        {video.comment_requests && video.comment_requests.length > 0 && (
                          <div className="space-y-1 mt-1">
                            {video.comment_requests.slice(0, 2).map((req, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-xs bg-muted/50 rounded px-2 py-1"
                              >
                                <MessageSquare className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">"{req}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <a
                        href={`https://youtube.com/watch?v=${video.youtube_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </ScrollArea>

      {/* Generate Brief CTA */}
      <div className="p-6 border-t">
        <Button
          className="w-full"
          size="lg"
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
          AI-generated title ideas, hook, outline &amp; thumbnail concept
        </p>
      </div>
    </div>
  );
}
