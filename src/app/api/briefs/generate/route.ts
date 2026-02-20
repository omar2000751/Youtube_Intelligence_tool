/**
 * POST /api/briefs/generate
 * Generates an AI-powered video brief for a trend/topic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MOCK_BRIEFS, MOCK_TRENDING_VIDEOS } from '@/lib/mock-data';
import { createAdminSupabaseClient } from '@/lib/supabase-server';
import { generateVideoBrief } from '@/lib/anthropic';
import { TrendingVideo } from '@/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, niche_id, trend_id, source_video_ids } = body;

  if (!topic || !niche_id) {
    return NextResponse.json(
      { data: null, error: 'topic and niche_id are required' },
      { status: 400 }
    );
  }

  // Mock mode — return first mock brief with topic override
  if (isMockMode()) {
    const mockBrief = {
      ...MOCK_BRIEFS[0],
      id: `brief-mock-${Date.now()}`,
      topic,
      niche_id,
      trend_id: trend_id ?? null,
      source_video_ids: source_video_ids ?? [],
      created_at: new Date().toISOString(),
    };
    return NextResponse.json({ data: mockBrief, error: null }, { status: 201 });
  }

  try {
    const supabase = createAdminSupabaseClient();

    // Fetch niche details
    const { data: niche } = await supabase
      .from('niches')
      .select('name')
      .eq('id', niche_id)
      .single();

    // Fetch related videos for context
    let relatedVideos: TrendingVideo[] = [];
    if (source_video_ids?.length > 0) {
      const { data: videos } = await supabase
        .from('trending_videos')
        .select('title, view_count, velocity_score, core_topic, comment_requests')
        .in('id', source_video_ids)
        .limit(5);
      relatedVideos = videos ?? [];
    } else {
      // Fall back to top videos in this niche
      const { data: videos } = await supabase
        .from('trending_videos')
        .select('title, view_count, velocity_score, core_topic, comment_requests')
        .eq('niche_id', niche_id)
        .order('velocity_score', { ascending: false })
        .limit(5);
      relatedVideos = videos ?? [];
    }

    // Collect all comment requests from related videos
    const commentRequests = relatedVideos
      .flatMap((v) => (v as TrendingVideo & { comment_requests?: string[] }).comment_requests ?? [])
      .filter(Boolean)
      .slice(0, 10);

    // Generate brief via Claude
    const brief = await generateVideoBrief({
      topic,
      nicheName: niche?.name ?? 'General',
      relatedVideos,
      commentRequests,
    });

    // Save to database
    const { data: savedBrief, error: saveError } = await supabase
      .from('video_briefs')
      .insert({
        topic,
        title_suggestions: brief.titleSuggestions,
        hook: brief.hook,
        outline: brief.outline,
        thumbnail_concept: brief.thumbnailConcept,
        tags: brief.tags,
        niche_id,
        trend_id: trend_id ?? null,
        source_video_ids: source_video_ids ?? [],
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({ data: savedBrief, error: null }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Brief generation error:', message);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
