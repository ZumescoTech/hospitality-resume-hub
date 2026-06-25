import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useResumeStore } from "@/lib/resume-store";
import { ResumeData, STORAGE_KEY } from "@/types/resume";
import { Section } from "@/components/builder/Section";
import { StepProgress } from "@/components/builder/StepProgress";
import { PreviewPanel } from "@/components/builder/PreviewPanel";
import { PersonalSection } from "@/components/builder/sections/PersonalSection";
import { ExperienceSection } from "@/components/builder/sections/ExperienceSection";
import { EducationSection } from "@/components/builder/sections/EducationSection";
import { SkillsSection } from "@/components/builder/sections/SkillsSection";
import { CertificationsSection } from "@/components/builder/sections/CertificationsSection";
import { HospitalitySection } from "@/components/builder/sections/HospitalitySection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Eye,
  Pencil,
  User,
  Briefcase,
  GraduationCap,
  Star,
  Award,
  Wine,
  Check,
  Loader2,
  Cloud,
  Upload,
  X,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { MobilePreviewModal } from "@/components/builder/MobilePreviewModal";
import { extractTextFromFile } from "@/lib/extractCvText";
import { parseCvForBuilder } from "@/lib/parseCvForBuilder";
import { consumeCvImport } from "@/lib/cv-import-handoff";
import { mapParsedCvToBuilderForm } from "@/lib/map-parsed-cv-to-builder";
import { cn } from "@/lib/utils";

// Separate key for last-visited step so the store never overwrites it
const STEP_KEY = `${STORAGE_KEY}-step`;

function readLastStep(): number {
  try {
    const v = parseInt(localStorage.getItem(STEP_KEY) ?? "0", 10);
    return Number.isFinite(v) && v >= 0 && v < 6 ? v : 0;
  } catch {
    return 0;
  }
}

function writeLastStep(step: number) {
  try {
    localStorage.setItem(STEP_KEY, String(step));
  } catch { /* ignore */ }
}

export const Route = createFileRoute("/builder")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === "import" ? ("import" as const) : undefined,
    role: typeof search.role === "string" && search.role.length > 0 ? search.role : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Plate & Pen — Resume Builder for Hospitality Pros" },
      {
        name: "description",
        content:
          "A modern resume builder for waiters, sommeliers, bartenders and chefs. Live preview, 10+ editorial templates, hospitality-specific sections.",
      },
      { property: "og:title", content: "Plate & Pen — Resume Builder for Hospitality" },
      {
        property: "og:description",
        content: "Build a beautiful, hospitality-focused CV with live preview and 10+ templates.",
      },
    ],
  }),
  component: BuilderPage,
});

