'use client';

import { TrendingUp, Youtube } from 'lucide-react';
import { Trend } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatRelativeTime, getScoreColor, getScoreBg } from '@/lib/utils';

interface TrendCardProps {
  trend: Trend;
  rank: number;
  onClick: () => void;
  onGenerateBrief: () => void;
  isGenerating?: boolean;
}

const SOURCE_ICONS = {
  youtube: <Youtube className="h-3 w-3" />,
};

const SOURCE_LABELS = {
  youtube: 'YouTube',
};

export function TrendCard({ trend, rank, onClick, onGenerateBrief, isGenerating }: TrendCardProps) {
  const scoreColor = getScoreColor(trend.opportunity_score);
  const scoreBg = getScoreBg(trend.opportunity_score);

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
            {rank}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Topic + source badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{trend.topic}</h3>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-red-500/20 text-red-400 border-red-500/30">
                {SOURCE_ICONS[trend.source]}
                {SOURCE_LABELS[trend.source]}
              </span>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Opportunity</span>
                  <span className={cn('font-bold', scoreColor)}>{trend.opportunity_score}</span>
                </div>
                <Progress
                  value={trend.opportunity_score}
                  className={cn('h-1.5', scoreBg)}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Momentum</span>
                  <span className="font-bold text-foreground">{trend.momentum_score}</span>
                </div>
                <Progress value={trend.momentum_score} className="h-1.5" />
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {(trend.related_videos?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Youtube className="h-3 w-3" />
                  {trend.related_videos!.length} video{trend.related_videos!.length > 1 ? 's' : ''}
                </span>
              )}
              <span>{formatRelativeTime(trend.detected_at)}</span>
            </div>

            {/* Related video titles (collapsed preview) */}
            {trend.related_videos && trend.related_videos.length > 0 && (
              <div className="space-y-1">
                {trend.related_videos.slice(0, 2).map((v) => (
                  <div
                    key={v.id}
                    className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 truncate"
                  >
                    <TrendingUp className="h-2.5 w-2.5 inline mr-1 text-green-500" />
                    {v.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Score pill + action */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div
              className={cn(
                'w-12 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-black',
                scoreBg,
                scoreColor
              )}
            >
              {trend.opportunity_score}
            </div>
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateBrief();
              }}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Brief'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
