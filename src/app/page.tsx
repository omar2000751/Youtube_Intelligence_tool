'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Zap,
  BarChart3,
  Sparkles,
  AlertCircle,
  FileText,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Niche, Trend, VideoBrief } from '@/types';
import { PILLAR_META, Pillar } from '@/lib/pillars';
import { NicheSelector } from '@/components/dashboard/NicheSelector';
import { TrendCard } from '@/components/trends/TrendCard';
import { TrendDetail } from '@/components/trends/TrendDetail';
import { BriefDisplay } from '@/components/briefs/BriefDisplay';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatNumber, getErrorMessage } from '@/lib/utils';

type Panel = 'trend' | 'brief' | null;

export default function DashboardPage() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [activeBrief, setActiveBrief] = useState<VideoBrief | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>(null);

  const [loadingNiches, setLoadingNiches] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingBriefFor, setGeneratingBriefFor] = useState<string | null>(null);

  // Load niches
  useEffect(() => {
    async function loadNiches() {
      setLoadingNiches(true);
      try {
        const res = await fetch('/api/niches');
        const json = await res.json();
        if (json.error) throw new Error(getErrorMessage(json.error));
        setNiches(json.data ?? []);
        if (json.data?.length > 0) setSelectedNiche(json.data[0]);
      } catch (err) {
        toast.error(getErrorMessage(err) || 'Failed to load niches');
      } finally {
        setLoadingNiches(false);
      }
    }
    loadNiches();
  }, []);

  const loadTrends = useCallback(async (nicheId: string) => {
    setLoadingTrends(true);
    setSelectedTrend(null);
    setActiveBrief(null);
    setActivePanel(null);
    try {
      const res = await fetch(`/api/trends?niche_id=${nicheId}`);
      const json = await res.json();
      if (json.error) throw new Error(getErrorMessage(json.error));
      setTrends(json.data ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to load trends');
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNiche) loadTrends(selectedNiche.id);
  }, [selectedNiche, loadTrends]);

  async function handleRefresh() {
    if (!selectedNiche) return;
    setRefreshing(true);
    const toastId = toast.loading('Fetching fresh data from YouTube...');
    try {
      const res = await fetch('/api/trends/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche_id: selectedNiche.id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(getErrorMessage(json.error) || 'Fetch failed');
      toast.success(json.data.message, { id: toastId });
      await loadTrends(selectedNiche.id);
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Refresh failed', { id: toastId });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGenerateBrief(trend: Trend) {
    setGeneratingBriefFor(trend.id);
    const toastId = toast.loading('Claude is generating your video brief...');
    try {
      const res = await fetch('/api/briefs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: trend.topic,
          niche_id: trend.niche_id,
          trend_id: trend.id,
          source_video_ids: trend.related_video_ids,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(getErrorMessage(json.error) || 'Generation failed');
      setActiveBrief(json.data);
      setActivePanel('brief');
      toast.success('Brief generated!', { id: toastId });
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Brief generation failed', { id: toastId });
    } finally {
      setGeneratingBriefFor(null);
    }
  }

  function handleTrendClick(trend: Trend) {
    setSelectedTrend(trend);
    setActivePanel('trend');
  }

  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
  const trackedVideoCount = trends.reduce((s, t) => s + (t.related_videos?.length ?? 0), 0);
  const totalNicheViews = trends
    .flatMap((t) => t.related_videos ?? [])
    .reduce((s, v) => s + v.view_count, 0);
  const hottestTrend = trends.slice().sort((a, b) => b.momentum_score - a.momentum_score)[0];

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ===== Sidebar ===== */}
      <aside
        className="w-64 flex-shrink-0 border-r border-border flex flex-col"
        style={{ background: 'hsl(218, 48%, 9%)' }}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(77, 101, 255, 0.15)',
                border: '1px solid rgba(77, 101, 255, 0.3)',
                boxShadow: '0 0 16px rgba(77, 101, 255, 0.15)',
              }}
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight gradient-text">TrendIQ</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">YouTube Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div className="px-3 py-3 border-b border-border">
          <nav className="space-y-0.5">
            {[
              { icon: BarChart3, label: 'Dashboard', active: true },
              { icon: FileText, label: 'My Briefs', active: false },
            ].map((item) => (
              <button
                key={item.label}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  item.active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Niche selector */}
        <ScrollArea className="flex-1 px-3 py-3">
          {loadingNiches ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 bg-muted/30 rounded-lg shimmer" />
              ))}
            </div>
          ) : (
            <NicheSelector
              niches={niches}
              selectedNiche={selectedNiche}
              onSelect={setSelectedNiche}
              onNicheCreated={(niche) => {
                setNiches((prev) => [...prev, niche]);
                setSelectedNiche(niche);
              }}
            />
          )}
        </ScrollArea>

        {/* Mock mode alert */}
        {isMockMode && (
          <div className="px-3 py-3 border-t border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
              <span className="text-xs text-yellow-500 font-medium">Mock data mode</span>
            </div>
          </div>
        )}
      </aside>

      {/* ===== Main content ===== */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sandcastles-style radial blue glow from top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(77, 101, 255, 0.12) 0%, transparent 70%)',
          }}
        />

        {/* Trend list panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-start justify-between flex-shrink-0">
            <div>
              {selectedNiche ? (
                <>
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background"
                      style={{ backgroundColor: selectedNiche.color }}
                    />
                    <h2 className="text-xl font-bold">{selectedNiche.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground pl-5">
                    {loadingTrends
                      ? 'Classifying videos into content pillars...'
                      : trends.length > 0
                        ? `${formatNumber(totalNicheViews)} total views · ${trackedVideoCount} videos across ${trends.length} pillar${trends.length !== 1 ? 's' : ''}`
                        : 'No data yet — hit Refresh to scan YouTube'}
                  </p>
                </>
              ) : (
                <h2 className="text-xl font-bold text-muted-foreground">Select a niche</h2>
              )}
            </div>

            {selectedNiche && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loadingTrends}
                className="gap-2 border-border hover:border-primary/40 hover:text-primary transition-colors"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            )}
          </div>

          {/* Stats strip — niche-level aggregate metrics */}
          {!loadingTrends && trends.length > 0 && (
            <div className="px-6 py-2.5 border-b border-border flex items-center gap-4 flex-shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                <Eye className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{formatNumber(totalNicheViews)}</strong>{' '}
                  total niche views
                </span>
              </div>
              {hottestTrend && (
                <>
                  <div className="h-3.5 w-px bg-border flex-shrink-0" />
                  <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                    <TrendingUp className="h-3 w-3 text-green-500/70" />
                    <span className="text-muted-foreground">
                      Hottest format:{' '}
                      <strong className="text-foreground">
                        {PILLAR_META[hottestTrend.topic as Pillar]?.displayName ?? hottestTrend.topic}
                      </strong>
                    </span>
                  </div>
                </>
              )}
              <div className="h-3.5 w-px bg-border flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                <Zap className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{trackedVideoCount}</strong> videos tracked
                </span>
              </div>
            </div>
          )}

          {/* Trend list */}
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-3">

              {/* Empty: no niche selected */}
              {!selectedNiche && (
                <div className="text-center py-24 text-muted-foreground">
                  <div
                    className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(77, 101, 255, 0.1)', border: '1px solid rgba(77, 101, 255, 0.2)' }}
                  >
                    <TrendingUp className="h-7 w-7 text-primary/60" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">Select a niche to begin</p>
                  <p className="text-sm">Choose from your niches in the sidebar</p>
                </div>
              )}

              {/* Loading skeletons */}
              {selectedNiche && loadingTrends && (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 rounded-xl border border-border bg-card shimmer" />
                  ))}
                </div>
              )}

              {/* Empty: no trends yet */}
              {selectedNiche && !loadingTrends && trends.length === 0 && (
                <div className="text-center py-24 text-muted-foreground">
                  <div
                    className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(77, 101, 255, 0.1)', border: '1px solid rgba(77, 101, 255, 0.2)' }}
                  >
                    <RefreshCw className="h-7 w-7 text-primary/60" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">No trends yet</p>
                  <p className="text-sm mb-5">Fetch the latest trending videos from YouTube</p>
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-2 bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(77,101,255,0.2)]"
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    Fetch Trends Now
                  </Button>
                </div>
              )}

              {/* Trend cards */}
              {!loadingTrends &&
                trends.map((trend, i) => (
                  <TrendCard
                    key={trend.id}
                    trend={trend}
                    rank={i + 1}
                    isSelected={selectedTrend?.id === trend.id}
                    onClick={() => handleTrendClick(trend)}
                    onGenerateBrief={() => handleGenerateBrief(trend)}
                    isGenerating={generatingBriefFor === trend.id}
                  />
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* ===== Right panel: Trend detail or Brief ===== */}
        {activePanel && (
          <div
            className="w-[460px] flex-shrink-0 border-l border-border flex flex-col overflow-hidden"
            style={{ background: 'hsl(218, 48%, 9%)' }}
          >
            {activePanel === 'trend' && selectedTrend && (
              <TrendDetail
                trend={selectedTrend}
                onGenerateBrief={() => handleGenerateBrief(selectedTrend)}
                isGenerating={generatingBriefFor === selectedTrend.id}
                onClose={() => setActivePanel(null)}
              />
            )}

            {activePanel === 'brief' && activeBrief && (
              <ScrollArea className="flex-1">
                <div className="p-5">
                  <BriefDisplay
                    brief={activeBrief}
                    onClose={() => setActivePanel(null)}
                  />
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
