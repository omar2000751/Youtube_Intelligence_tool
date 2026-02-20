'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  Zap,
  Youtube,
  Twitter,
  ChevronRight,
  BarChart3,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Niche, Trend, VideoBrief } from '@/types';
import { NicheSelector } from '@/components/dashboard/NicheSelector';
import { TrendCard } from '@/components/trends/TrendCard';
import { TrendDetail } from '@/components/trends/TrendDetail';
import { BriefDisplay } from '@/components/briefs/BriefDisplay';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type Panel = 'trend' | 'brief' | null;

export default function DashboardPage() {
  // State
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
        if (json.error) throw new Error(json.error);
        setNiches(json.data ?? []);
        // Auto-select first niche
        if (json.data?.length > 0) setSelectedNiche(json.data[0]);
      } catch (err) {
        toast.error('Failed to load niches');
      } finally {
        setLoadingNiches(false);
      }
    }
    loadNiches();
  }, []);

  // Load trends when niche changes
  const loadTrends = useCallback(async (nicheId: string) => {
    setLoadingTrends(true);
    setSelectedTrend(null);
    setActiveBrief(null);
    setActivePanel(null);
    try {
      const res = await fetch(`/api/trends?niche_id=${nicheId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTrends(json.data ?? []);
    } catch (err) {
      toast.error('Failed to load trends');
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNiche) loadTrends(selectedNiche.id);
  }, [selectedNiche, loadTrends]);

  // Refresh: trigger YouTube + Twitter fetch
  async function handleRefresh() {
    if (!selectedNiche) return;
    setRefreshing(true);
    const toastId = toast.loading('Fetching fresh data from YouTube & Twitter...');
    try {
      const res = await fetch('/api/trends/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche_id: selectedNiche.id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Fetch failed');
      toast.success(json.data.message, { id: toastId });
      await loadTrends(selectedNiche.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refresh failed', { id: toastId });
    } finally {
      setRefreshing(false);
    }
  }

  // Generate brief for a trend
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
      if (!res.ok || json.error) throw new Error(json.error ?? 'Generation failed');
      setActiveBrief(json.data);
      setActivePanel('brief');
      toast.success('Brief generated!', { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Brief generation failed', { id: toastId });
    } finally {
      setGeneratingBriefFor(null);
    }
  }

  function handleTrendClick(trend: Trend) {
    setSelectedTrend(trend);
    setActivePanel('trend');
  }

  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ===== Sidebar ===== */}
      <aside className="w-64 flex-shrink-0 border-r bg-card flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold">TrendIQ</h1>
              <p className="text-[10px] text-muted-foreground">YouTube Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="p-3 border-b">
          <nav className="space-y-1">
            {[
              { icon: BarChart3, label: 'Dashboard', active: true },
              { icon: FileText, label: 'My Briefs', active: false },
            ].map((item) => (
              <button
                key={item.label}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  item.active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Niche selector */}
        <ScrollArea className="flex-1 p-3">
          {loadingNiches ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
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

        {/* Mock mode indicator */}
        {isMockMode && (
          <div className="p-3 border-t">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
              <span className="text-xs text-yellow-500">Mock data mode</span>
            </div>
          </div>
        )}
      </aside>

      {/* ===== Main content ===== */}
      <main className="flex-1 flex overflow-hidden">
        {/* Trend list */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 border-b flex items-start justify-between flex-shrink-0">
            <div>
              {selectedNiche ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selectedNiche.color }}
                    />
                    <h2 className="text-xl font-bold">{selectedNiche.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {loadingTrends
                      ? 'Loading opportunities...'
                      : `${trends.length} trending opportunit${trends.length === 1 ? 'y' : 'ies'} detected`}
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
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            )}
          </div>

          {/* Stats bar */}
          {!loadingTrends && trends.length > 0 && (
            <div className="px-6 py-3 border-b flex items-center gap-6 text-sm flex-shrink-0">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>
                  <strong className="text-foreground">
                    {trends.filter((t) => t.source === 'combined').length}
                  </strong>{' '}
                  cross-platform
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>
                  <strong className="text-foreground">
                    {trends.filter((t) => t.opportunity_score >= 80).length}
                  </strong>{' '}
                  high opportunity
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Youtube className="h-4 w-4 text-red-500" />
                <span>
                  <strong className="text-foreground">
                    {trends.reduce((s, t) => s + (t.related_videos?.length ?? 0), 0)}
                  </strong>{' '}
                  tracked videos
                </span>
              </div>
            </div>
          )}

          {/* Trend list */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-3">
              {!selectedNiche && (
                <div className="text-center py-20 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Select a niche to see trending opportunities</p>
                </div>
              )}

              {selectedNiche && loadingTrends && (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-36 bg-muted/30 rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {selectedNiche && !loadingTrends && trends.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium mb-2">No trends yet for this niche</p>
                  <p className="text-sm mb-4">Click "Refresh Data" to fetch the latest from YouTube & Twitter</p>
                  <Button onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                    Fetch Trends Now
                  </Button>
                </div>
              )}

              {!loadingTrends &&
                trends.map((trend, i) => (
                  <TrendCard
                    key={trend.id}
                    trend={trend}
                    rank={i + 1}
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
          <div className="w-[460px] flex-shrink-0 border-l bg-card flex flex-col overflow-hidden">
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
                <div className="p-6">
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
