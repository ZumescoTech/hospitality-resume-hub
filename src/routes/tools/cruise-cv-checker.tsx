import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { LogoLockup } from '@/components/ui/LogoLockup';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Upload,
  Anchor,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

import { checkCruiseCv, getRoleOptions } from '@/lib/cruise-cv-check';
import { WhatsAppCaptureForm } from '@/components/checker/WhatsAppCaptureForm';
import { AtsScoreRing } from '@/components/checker/AtsScoreRing';
import type { CvScoreResult, CvCheckOutcome, CategoryKey } from '@/lib/cruiseCvRubric';
import { CATEGORY_LABELS, CATEGORY_WEIGHTS } from '@/lib/cruiseCvRubric';
import { extractTextFromFile } from '@/lib/extractCvText';
import { ExtractionError } from '@/lib/extraction-error';
import type { ExtractionReasonCode } from '@/lib/extraction-error';
import { logUploadFailure } from '@/lib/upload-failure-log';
import { parseCvForBuilder } from '@/lib/parseCvForBuilder';
import { saveCvImport, clearCvImport } from '@/lib/cv-import-handoff';
import type { ResumeData } from '@/types/resume';
import { useCvUploadProgress } from '@/hooks/useCvUploadProgress';
import { UploadProgressBar } from '@/components/checker/UploadProgressBar';
import { trackEvent } from '@/lib/clarity';
import type { ConfidenceResult } from '@/lib/cvFeedback';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKER_STORAGE_KEY = 'checker-draft-v1';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (A0-2)
const ANALYZE_TIMEOUT_MS = 35_000; // 35 s (A0-2)

/** Stable session ID for correlating telemetry events in one page visit. */
const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface CheckerDraft {
  roleSlug: string;
  jobDescription: string;
  cvText: string; // extracted text — not the binary File
}

// ─── Route ────────────────────────────────────────────────────────────────────

// A2-2: represent checker phase in the URL so browser back/forward works
export const Route = createFileRoute('/tools/cruise-cv-checker')({
  validateSearch: (search: Record<string, unknown>) => ({
    step: (search.step === 'results' ? 'results' : 'form') as 'form' | 'results',
  }),
  head: () => ({
    meta: [
      { title: 'GetHired — Cruise CV Checker' },
      {
        name: 'description',
        content:
          'Free AI-powered cruise CV checker. Get instant feedback on whether your CV meets cruise ship recruiter standards for your specific role.',
      },
    ],
  }),
  component: CruiseCvCheckerPage,
});

const ROLE_OPTIONS = getRoleOptions();

// ─── Tier badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: CvScoreResult['tier'] }) {
  const map: Record<CvScoreResult['tier'], { cls: string }> = {
    Strong:      { cls: 'bg-primary/10 text-primary border-primary/20' },
    Good:        { cls: 'bg-primary/10 text-primary border-primary/20' },
    'Needs Work':{ cls: 'bg-accent/10 text-accent border-accent/20' },
    'Major Gaps':{ cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const { cls } = map[tier];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', cls)}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {tier}
    </span>
  );
}

// ─── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: ConfidenceResult }) {
  const map: Record<ConfidenceResult['level'], { cls: string; label: string }> = {
    High:   { cls: 'bg-primary/8 text-primary border-primary/20',          label: 'High confidence' },
    Medium: { cls: 'bg-accent/8 text-accent border-accent/20',             label: 'Medium confidence' },
    Low:    { cls: 'bg-destructive/8 text-destructive border-destructive/20', label: 'Low confidence' },
  };
  const { cls, label } = map[confidence.level];
  return (
    <span
      title={confidence.reasons.join(' · ')}
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-help', cls)}
    >
      {label}
    </span>
  );
}

// ─── Category score row ────────────────────────────────────────────────────────

