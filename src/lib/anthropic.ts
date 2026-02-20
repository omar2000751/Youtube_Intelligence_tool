/**
 * Anthropic Claude integration
 * Powers AI analysis: topic extraction, angle generation, and video brief creation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { OutlinePoint, TrendingVideo } from '@/types';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

const MODEL = 'claude-opus-4-6';

// ============================================================
// TOPIC EXTRACTION
// ============================================================

/**
 * Extract the core topic from a video title + description.
 * Returns a concise topic string (e.g. "prompt engineering for beginners").
 */
export async function extractCoreTopic(params: {
  title: string;
  description: string;
}): Promise<string> {
  const client = getClient();
  const { title, description } = params;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Extract the core topic from this YouTube video in 3-8 words.
Return ONLY the topic phrase, nothing else.

Title: ${title}
Description: ${description.slice(0, 500)}`,
      },
    ],
  });

  const text = message.content[0];
  if (text.type !== 'text') return title;
  return text.text.trim().replace(/^["']|["']$/g, '');
}

// ============================================================
// VIDEO BRIEF GENERATION
// ============================================================

interface BriefInput {
  topic: string;
  nicheName: string;
  relatedVideos: Pick<TrendingVideo, 'title' | 'view_count' | 'velocity_score' | 'core_topic'>[];
  commentRequests?: string[]; // "can you make a video on X" patterns
}

interface GeneratedBrief {
  titleSuggestions: string[];
  hook: string;
  outline: OutlinePoint[];
  thumbnailConcept: string;
  tags: string[];
}

/**
 * Generate a full video brief using Claude.
 */
export async function generateVideoBrief(input: BriefInput): Promise<GeneratedBrief> {
  const client = getClient();
  const { topic, nicheName, relatedVideos, commentRequests } = input;

  const videoContext = relatedVideos
    .slice(0, 5)
    .map(
      (v) =>
        `- "${v.title}" (${(v.view_count / 1000).toFixed(0)}k views, velocity: ${v.velocity_score}/100)`
    )
    .join('\n');

  const requestsSection =
    commentRequests && commentRequests.length > 0
      ? `\nViewer comment requests on related videos:\n${commentRequests.map((r) => `- "${r}"`).join('\n')}`
      : '';

  const prompt = `You are an expert YouTube content strategist. Generate a complete video brief for the following trending topic.

Niche: ${nicheName}
Topic: ${topic}

Related high-velocity videos in this niche:
${videoContext}
${requestsSection}

Generate a video brief with:
1. 5 title suggestions (compelling, SEO-optimized, under 70 chars)
2. A powerful opening hook (first 15 seconds script, pattern interrupt style)
3. A 5-point video outline (heading + notes per point)
4. A thumbnail concept description (visual style, text overlay, emotion)
5. 10 relevant tags/keywords

IMPORTANT: Respond with ONLY valid JSON in this exact structure:
{
  "titleSuggestions": ["title1", "title2", "title3", "title4", "title5"],
  "hook": "Opening hook script here...",
  "outline": [
    {"point": 1, "heading": "Section title", "notes": "Key points to cover"},
    {"point": 2, "heading": "Section title", "notes": "Key points to cover"},
    {"point": 3, "heading": "Section title", "notes": "Key points to cover"},
    {"point": 4, "heading": "Section title", "notes": "Key points to cover"},
    {"point": 5, "heading": "Section title", "notes": "Key points to cover"}
  ],
  "thumbnailConcept": "Description of thumbnail visual",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0];
  if (text.type !== 'text') {
    throw new Error('Claude returned non-text response');
  }

  // Extract JSON from response (Claude sometimes wraps in markdown code blocks)
  const jsonMatch = text.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as GeneratedBrief;

  // Validate and normalize
  return {
    titleSuggestions: (parsed.titleSuggestions ?? []).slice(0, 5),
    hook: parsed.hook ?? '',
    outline: (parsed.outline ?? []).slice(0, 5),
    thumbnailConcept: parsed.thumbnailConcept ?? '',
    tags: (parsed.tags ?? []).slice(0, 10),
  };
}

// ============================================================
// TREND ANALYSIS
// ============================================================

/**
 * Given a list of video titles and topics, cluster them into trend topics.
 * Returns a ranked list of emerging themes.
 */
export async function identifyTrendTopics(params: {
  videos: Array<{ title: string; coreTopicHint?: string | null }>;
  nicheName: string;
}): Promise<Array<{ topic: string; confidence: number; videoCount: number }>> {
  const client = getClient();
  const { videos, nicheName } = params;

  const videoList = videos
    .slice(0, 30)
    .map((v, i) => `${i + 1}. ${v.coreTopicHint ?? v.title}`)
    .join('\n');

  const prompt = `You are analyzing trending YouTube content in the "${nicheName}" niche.

Here are recent high-velocity videos:
${videoList}

Identify 5-8 distinct trending TOPICS or THEMES across these videos.
Group similar videos together into themes.

Respond with ONLY valid JSON:
[
  {
    "topic": "concise topic name (3-6 words)",
    "confidence": 85,
    "videoCount": 3
  }
]

Where confidence is 0-100 based on how many videos share the theme.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0];
  if (text.type !== 'text') return [];

  const jsonMatch = text.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}
