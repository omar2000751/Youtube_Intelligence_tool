import { NextResponse } from 'next/server';
import { MOCK_NICHES, isMockMode } from '@/lib/mock-data';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

// GET /api/niches — list all niches
export async function GET() {
  if (isMockMode()) {
    return NextResponse.json({ data: MOCK_NICHES, error: null });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .order('name');

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

// POST /api/niches — create a new niche
export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, keywords, color } = body;

  if (!name || !keywords || !Array.isArray(keywords)) {
    return NextResponse.json(
      { data: null, error: 'name and keywords[] are required' },
      { status: 400 }
    );
  }

  if (isMockMode()) {
    const newNiche = {
      id: `niche-${Date.now()}`,
      name,
      description: description ?? null,
      keywords,
      color: color ?? '#6366f1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json({ data: newNiche, error: null }, { status: 201 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('niches')
      .insert({ name, description, keywords, color: color ?? '#6366f1' })
      .select()
      .single();

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
