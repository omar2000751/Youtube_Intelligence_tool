'use client';

import { useState } from 'react';
import { Plus, Tag, ChevronRight } from 'lucide-react';
import { Niche } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NicheSelectorProps {
  niches: Niche[];
  selectedNiche: Niche | null;
  onSelect: (niche: Niche) => void;
  onNicheCreated: (niche: Niche) => void;
}

const COLOR_OPTIONS = [
  '#6366f1', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

export function NicheSelector({
  niches,
  selectedNiche,
  onSelect,
  onNicheCreated,
}: NicheSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (!name.trim() || keywords.length === 0) {
      setError('Name and at least one keyword are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description, keywords, color: selectedColor }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to create niche');
      onNicheCreated(json.data);
      setDialogOpen(false);
      setName('');
      setDescription('');
      setKeywordsInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating niche');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Your Niches
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <div className="space-y-1">
        {niches.map((niche) => (
          <button
            key={niche.id}
            onClick={() => onSelect(niche)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left',
              selectedNiche?.id === niche.id
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: niche.color }}
            />
            <span className="flex-1 truncate font-medium">{niche.name}</span>
            {selectedNiche?.id === niche.id && (
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            )}
          </button>
        ))}

        {niches.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No niches yet.</p>
            <p>Create one to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Niche</DialogTitle>
            <DialogDescription>
              Define a content niche to track trending videos and opportunities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Niche Name</label>
              <Input
                placeholder="e.g. AI Tutorials"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Keywords</label>
              <Input
                placeholder="ai, machine learning, chatgpt, llm"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate with commas</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all',
                      selectedColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Niche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