const STEPS = [
  { id: "personal", label: "Personal info", icon: User },
  { id: "experience", label: "Work experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Star },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "hospitality", label: "Hospitality", icon: Wine },
];

function BuilderPage() {
  const { data, setData, hydrated, syncing, resumeId } = useResumeStore();

  // ── Step state — restored from localStorage synchronously ──────────────────
  const initialLastStep = useRef(readLastStep());
  const [step, setStepRaw] = useState(initialLastStep.current);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set(Array.from({ length: initialLastStep.current }, (_, i) => i)),
  );
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");
  const [animKey, setAnimKey] = useState(0);

  function goTo(next: number) {
    if (next === step) return;
    setSlideDir(next > step ? "right" : "left");
    setCompletedSteps((prev) => {
      const s = new Set(prev);
      s.add(step);
      return s;
    });
    setStepRaw(next);
    setAnimKey((k) => k + 1);
    setShowErrors(false);
    writeLastStep(next);
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const [showErrors, setShowErrors] = useState(false);

  function isValid(): boolean {
    if (step === 0) {
      return !!(data.personal.fullName.trim() && data.personal.email.trim());
    }
    if (step === 1) {
      return data.experience.some((e) => e.role.trim() && e.venue.trim());
    }
    return true;
  }

  function handleContinue() {
    if (step === STEPS.length - 1) {
      // "Preview CV →" — opens mobile preview modal (spec 03)
      setPreviewOpen(true);
      return;
    }
    if (!isValid()) {
      setShowErrors(true);
      return;
    }
    goTo(step + 1);
  }

  function handleBack() {
    if (step > 0) goTo(step - 1);
  }

  // ── Welcome-back banner ────────────────────────────────────────────────────
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showWelcomeBanner =
    hydrated &&
    !welcomeDismissed &&
    step === 0 &&
    initialLastStep.current > 0 &&
    !!data.personal.fullName;

  // ── Saved indicator ────────────────────────────────────────────────────────
  const [savedVisible, setSavedVisible] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSyncing = useRef(false);

  function showSaved() {
    setSavedVisible(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedVisible(false), 1500);
  }

  // Auth users: detect syncing → saved transition
  useEffect(() => {
    if (!hydrated) return;
    if (prevSyncing.current && !syncing) showSaved();
    prevSyncing.current = syncing;
  }, [syncing, hydrated]);

  // Anon users: detect data changes after initial hydration
  const isFirstChange = useRef(true);
  useEffect(() => {
    if (!hydrated || resumeId) return; // resumeId = auth user, handled above
    if (isFirstChange.current) { isFirstChange.current = false; return; }
    showSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hydrated]);

  // ── Mobile preview modal (spec 03) ────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Mobile tab switcher ────────────────────────────────────────────────────
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // ── CV import ─────────────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importConfirm, setImportConfirm] = useState<{
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const search = useSearch({ from: "/builder" });
  const navigate = useNavigate();
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsingPaste, setParsingPaste] = useState(false);

  useEffect(() => {
    if (!hydrated || search.from !== "import") return;
    void navigate({ to: "/builder", search: { from: undefined, role: undefined }, replace: true });
    const imported = consumeCvImport();
    if (!imported) return;
    const hasExistingDraft = Boolean(data.personal.fullName);
    const applyHandoffImport = () => {
      setData({
        ...mapParsedCvToBuilderForm(imported.data),
        templateId: data.templateId,
        ...(imported.roleSlug ? { targetRoleSlug: imported.roleSlug } : {}),
      });
      setImportedFile("CV check");
      setStepRaw(0);
    };
    if (hasExistingDraft) {
      setImportConfirm({ description: "This replaces your current draft with the information from your CV check.", onConfirm: applyHandoffImport });
      return;
    }
    applyHandoffImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !search.role) return;
    void navigate({ to: "/builder", search: { from: undefined, role: undefined }, replace: true });
    if (!data.targetRoleSlug) {
      setData((d) => ({ ...d, targetRoleSlug: search.role }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  async function doFileImport(file: File) {
    setImporting(true);
    setImportedFile(null);
    try {
      const cvText = await extractTextFromFile(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await parseCvForBuilder({ data: { cvText } } as any);
      setData({ ...parsed, templateId: data.templateId });
      setImportedFile(file.name);
      setStepRaw(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("scanned image") || msg.includes("encrypted or corrupted")) {
        setShowPasteFallback(true);
      } else {
        toast.error(msg || "Could not read this file — please try a .docx or .txt version.");
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleImportCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (data.personal.fullName) {
      setImportConfirm({
        description: "This will replace your current draft with the imported file content.",
        onConfirm: () => void doFileImport(file),
      });
      return;
    }
    await doFileImport(file);
  }

  async function handlePasteImport() {
    const text = pasteText.trim();
    if (text.length < 50) { toast.error("Please paste more text — at least a few lines of your CV."); return; }
    setParsingPaste(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await parseCvForBuilder({ data: { cvText: text } } as any);
      setData({ ...parsed, templateId: data.templateId });
      setImportedFile("pasted text");
      setShowPasteFallback(false);
      setPasteText("");
      setStepRaw(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not parse the CV text. Please check the content and try again.");
    } finally {
      setParsingPaste(false);
    }
  }

  const onPatch = (patch: Partial<ResumeData>) => setData((d) => ({ ...d, ...patch }));

  // ── Section content (memoised) ─────────────────────────────────────────────
  const sectionProps = { data, onChange: onPatch };

  const sections = useMemo(
    () => [
      { ...STEPS[0], content: <PersonalSection {...sectionProps} showErrors={showErrors && step === 0} /> },
      { ...STEPS[1], content: <ExperienceSection {...sectionProps} showErrors={showErrors && step === 1} /> },
      { ...STEPS[2], content: <EducationSection {...sectionProps} /> },
      { ...STEPS[3], content: <SkillsSection {...sectionProps} /> },
      { ...STEPS[4], content: <CertificationsSection {...sectionProps} /> },
      { ...STEPS[5], content: <HospitalitySection {...sectionProps} /> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, showErrors, step],
  );

  if (!hydrated) return null;

  const isLastStep = step === STEPS.length - 1;
  const completedArr = [...completedSteps];

  return (
    <div className="min-h-screen bg-background [--bh:3.75rem]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="no-print sticky top-0 z-30 h-[--bh] border-b-half border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/GetHired-logo.png" alt="GetHired" className="h-9 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => importFileRef.current?.click()}
              disabled={importing}
              className="hidden sm:inline-flex"
            >
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading CV…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Import CV</>
              )}
            </Button>
            <input ref={importFileRef} type="file" accept=".txt,.text,.docx,.pdf" className="hidden" onChange={handleImportCv} />
          </div>
        </div>
      </header>

      {/* ── Mobile tab switcher ───────────────────────────────────────────── */}
      <div className="no-print sticky top-[--bh] z-20 flex border-b border-border bg-background lg:hidden">
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            aria-selected={mobileTab === tab}
            role="tab"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              mobileTab === tab
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "edit" ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {tab === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">

        {/* ── Form column ───────────────────────────────────────────────── */}
        <div
          className={cn(
            "no-print border-r border-border bg-background overflow-wrap-anywhere",
            mobileTab === "edit" ? "block" : "hidden lg:block",
          )}
        >

          {/* ── MOBILE WIZARD (hidden on lg+) ─────────────────────────── */}
          <div className="flex flex-col lg:hidden" style={{ height: "calc(100dvh - var(--bh) - 2.5rem)" }}>

            {/* Sticky progress bar */}
            <div className="relative shrink-0 border-b border-border bg-background px-4 py-3">
              <StepProgress
                steps={STEPS}
                current={step}
                completed={completedArr}
                onJump={goTo}
              />
              {/* Saved indicator */}
              {savedVisible && (
                <span className="saved-fade pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Saved
                </span>
              )}
            </div>

            {/* Scrollable step content */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">

              {/* Welcome-back banner */}
              {showWelcomeBanner && (
                <div
                  className="mb-4 flex items-start justify-between gap-2 rounded-lg px-[14px] py-[10px] text-[13px]"
                  className="bg-muted"
                >
                  <span className="text-foreground">
                    Welcome back — you left off at{" "}
                    <strong>{STEPS[initialLastStep.current]?.label}</strong>.{" "}
                    <button
                      className="font-medium underline"
                      onClick={() => { setWelcomeDismissed(true); goTo(initialLastStep.current); }}
                    >
                      Continue →
                    </button>
                  </span>
                  <button
                    onClick={() => setWelcomeDismissed(true)}
                    aria-label="Dismiss"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Import banner */}
              {importedFile && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1">
                    <span className="font-medium">CV imported from {importedFile}.</span>{" "}
                    Review each section and edit as needed.
                  </span>
                  <button type="button" onClick={() => setImportedFile(null)} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Paste fallback */}
              {showPasteFallback && (
                <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">This PDF appears to be a scanned image</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Open your CV in Word or Google Docs, select all, copy, and paste it below — or upload a .docx version instead.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setShowPasteFallback(false); setPasteText(""); }} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Textarea className="mt-2" rows={8} placeholder="Paste your CV text here…" value={pasteText} onChange={(ev) => setPasteText(ev.target.value)} />
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" onClick={handlePasteImport} disabled={parsingPaste || pasteText.trim().length < 50}>
                      {parsingPaste ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing…</> : <><ClipboardPaste className="mr-2 h-4 w-4" />Import from text</>}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {pasteText.trim().length < 50 ? `${pasteText.trim().length} / 50 chars minimum` : "Ready to import"}
                    </span>
                  </div>
                </div>
              )}

              {/* Active step — only this section is in the DOM */}
              <div key={animKey} className={slideDir === "right" ? "wizard-slide-right" : "wizard-slide-left"}>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  {STEPS[step].label}
                </h2>
                {sections[step].content}
              </div>
            </div>
          </div>

          {/* ── DESKTOP ACCORDION (shown on lg+) ──────────────────────── */}
          <div className="hidden lg:block">
            <div className="space-y-5 p-4 sm:p-6 lg:p-8">
              <div>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">Build your resume</h1>
                <p className="mt-1 text-sm text-muted-foreground">Fill in each section. The preview updates as you type.</p>

                {showPasteFallback && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">This PDF appears to be a scanned image</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Open your CV in Word or Google Docs, select all, copy, and paste it below — or upload a .docx version instead.</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setShowPasteFallback(false); setPasteText(""); }} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Textarea className="mt-2" rows={8} placeholder="Paste your CV text here…" value={pasteText} onChange={(ev) => setPasteText(ev.target.value)} />
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" onClick={handlePasteImport} disabled={parsingPaste || pasteText.trim().length < 50}>
                        {parsingPaste ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing…</> : <><ClipboardPaste className="mr-2 h-4 w-4" />Import from text</>}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {pasteText.trim().length < 50 ? `${pasteText.trim().length} / 50 chars minimum` : "Ready to import"}
                      </span>
                    </div>
                  </div>
                )}

                {importedFile && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1">
                      <span className="font-medium">CV imported from {importedFile}.</span>{" "}
                      Review each section and edit as needed — some fields may need manual entry.
                    </span>
                    <button type="button" onClick={() => setImportedFile(null)} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {syncing ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Saving…
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    {resumeId ? "Saved to cloud" : "Auto-saved locally"}
                  </span>
                )}
              </div>

              <StepProgress steps={STEPS} current={step} completed={completedArr} onJump={setStepRaw} />

              <div className="space-y-3">
                {sections.map((s, i) => (
                  <Section
                    key={s.id}
                    step={i + 1}
                    title={s.label}
                    icon={s.icon}
                    subtitle={subtitleFor(s.id)}
                    defaultOpen={i === step}
                    active={i === step}
                  >
                    {s.content}
                  </Section>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button variant="outline" onClick={() => setStepRaw((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() =>
                    setStepRaw((s) => {
                      const next = Math.min(STEPS.length - 1, s + 1);
                      document.getElementById(`section-${next + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      return next;
                    })
                  }
                  disabled={step === STEPS.length - 1}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Preview column (unchanged) ─────────────────────────────── */}
        <div
          className={cn(
            "bg-muted/30 lg:sticky lg:top-[--bh] lg:h-[calc(100dvh-var(--bh))]",
            mobileTab === "preview" ? "block" : "hidden lg:block",
          )}
        >
          <PreviewPanel
            data={data}
            onTemplateChange={(id) => onPatch({ templateId: id })}
            onFormattingChange={(formatting) => onPatch({ formatting })}
          />
        </div>
      </main>

      {/* ── Floating "Preview CV" button (mobile only, < 640px) ─────────── */}
      {/* Hidden at sm: breakpoint (640px+); visible on narrower screens only */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="sm:hidden fixed z-40 bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d6b5e]"
        aria-label="Open full-screen CV preview"
      >
        <Eye className="h-4 w-4" />
        Preview CV
      </button>

      {/* ── Mobile bottom CTA bar ─────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2 border-t-half border-border bg-background px-4 py-3">
        {/* Back arrow — invisible on step 0 to preserve layout */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className={cn(
            "flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
            step === 0 && "invisible pointer-events-none",
          )}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Skip for now — P1, optional steps 3–6 (indices 2–5), not on last step */}
        {step >= 2 && step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            className="whitespace-nowrap text-sm text-muted-foreground underline underline-offset-2"
          >
            Skip for now
          </button>
        )}

        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleContinue}
          className="ml-auto min-h-[48px] rounded-lg bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0d6b5e]"
        >
          {isLastStep ? "Preview CV →" : "Continue →"}
        </button>
      </div>

      {/* ── Mobile preview modal (spec 03) ───────────────────────────────── */}
      <MobilePreviewModal
        data={data}
        onTemplateChange={(id) => onPatch({ templateId: id })}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      {/* ── Import confirm dialog (unchanged) ────────────────────────────── */}
      <AlertDialog open={importConfirm !== null} onOpenChange={(open) => { if (!open) setImportConfirm(null); }}>
        <AlertDialogContent className="mx-4 w-[calc(100%-2rem)] max-w-md px-6 pb-safe-bottom sm:mx-auto sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Import your CV data?</AlertDialogTitle>
            <AlertDialogDescription>{importConfirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel onClick={() => setImportConfirm(null)}>Keep current draft</AlertDialogCancel>
            <AlertDialogAction onClick={() => { importConfirm?.onConfirm(); setImportConfirm(null); }}>
              Import data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function subtitleFor(id: string): string {
  switch (id) {
    case "personal": return "Contact details, photo and your professional summary";
    case "experience": return "Restaurants, bars, hotels — most recent first";
    case "education": return "Schools, hospitality programmes and apprenticeships";
    case "skills": return "Soft skills, technical strengths, service techniques";
    case "certifications": return "WSET, ServSafe, BarSmarts, sommelier titles…";
    case "hospitality": return "Wine, spirits, POS, languages, service style";
    default: return "";
  }
}
