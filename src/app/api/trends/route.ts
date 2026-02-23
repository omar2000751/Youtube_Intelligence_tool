import { NextRequest, NextResponse } from 'next/server';
import { MOCK_TRENDS, isMockMode } from '@/lib/mock-data';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

// GET /api/trends?niche_id=xxx — list trends for a niche
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nicheId = searchParams.get('niche_id');

  if (!nicheId) {
    return NextResponse.json(
      { data: null, error: 'niche_id query param is required' },
      { status: 400 }
    );
  }

  if (isMockMode()) {
    const filtered = MOCK_TRENDS.filter((t) => t.niche_id === nicheId);
    return NextResponse.json({ data: filtered, error: null });
  }

  try {
    const supabase = createAdminSupabaseClient();

    // Fetch trends with related videos joined
    const { data: trends, error } = await supabase
      .from('trends')
      .select('*')
      .eq('niche_id', nicheId)
      .gt('expires_at', new Date().toISOString())
      .order('opportunity_score', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });

    // Enrich with related videos
    const enriched = await Promise.all(
      (trends ?? []).map(async (trend: Record<string, unknown>) => {
        const ids = trend.related_video_ids as string[] | undefined;
        if (!ids?.length) return { ...trend, related_videos: [] };

        const { data: videos } = await supabase
          .from('trending_videos')
          .select('*')
          .in('id', ids)
          .order('velocity_score', { ascending: false })
          .limit(8);

        return { ...trend, related_videos: videos ?? [] };
      })
    );

    return NextResponse.json({ data: enriched, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
