// AssistedTextarea.tsx
// Wraps shadcn Textarea with two AI assistance layers:
//   Layer 1 — inline spelling/grammar suggestions (debounced, fail-silently)
//   Layer 2 — role-aligned content tailoring with diff view + optional skill adoption
//
// Design note: suggestions are shown as chips below the textarea rather than
// true inline wavy underlines. This avoids the font-metric synchronisation
// complexity of the mirror-div technique across all browsers and resize scenarios
// while delivering the same accept/dismiss workflow.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, Loader2, Wand2, X } from 'lucide-react';
import { checkWritingFn, tailorContentFn } from '@/lib/ai/builder-assist';
import type { TailorResult, WritingSuggestion } from '@/lib/ai/builder-assist';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Used in the AI prompt: 'summary' | 'experience description' | 'education description' */
  fieldType: string;
  rows?: number;
  placeholder?: string;
  className?: string;
  /** Layer 2: if set, shows "Tailor for [jobTitle]" button */
  jobTitle?: string;
  targetJobDescription?: string;
  /** Other entries' text passed as context to avoid repeated phrasing */
  otherContext?: string;
  /** Called when the user accepts suggested skills from a tailor result */
  onSkillsAccepted?: (skills: string[]) => void;
  /**
   * Phase 4: show "Draft a summary for me" button when value is empty.
   * Only pass true when at least one experience entry exists.
   */
  canDraftFromScratch?: boolean;
  /**
   * Primary role signal for the AI phrasing engine.
   * Cruise-roles.json slug (e.g. "bartender-bar-waiter") from the CV checker
   * or the builder's role selector. Takes precedence over jobTitle text matching.
   */
  targetRoleSlug?: string;
}

type TailorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'preview';
      result: TailorResult;
      checkedSkills: Set<string>;
      isDraft: boolean;
    }
  | {
      status: 'edit';
      editText: string;
      result: TailorResult;
      checkedSkills: Set<string>;
      isDraft: boolean;
    };

// ─── Component ─────────────────────────────────────────────────────────────────

