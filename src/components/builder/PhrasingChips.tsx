// PhrasingChips.tsx
// Tap-to-insert AI phrasing chip row, rendered below each experience description textarea.
// Fetches bullet templates from the existing phrasing engine on mount.
// Chips are role-aware, limited to 3 visible at once, and support rotation via
// "Show different suggestions ↻". Inserted chips dim and are excluded from future sets.

import { useEffect, useRef, useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPhrasingChipsFn } from '@/lib/ai/phrasing-chips';
import type { ChipsResult } from '@/lib/ai/phrasing-chips';
import { CRUISE_ROLE_OPTIONS } from '@/lib/cruise-role-options';

const CHIPS_VISIBLE = 3;
const FETCH_TIMEOUT_MS = 5000;

interface Props {
  /** Global role slug from ResumeData.targetRoleSlug */
  roleSlug?: string;
  /** Per-entry job title — used as secondary signal when no global slug is set */
  jobTitle?: string;
  /** Called when the user taps a chip. Parent appends text to the textarea. */
  onInsert: (text: string) => void;
}

type Status = 'loading' | 'ready' | 'hidden';

function getRoleLabel(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return CRUISE_ROLE_OPTIONS.find((r) => r.slug === slug)?.label;
}

export function PhrasingChips({ roleSlug, jobTitle, onInsert }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [pool, setPool] = useState<string[]>([]);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  /** Set of chip texts that have been inserted — excluded from future displays. */
  const [insertedTexts, setInsertedTexts] = useState<Set<string>>(new Set());
  /** Chips currently in view that have just been inserted — shown dimmed until next rotation. */
  const [dimmedTexts, setDimmedTexts] = useState<Set<string>>(new Set());

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const controller = { aborted: false };
    const timeoutId = setTimeout(() => {
      controller.aborted = true;
      setStatus('hidden');
    }, FETCH_TIMEOUT_MS);

    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: ChipsResult = await getPhrasingChipsFn({ data: { roleSlug, jobTitle } } as any);
        if (controller.aborted) return;
        clearTimeout(timeoutId);
        if (result.chips.length === 0) {
          setStatus('hidden');
          return;
        }
        setPool(result.chips);
        // Prefer the human-readable label from cruise-role-options over the family label
        setRoleLabel(getRoleLabel(roleSlug) ?? result.roleLabel);
        setStatus('ready');
      } catch {
        if (!controller.aborted) {
          clearTimeout(timeoutId);
          setStatus('hidden');
        }
      }
    })();

    return () => {
      clearTimeout(timeoutId);
      controller.aborted = true;
    };
    // Fetch once on mount only — role context doesn't change within a session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'hidden') return null;

  // ── Chip rotation logic ──────────────────────────────────────────────────────
  // available = pool minus already-inserted chips
  const available = pool.filter((c) => !insertedTexts.has(c));
  const rotated =
    available.length === 0
      ? []
      : [
          ...available.slice(offset % available.length),
          ...available.slice(0, offset % available.length),
        ].slice(0, CHIPS_VISIBLE);

  const canRotate = available.length > CHIPS_VISIBLE;

  function handleInsert(text: string) {
    onInsert(text);
    setInsertedTexts((prev) => new Set([...prev, text]));
    setDimmedTexts((prev) => new Set([...prev, text]));
  }

  function handleRefresh() {
    setOffset((o) => o + 1);
    setDimmedTexts(new Set()); // clear visual dim on rotation
  }

  // ── Skeleton loading state ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="mt-2 space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-border" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: CHIPS_VISIBLE }).map((_, i) => (
            <div
              key={i}
              className="h-[44px] w-32 animate-pulse rounded-full bg-border"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Ready state ──────────────────────────────────────────────────────────────
  return (
    <div className="mt-2 space-y-2">
      {/* Label */}
      <p className="text-[12px] text-muted-foreground">
        {roleLabel ? `Suggestions for ${roleLabel}` : 'Suggested phrases'}
      </p>

      {/* Chip row */}
      <div className="flex flex-wrap gap-2">
        {rotated.map((text) => {
          const isDimmed = dimmedTexts.has(text);
          const truncated = text.length > 60 ? `${text.slice(0, 60)}…` : text;
          return (
            <button
              key={text}
              type="button"
              title={text}
              onClick={() => !isDimmed && handleInsert(text)}
              disabled={isDimmed}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-[14px] text-[13px] font-medium transition-opacity',
                'min-h-[44px] py-[10px]', // ≥44px touch target via padding
                isDimmed
                  ? 'pointer-events-none opacity-40'
                  : 'cursor-pointer hover:opacity-80 active:opacity-60',
              )}
              aria-label={isDimmed ? `${text} (already inserted)` : `Insert: ${text}`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{truncated}</span>
            </button>
          );
        })}
      </div>

      {/* Refresh link — hidden while loading, hidden if no more chips to rotate to */}
      {canRotate && (
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1 text-[12px] text-muted-foreground underline underline-offset-2 hover:text-primary transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Show different suggestions
        </button>
      )}
    </div>
  );
}
