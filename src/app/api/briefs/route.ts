import { NextRequest, NextResponse } from 'next/server';
import { MOCK_BRIEFS, isMockMode } from '@/lib/mock-data';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

// GET /api/briefs?niche_id=xxx — list briefs for a niche
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
    const filtered = MOCK_BRIEFS.filter((b) => b.niche_id === nicheId);
    return NextResponse.json({ data: filtered, error: null });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('video_briefs')
      .select('*')
      .eq('niche_id', nicheId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