function CategoryScoreRow({
  categoryKey,
  score,
  weight,
  feedback,
}: {
  categoryKey: CategoryKey;
  score: number;
  weight: number;
  feedback: string;
}) {
  const [open, setOpen] = useState(false);

  const barColor =
    score >= 70
      ? 'bg-primary'
      : score >= 50
        ? 'bg-accent'
        : 'bg-destructive';

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-foreground">
              {CATEGORY_LABELS[categoryKey]}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <span className="text-sm font-bold text-foreground tabular-nums">
                {Math.round(score * weight)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                / {Math.round(weight * 100)}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border">
            <div
              className={cn('h-1.5 rounded-full transition-all', barColor)}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">{feedback}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function CruiseCvCheckerPage() {
  const { step } = Route.useSearch();
  const navigate = useNavigate();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CvScoreResult | null>(null);
  const [parseFailure, setParseFailure] = useState<Extract<CvCheckOutcome, { kind: 'parse_failed' | 'insufficient_content' }> | null>(null);
  const [parsedCv, setParsedCv] = useState<ResumeData | null>(null);
  const [whatsappCaptured, setWhatsappCaptured] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const progress = useCvUploadProgress();

  // A0-1: Hydrate from localStorage on mount ──────────────────────────────────
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = localStorage.getItem(CHECKER_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<CheckerDraft>;
      let restored = false;
      if (draft.roleSlug) { setRoleSlug(draft.roleSlug); restored = true; }
      if (draft.jobDescription) { setJobDescription(draft.jobDescription); restored = true; }
      if (draft.cvText) { setCvText(draft.cvText); restored = true; }
      if (restored) {
        toast.success('Progress restored. Re-attach your CV file if needed, then check again.');
      }
    } catch { /* ignore corrupt storage */ }
  }, []);

  // A0-1: Persist to localStorage on each meaningful change (debounced) ───────
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      try {
        const draft: CheckerDraft = { roleSlug, jobDescription, cvText };
        localStorage.setItem(CHECKER_STORAGE_KEY, JSON.stringify(draft));
      } catch { /* ignore quota errors */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [roleSlug, jobDescription, cvText]);

  // A2-2: Sync URL step with result state (browser back clears results) ───────
  useEffect(() => {
    if (step === 'form' && (result || parseFailure)) {
      setResult(null);
      setParseFailure(null);
      setParsedCv(null);
      setWhatsappCaptured(false);
    }
  }, [step]); // intentionally omitting `result` — we only care when step changes

  const selectedRole = ROLE_OPTIONS.find((r) => r.slug === roleSlug);
  const hasInput = Boolean(pendingFile) || cvText.trim().length >= 50;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // A0-2: client-side size guard — reject before any spinner starts
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      toast.error(`This file is ${sizeMb} MB. Please upload a CV under 5 MB.`);
      // Log to server telemetry
      void logUploadFailure({
        data: {
          sessionId: SESSION_ID,
          reasonCode: 'file_too_large' as ExtractionReasonCode,
          stage: 'reading',
          fileMeta: {
            size: file.size,
            mimeType: file.type,
            extension: (file.name.split('.').pop() ?? '').toLowerCase(),
            pageCount: null,
          },
          errorMessage: `File is ${sizeMb} MB, limit is 5 MB`,
          timestamp: new Date().toISOString(),
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).catch(() => {});
      return;
    }

    setPendingFile(file);
    setCvText(''); // clear any previously extracted text
    progress.reset();
    trackEvent('cv_upload_started');
  }

  const handleRoleChange = useCallback((value: string) => {
    setRoleSlug(value);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasInput || !roleSlug) {
      toast.error('Please add your CV and select a role.');
      return;
    }
    setLoading(true);
    setResult(null);
    setParseFailure(null);
    setParsedCv(null);
    setWhatsappCaptured(false);

    let cvTextToUse = cvText;

    try {
      // ── Phase 1 & 2: extract text from file ──────────────────────────────
      if (pendingFile) {
        cvTextToUse = await extractTextFromFile(pendingFile, (update) => {
          progress.setStage(update.stage, update.percent);
          if (update.label) progress.setLabel(update.label);
        });
        setCvText(cvTextToUse);
        setPendingFile(null);
      }

      if (cvTextToUse.trim().length < 50) {
        throw new Error("We couldn't extract enough text from this file. Try a .docx or .txt version.");
      }

      // ── Phase 3: AI analysis ──────────────────────────────────────────────
      progress.setStage('analyzing', 70);

      // A0-2: wrap in a timeout so a stalled request never hangs forever
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Analysis is taking too long. Please try again.')),
          ANALYZE_TIMEOUT_MS,
        ),
      );

      const [scoreResult, parseResult] = await Promise.race([
        Promise.allSettled([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          checkCruiseCv({ data: { cvText: cvTextToUse.trim(), roleSlug, jobDescription: jobDescription.trim() || undefined } } as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parseCvForBuilder({ data: { cvText: cvTextToUse.trim() } } as any),
        ]),
        timeoutPromise,
      ]);

      if (scoreResult.status === 'rejected') {
        throw scoreResult.reason;
      }

      const outcome = scoreResult.value as CvCheckOutcome;

      // Handle parse quality gate failures — distinct from a low score
      if (outcome.kind === 'parse_failed' || outcome.kind === 'insufficient_content') {
        progress.setStage('done', 100);
        setParseFailure(outcome);
        trackEvent('cv_parse_failed');
        setTimeout(() => progress.reset(), 1500);
        void navigate({ to: '/tools/cruise-cv-checker', search: { step: 'results' } });
        return;
      }

      progress.setStage('done', 100);
      setResult(outcome.result);
      trackEvent('cv_upload_succeeded');
      trackEvent('score_viewed');
      if (parseResult.status === 'fulfilled') {
        setParsedCv(parseResult.value);
      }

      setTimeout(() => progress.reset(), 1500);

      // A2-2: push results step into browser history
      void navigate({ to: '/tools/cruise-cv-checker', search: { step: 'results' } });
    } catch (err) {
      progress.setStage('error');
      trackEvent('cv_upload_failed');

      // Determine the reason code and stage for telemetry
      let reasonCode: ExtractionReasonCode;
      let failStage: string = 'unknown';
      let pageCount: number | null = null;

      if (err instanceof ExtractionError) {
        reasonCode = err.reasonCode;
        failStage = err.stage;
        pageCount = err.pageCount ?? null;
      } else if (err instanceof Error && err.message.includes('taking too long')) {
        // Client-side 35s timeout — record which stage was active
        reasonCode = 'client_timeout';
        failStage = progress.currentStage ?? 'unknown';
      } else if (err instanceof Error && err.message.includes('ScoreParseError')) {
        reasonCode = 'parser_exception';
        failStage = 'analyzing';
      } else {
        reasonCode = 'parser_exception';
        failStage = 'unknown';
      }

      // Build file metadata for logging
      const file = pendingFile;
      const fileMeta = {
        size: file?.size ?? 0,
        mimeType: file?.type ?? 'text/plain',
        extension: file ? (file.name.split('.').pop() ?? '').toLowerCase() : 'paste',
        pageCount,
      };

      // Log to console for local debugging
      console.error('[CV checker] extraction/scoring error', {
        sessionId: SESSION_ID,
        reasonCode,
        stage: failStage,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
        fileMeta,
      });

      // Fire-and-forget: send structured failure to server telemetry
      void logUploadFailure({
        data: {
          sessionId: SESSION_ID,
          reasonCode,
          stage: failStage,
          fileMeta,
          errorMessage: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300),
          errorStack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
          timestamp: new Date().toISOString(),
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).catch(() => { /* telemetry failure is non-fatal */ });

      // Show user-facing message — use the ExtractionError's specific message, not a generic one
      if (err instanceof ExtractionError) {
        toast.error(err.message);
      } else if (err instanceof Error && err.message.includes('taking too long')) {
        toast.error('Analysis is taking too long. Please try again.');
      } else if (err instanceof Error && err.message.includes('ScoreParseError')) {
        toast.error("We couldn't analyse this CV right now — please try again in a moment.");
      } else {
        toast.error(
          err instanceof Error ? err.message : 'An unexpected error occurred. Please try a .docx or .txt file, or paste your CV text directly.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCheckAnother() {
    clearCvImport();
    // A0-1: clear saved draft so next user starts fresh
    try { localStorage.removeItem(CHECKER_STORAGE_KEY); } catch { /* ignore */ }
    setResult(null);
    setParseFailure(null);
    setParsedCv(null);
    setWhatsappCaptured(false);
    setPendingFile(null);
    setCvText('');
    setRoleSlug('');
    setJobDescription('');
    progress.reset();
    // A2-2: navigate back to form step
    void navigate({ to: '/tools/cruise-cv-checker', search: { step: 'form' } });
  }

  const tierSummary: Record<CvScoreResult['tier'], string> = {
    Strong: 'Strong CV — a few final tweaks and you\'re ready to apply.',
    Good: 'Good CV — address the gaps below to strengthen your application.',
    'Needs Work': 'Your CV needs work before it will pass cruise recruiter screening.',
    'Major Gaps': 'Your CV has critical gaps that will likely cause instant rejection.',
  };

  // Show results view when URL says results AND we have a result (or parse failure)
  const showResults = step === 'results' && (result != null || parseFailure != null) && !loading;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center">
            <LogoLockup variant="dark" height={36} showWordmark={true} />
          </Link>
          <Link to="/builder" search={{ from: undefined, role: undefined }}>
            <Button variant="outline" size="sm">Build CV</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Free CV Checker</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
            Is Your CV<br />
            <span className="text-primary">Cruise-Ready?</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            AI analysis against real cruise recruiter standards. Know exactly what's missing before you apply.
          </p>
        </div>

        {/* Input form */}
        {!showResults && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-card border border-border p-6 shadow-soft space-y-5"
          >
            {/* Role selector */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-sm font-medium text-foreground">
                Role you&apos;re applying for <span className="text-destructive">*</span>
              </Label>
              <Select value={roleSlug} onValueChange={handleRoleChange}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a cruise ship role…" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.slug} value={r.slug}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CV upload */}
            <div className="space-y-1.5">
              <Label htmlFor="cvFile" className="text-sm font-medium text-foreground">
                Your CV <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/10 hover:text-foreground hover:border-accent/40 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload CV (.pdf, .docx, .txt)
                </button>
                {pendingFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {pendingFile.name} — ready
                  </span>
                )}
                {!pendingFile && cvText && (
                  <span className="text-xs text-muted-foreground">CV loaded ✓</span>
                )}
                <span className="text-xs text-muted-foreground/60">max 5 MB</span>
              </div>
              <input
                id="cvFile"
                name="cvFile"
                ref={fileRef}
                type="file"
                accept=".txt,.text,.docx,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Job description (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="jobDesc" className="text-sm font-medium text-foreground">
                Job description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="jobDesc"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here to improve keyword matching accuracy for this specific role…"
                rows={4}
                className="resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">
                If pasted, any skills mentioned in the job ad that appear in your CV will be highlighted as matched keywords.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !hasInput || !roleSlug}
              className="w-full"
            >
              Check My CV
            </Button>

            {/* Progress bar — shown during extraction and AI analysis */}
            {progress.stage !== 'idle' && (
              <UploadProgressBar
                stage={progress.stage}
                percent={progress.percent}
                label={progress.label}
              />
            )}
          </form>
        )}

        {/* Parse failure — distinct from a numeric score */}
        {showResults && parseFailure && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-card border border-destructive/30 shadow-soft p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {parseFailure.kind === 'parse_failed'
                  ? "We couldn't read your CV"
                  : 'Not enough content to score'}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {parseFailure.reason}
              </p>
              <div className="rounded-lg bg-muted border border-border px-4 py-3 text-left">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent shrink-0" />
                  What to do
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {parseFailure.suggestion}
                </p>
              </div>
            </div>

            {/* Try again */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleCheckAnother}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Try again with a different file
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && result && (
          <div className="space-y-5">
            {/* Score card */}
            <div className="rounded-2xl bg-card border border-border shadow-soft p-6">
              {result!.isDegraded && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/8 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <p className="text-xs text-accent">
                    AI scoring is temporarily unavailable. Your score is based on keyword matching and CV structure only — recheck when service resumes for a full analysis.
                  </p>
                </div>
              )}
              <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {selectedRole?.label ?? 'CV'} Analysis
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {result!.confidence && <ConfidenceBadge confidence={result!.confidence} />}
                  <TierBadge tier={result!.tier} />
                </div>
              </div>
              <AtsScoreRing score={result!.overallScore} topFixes={result!.topFixes} />
            </div>

            {/* WhatsApp capture */}
            {!whatsappCaptured && (
              <WhatsAppCaptureForm
                roleSlug={roleSlug}
                overallScore={result!.overallScore}
                tier={result!.tier}
                topFixes={result!.topFixes}
                onSuccess={() => setWhatsappCaptured(true)}
                onSkip={() => setWhatsappCaptured(true)}
              />
            )}

            {/* Full breakdown — always visible once WhatsApp step is done */}
            {whatsappCaptured && (
              <div className="space-y-4">
                {/* Category breakdown */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
                    Score Breakdown
                  </h3>
                  {(Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]).map((key) => (
                    <CategoryScoreRow
                      key={key}
                      categoryKey={key}
                      score={result!.categories[key].score}
                      weight={result!.categories[key].weight}
                      feedback={result!.categories[key].feedback}
                    />
                  ))}
                </div>

                {/* Deterministic improvement tips */}
                {result!.deterministicFeedback && result!.deterministicFeedback.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-accent shrink-0" />
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        What to Fix
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {result!.deterministicFeedback.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Keyword lists */}
                {(result!.matchedKeywords.length > 0 || result!.missingKeywords.length > 0) && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Role Keywords
                    </h3>
                    {result!.missingKeywords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-destructive mb-1.5">Missing from your CV</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result!.missingKeywords.map((kw) => (
                            <span key={kw} className="rounded-md bg-destructive/8 border border-destructive/20 px-2 py-0.5 text-xs text-destructive">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result!.matchedKeywords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-primary mb-1.5">Found in your CV</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result!.matchedKeywords.slice(0, 15).map((kw) => (
                            <span key={kw} className="inline-flex items-center gap-1 rounded-md bg-primary/8 border border-primary/20 px-2 py-0.5 text-xs text-primary">
                              <CheckCircle2 className="h-3 w-3" />
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CTA banner */}
            <div className="rounded-2xl bg-muted border border-border p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Build a cruise-ready CV in minutes
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    GetHired&apos;s hospitality templates are designed to pass cruise recruiter screening.
                  </p>
                </div>
                <Button
                  className="gap-2 font-semibold shrink-0"
                  onClick={() => {
                    trackEvent('builder_entered');
                    if (parsedCv) {
                      saveCvImport(parsedCv, roleSlug);
                      void navigate({ to: '/builder', search: { from: 'import' } as never });
                    } else {
                      toast.info(
                        "We couldn't pre-fill your details this time — you can enter them in the builder.",
                        { duration: 6000 },
                      );
                      void navigate({ to: '/builder', search: { role: roleSlug } as never });
                    }
                  }}
                >
                  Build My CV
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Check another */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleCheckAnother}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Check a different CV
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
