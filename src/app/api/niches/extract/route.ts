import { NextResponse } from 'next/server';
import { extractNicheFromCreators } from '@/lib/anthropic';

// POST /api/niches/extract — extract niche info from a creator/content description
export async function POST(request: Request) {
  const body = await request.json();
  const { prompt } = body as { prompt?: string };

  if (!prompt || !prompt.trim()) {
    return NextResponse.json(
      { data: null, error: 'prompt is required' },
      { status: 400 }
    );
  }

  try {
    const niche = await extractNicheFromCreators(prompt.trim());
    return NextResponse.json({ data: niche, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to extract niche';
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
