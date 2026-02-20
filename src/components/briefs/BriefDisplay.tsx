'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, FileText, Lightbulb, Image as ImageIcon, Tag, BookOpen } from 'lucide-react';
import { VideoBrief } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface BriefDisplayProps {
  brief: VideoBrief;
  onClose?: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="text-muted-foreground hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function BriefDisplay({ brief, onClose }: BriefDisplayProps) {
  const [selectedTitle, setSelectedTitle] = useState(0);
  const [outlineExpanded, setOutlineExpanded] = useState(true);

  const fullBriefText = `TOPIC: ${brief.topic}

TITLE: ${brief.title_suggestions[selectedTitle]}

HOOK:
${brief.hook}

OUTLINE:
${brief.outline.map((p) => `${p.point}. ${p.heading}\n   ${p.notes}`).join('\n\n')}

THUMBNAIL CONCEPT:
${brief.thumbnail_concept}

TAGS:
${brief.tags.join(', ')}`;

  return (
    <div className="space-y-4">
      {/* Brief header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Video Brief</span>
          </div>
          <h3 className="font-bold text-lg">{brief.topic}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(fullBriefText)}
            className="text-xs gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy All
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Title Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Title Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {brief.title_suggestions.map((title, i) => (
            <button
              key={i}
              onClick={() => setSelectedTitle(i)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm',
                selectedTitle === i
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                  selectedTitle === i ? 'border-primary text-primary' : 'border-muted-foreground/40'
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1">{title}</span>
              <CopyButton text={title} />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Hook */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-red-500">⚡</span>
              Opening Hook
            </CardTitle>
            <CopyButton text={brief.hook} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground bg-muted/50 rounded-lg p-4 italic border-l-2 border-primary">
            "{brief.hook}"
          </p>
        </CardContent>
      </Card>

      {/* Outline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Video Outline
            </CardTitle>
            <div className="flex items-center gap-2">
              <CopyButton
                text={brief.outline.map((p) => `${p.point}. ${p.heading}\n   ${p.notes}`).join('\n\n')}
              />
              <button
                onClick={() => setOutlineExpanded(!outlineExpanded)}
                className="text-muted-foreground hover:text-foreground"
              >
                {outlineExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardHeader>
        {outlineExpanded && (
          <CardContent className="space-y-3">
            {brief.outline.map((point) => (
              <div key={point.point} className="flex gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {point.point}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{point.heading}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{point.notes}</p>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Thumbnail Concept */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-500" />
              Thumbnail Concept
            </CardTitle>
            <CopyButton text={brief.thumbnail_concept} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg p-4 border border-dashed">
            <p className="text-sm text-muted-foreground">{brief.thumbnail_concept}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-500" />
              Tags &amp; Keywords
            </CardTitle>
            <CopyButton text={brief.tags.join(', ')} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {brief.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