export function AssistedTextarea({
  value,
  onChange,
  fieldType,
  rows = 3,
  placeholder,
  className,
  jobTitle,
  targetJobDescription,
  otherContext,
  onSkillsAccepted,
  canDraftFromScratch,
  targetRoleSlug,
}: Props) {
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [tailorState, setTailorState] = useState<TailorState>({ status: 'idle' });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastCheckedRef = useRef<string>('');

  // ── Layer 1: writing check ──────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 20) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (value === lastCheckedRef.current) return;
      lastCheckedRef.current = value;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await checkWritingFn({ data: { text: value, fieldType } } as any);
        // Only keep suggestions whose original_substring still exists in the current text
        setSuggestions(result.filter((s) => value.includes(s.original_substring)));
      } catch {
        // fail silently — no underlines this pass
      }
    }, 1200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fieldType]);

  // Drop stale suggestions as the user continues typing
  useEffect(() => {
    setSuggestions((prev) => prev.filter((s) => value.includes(s.original_substring)));
  }, [value]);

  const acceptSuggestion = useCallback(
    (s: WritingSuggestion) => {
      const idx = value.indexOf(s.original_substring);
      if (idx === -1) {
        setSuggestions((prev) => prev.filter((x) => x !== s));
        return;
      }
      onChange(
        value.slice(0, idx) + s.suggested_substring + value.slice(idx + s.original_substring.length),
      );
      setSuggestions((prev) => prev.filter((x) => x !== s));
    },
    [value, onChange],
  );

  const dismissSuggestion = useCallback((s: WritingSuggestion) => {
    setSuggestions((prev) => prev.filter((x) => x !== s));
  }, []);

  // ── Layer 2: tailor content ─────────────────────────────────────────────────

  const runTailor = useCallback(
    async (isDraft = false) => {
      setTailorState({ status: 'loading' });
      try {
        const result = await tailorContentFn({
          data: {
            fieldType: isDraft ? 'summary-from-scratch' : fieldType,
            currentText: isDraft
              ? '(generate a concise professional summary from the role context provided)'
              : value,
            jobTitle: jobTitle || 'hospitality professional',
            jobDescription: targetJobDescription || undefined,
            otherContext: otherContext || undefined,
            targetRoleSlug: targetRoleSlug || undefined,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        setTailorState({ status: 'preview', result, checkedSkills: new Set(), isDraft });
      } catch {
        // The user's text is untouched — value only changes on explicit accept.
        toast.error("We couldn't generate a suggestion right now — please try again in a moment.");
        setTailorState({ status: 'idle' });
      }
    },
    [fieldType, value, jobTitle, targetJobDescription, otherContext, targetRoleSlug],
  );

  const acceptTailor = useCallback(() => {
    if (tailorState.status !== 'preview' && tailorState.status !== 'edit') return;
    const text =
      tailorState.status === 'edit' ? tailorState.editText : tailorState.result.rewrittenText;
    const acceptedSkills = [...tailorState.checkedSkills];
    onChange(text);
    if (acceptedSkills.length > 0) onSkillsAccepted?.(acceptedSkills);
    setTailorState({ status: 'idle' });
  }, [tailorState, onChange, onSkillsAccepted]);

  const toggleSkill = useCallback((skill: string) => {
    setTailorState((prev) => {
      if (prev.status !== 'preview' && prev.status !== 'edit') return prev;
      const next = new Set(prev.checkedSkills);
      if (next.has(skill)) next.delete(skill); else next.add(skill);
      return { ...prev, checkedSkills: next };
    });
  }, []);

  // ── Visibility helpers ──────────────────────────────────────────────────────

  const showTailorButton =
    Boolean(jobTitle) && tailorState.status === 'idle' && value.trim().length > 0;
  const showDraftButton =
    canDraftFromScratch === true &&
    value.trim().length === 0 &&
    tailorState.status === 'idle';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-2', className)}>
      {/* The actual editable textarea — always visible */}
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      {/* Layer 1: spelling / grammar suggestion chips */}
      {suggestions.length > 0 && (
        <div className="space-y-1">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs dark:border-red-900 dark:bg-red-950/30"
            >
              <span className="shrink-0 rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:bg-red-900/50 dark:text-red-400">
                {s.type}
              </span>
              <span className="text-red-700 line-through dark:text-red-400">
                {s.original_substring}
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">{s.suggested_substring}</span>
              <div className="ml-auto flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => acceptSuggestion(s)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => dismissSuggestion(s)}
                  aria-label="Dismiss suggestion"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Layer 2: tailor / draft trigger buttons */}
      {showTailorButton && (
        <button
          type="button"
          onClick={() => runTailor(false)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Tailor for {jobTitle}
        </button>
      )}
      {showDraftButton && (
        <button
          type="button"
          onClick={() => runTailor(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Draft a summary for me
        </button>
      )}

      {/* Layer 2: loading state */}
      {tailorState.status === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Tailoring for {jobTitle || 'your role'}…
        </div>
      )}

      {/* Layer 2: result panel (preview or edit) */}
      {(tailorState.status === 'preview' || tailorState.status === 'edit') && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          {/* AI-draft banner */}
          {tailorState.isDraft && (
            <div className="flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
              <Wand2 className="h-3 w-3 shrink-0" />
              AI draft — review before saving
            </div>
          )}

          {/* Diff view (preview mode) */}
          {tailorState.status === 'preview' && (
            <div className={cn('grid gap-2 text-xs', !tailorState.isDraft && 'sm:grid-cols-2')}>
              {!tailorState.isDraft && (
                <div className="rounded bg-muted/60 p-2.5 text-muted-foreground line-through">
                  {value}
                </div>
              )}
              <div className="rounded border border-primary/20 bg-primary/5 p-2.5 text-foreground">
                {tailorState.result.rewrittenText}
              </div>
            </div>
          )}

          {/* Editable textarea (edit mode) */}
          {tailorState.status === 'edit' && (
            <Textarea
              rows={rows}
              value={tailorState.editText}
              onChange={(e) =>
                setTailorState((prev) =>
                  prev.status === 'edit' ? { ...prev, editText: e.target.value } : prev,
                )
              }
              className="text-sm"
            />
          )}

          {/* Suggested skills */}
          {tailorState.result.suggestedSkills.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Add to your skills? (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {tailorState.result.suggestedSkills.map((skill) => (
                  <label
                    key={skill}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs transition-colors hover:bg-accent/10"
                  >
                    <Checkbox
                      checked={tailorState.checkedSkills.has(skill)}
                      onCheckedChange={() => toggleSkill(skill)}
                      className="h-3 w-3"
                    />
                    {skill}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Accept / Edit / Reject actions */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={acceptTailor} className="h-7 px-3 text-xs">
              <Check className="mr-1.5 h-3 w-3" />
              {tailorState.status === 'edit' ? 'Apply' : 'Accept'}
            </Button>
            {tailorState.status === 'preview' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={() =>
                  setTailorState((prev) =>
                    prev.status === 'preview'
                      ? {
                          status: 'edit',
                          editText: prev.result.rewrittenText,
                          result: prev.result,
                          checkedSkills: prev.checkedSkills,
                          isDraft: prev.isDraft,
                        }
                      : prev,
                  )
                }
              >
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-3 text-xs text-muted-foreground"
              onClick={() => setTailorState({ status: 'idle' })}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
