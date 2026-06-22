import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useRef } from 'react';
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
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { checkCruiseCv, getRoleOptions } from '@/lib/cruise-cv-check';
import { WhatsAppCaptureForm } from '@/components/checker/WhatsAppCaptureForm';
import type { CvScoreResult, CategoryKey } from '@/lib/cruiseCvRubric';
import { CATEGORY_LABELS, CATEGORY_WEIGHTS } from '@/lib/cruiseCvRubric';
import { extractTextFromFile } from '@/lib/extractCvText';
import { parseCvForBuilder } from '@/lib/parseCvForBuilder';
import { saveCvImport, clearCvImport } from '@/lib/cv-import-handoff';
import type { ResumeData } from '@/types/resume';
import { useNavigate } from '@tanstack/react-router';
import { useCvUploadProgress } from '@/hooks/useCvUploadProgress';
import { UploadProgressBar } from '@/components/checker/UploadProgressBar';

export const Route = createFileRoute('/tools/cruise-cv-checker')({
  head: () => ({
    meta: [
      { title: 'Cruise CV Checker — Is Your CV Cruise-Ready? | GetHired' },
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

// ─── Score gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 58;
  const cx = 80;
  const cy = 75;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fillDeg = -180 + (score / 100) * 180;
  const fillX = cx + r * Math.cos(toRad(fillDeg));
  const fillY = cy + r * Math.sin(toRad(fillDeg));
  const largeArc = score > 50 ? 1 : 0;
  const fillPath =
    score === 0
      ? ''
      : `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${fillX} ${fillY}`;

  const color =
    score >= 85
      ? 'var(--color-brass)'
      : score >= 70
        ? 'var(--color-brass)'
        : score >= 50
          ? 'oklch(0.72 0.18 70)'
          : 'var(--color-destructive)';

  return (
    <svg width="160" height="95" viewBox="0 0 160 95" aria-label={`Score: ${score} out of 100`}>
      <path d={trackPath} fill="none" stroke="var(--color-border)" strokeWidth="14" strokeLinecap="round" />
      {fillPath && (
        <path d={fillPath} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="30" fontWeight="bold" fill={color}>
        {score}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="11" fill="var(--color-muted-foreground)">
        / 100
      </text>
    </svg>
  );
}

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
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs text-muted-foreground">
                {Math.round(weight * 100)}% weight
              </span>
              <span className="text-sm font-bold text-foreground w-8 text-right">{score}</span>
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CvScoreResult | null>(null);
  const [parsedCv, setParsedCv] = useState<ResumeData | null>(null);
  const [whatsappCaptured, setWhatsappCaptured] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const progress = useCvUploadProgress();

  const selectedRole = ROLE_OPTIONS.find((r) => r.slug === roleSlug);
  const hasInput = Boolean(pendingFile) || cvText.trim().length >= 50;

  // Store the selected file without extracting yet — extraction happens on submit
  // so we can show a single continuous progress bar across the whole pipeline.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPendingFile(file);
    setCvText(''); // clear any previously extracted text
    progress.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasInput || !roleSlug) {
      toast.error('Please add your CV and select a role.');
      return;
    }
    setLoading(true);
    setResult(null);
    setParsedCv(null);
    setWhatsappCaptured(false);

    let cvTextToUse = cvText;

    try {
      // ── Phase 1 & 2: extract text from file (reading 0-10%, extracting 10-70%) ──
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

      // ── Phase 3: AI analysis (simulated easing 70→95%, snaps to 100% on response) ──
      progress.setStage('analyzing', 70);

      // Run scoring and structured CV parse in parallel — parse result is held
      // in state and only written to sessionStorage if user clicks "Build My CV".
      const [scoreResult, parseResult] = await Promise.allSettled([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkCruiseCv({ data: { cvText: cvTextToUse.trim(), roleSlug, jobDescription: jobDescription.trim() || undefined } } as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parseCvForBuilder({ data: { cvText: cvTextToUse.trim() } } as any),
      ]);

      if (scoreResult.status === 'rejected') {
        throw scoreResult.reason;
      }

      // Snap to 100% the instant the real response lands.
      progress.setStage('done', 100);

      setResult(scoreResult.value);
      if (parseResult.status === 'fulfilled') {
        setParsedCv(parseResult.value);
      }
      // Parse failure is non-fatal — "Build My CV" will still navigate, just without pre-fill.

      // Auto-hide the progress bar once results are rendered.
      setTimeout(() => progress.reset(), 1500);
    } catch (err) {
      progress.setStage('error');

      // ── PHASE 0: full diagnostics in the console ───────────────────────────
      // Keep the user-facing message friendly; capture everything needed to debug.
      const fileInfo = pendingFile
        ? { name: pendingFile.name, size: pendingFile.size, type: pendingFile.type }
        : null;
      console.error('[CV checker] extraction/scoring error', {
        name: err instanceof Error ? err.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        fileInfo,
        userAgent: navigator.userAgent,
      });

      // Friendly user-facing message — never expose raw JS error strings.
      const knownMessage =
        err instanceof Error &&
        (err.message.includes('scanned image') ||
          err.message.includes('encrypted or corrupted') ||
          err.message.includes('Unsupported file type') ||
          err.message.includes("couldn't extract"));
      toast.error(
        knownMessage
          ? err.message
          : 'We hit a problem reading your CV. Try a .docx or .txt file, or paste your CV text directly.',
      );
    } finally {
      setLoading(false);
    }
  }

  const tierSummary: Record<CvScoreResult['tier'], string> = {
    Strong: 'Strong CV — a few final tweaks and you\'re ready to apply.',
    Good: 'Good CV — address the gaps below to strengthen your application.',
    'Needs Work': 'Your CV needs work before it will pass cruise recruiter screening.',
    'Major Gaps': 'Your CV has critical gaps that will likely cause instant rejection.',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Anchor className="h-4 w-4 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">
              Get<span className="text-primary">Hired</span>
            </span>
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
        {!result && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-card border border-border p-6 shadow-soft space-y-5"
          >
            {/* Role selector */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-sm font-medium text-foreground">
                Role you&apos;re applying for <span className="text-destructive">*</span>
              </Label>
              <Select value={roleSlug} onValueChange={setRoleSlug}>
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
              <Label htmlFor="cvText" className="text-sm font-medium text-foreground">
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
              </div>
              <input
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

        {/* Results */}
        {result && !loading && (
          <div className="space-y-5">
            {/* Score card */}
            <div className="rounded-2xl bg-card border border-border shadow-soft p-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                  <ScoreGauge score={result.overallScore} />
                  <TierBadge tier={result.tier} />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-bold text-foreground mb-1">
                    {selectedRole?.label ?? 'CV'} Analysis
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {tierSummary[result.tier]}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Top 2 fixes</p>
                    <ul className="space-y-1.5">
                      {result.topFixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          {fix}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp capture */}
            {!whatsappCaptured && (
              <WhatsAppCaptureForm
                roleSlug={roleSlug}
                overallScore={result.overallScore}
                tier={result.tier}
                topFixes={result.topFixes}
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
                      score={result.categories[key].score}
                      weight={result.categories[key].weight}
                      feedback={result.categories[key].feedback}
                    />
                  ))}
                </div>

                {/* Keyword lists */}
                {(result.matchedKeywords.length > 0 || result.missingKeywords.length > 0) && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Role Keywords
                    </h3>
                    {result.missingKeywords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-destructive mb-1.5">Missing from your CV</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.missingKeywords.map((kw) => (
                            <span key={kw} className="rounded-md bg-destructive/8 border border-destructive/20 px-2 py-0.5 text-xs text-destructive">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.matchedKeywords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-primary mb-1.5">Found in your CV</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.matchedKeywords.slice(0, 15).map((kw) => (
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
                    Plate &amp; Pen&apos;s hospitality templates are designed to pass cruise recruiter screening.
                  </p>
                </div>
                <Button
                  className="gap-2 font-semibold shrink-0"
                  onClick={() => {
                    if (parsedCv) {
                      saveCvImport(parsedCv, roleSlug);
                      void navigate({ to: '/builder', search: { from: 'import' } as never });
                    } else {
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
                onClick={() => {
                  clearCvImport();
                  setResult(null);
                  setParsedCv(null);
                  setWhatsappCaptured(false);
                  setPendingFile(null);
                  setCvText('');
                  progress.reset();
                }}
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
