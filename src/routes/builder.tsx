import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useResumeStore } from "@/lib/resume-store";
import { ResumeData } from "@/types/resume";
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
import { ArrowLeft, ArrowRight, Sparkles, Eye, Pencil, User, Briefcase, GraduationCap, Star, Award, Wine, Check, Loader2, Cloud, Upload, X, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/extractCvText";
import { parseCvForBuilder } from "@/lib/parseCvForBuilder";
import { consumeCvImport } from "@/lib/cv-import-handoff";
import { mapParsedCvToBuilderForm } from "@/lib/map-parsed-cv-to-builder";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/builder")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'import' ? ('import' as const) : undefined,
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
  { id: "personal", label: "Personal", icon: User },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Star },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "hospitality", label: "Hospitality", icon: Wine },
];

function BuilderPage() {
  const { data, setData, hydrated, syncing, resumeId } = useResumeStore();
  const [step, setStep] = useState(0);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [importing, setImporting] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importConfirm, setImportConfirm] = useState<{
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const search = useSearch({ from: "/builder" });
  const navigate = useNavigate();

  // Consume a CV import handoff from the checker (one-time, session-scoped)
  useEffect(() => {
    if (!hydrated || search.from !== 'import') return;

    // Strip the query param regardless of outcome so a refresh doesn't re-trigger
    void navigate({ to: '/builder', search: { from: undefined }, replace: true });

    const imported = consumeCvImport();
    if (!imported) return; // expired or already consumed

    const hasExistingDraft = Boolean(data.personal.fullName);
    const applyHandoffImport = () => {
      setData({ ...mapParsedCvToBuilderForm(imported), templateId: data.templateId });
      setImportedFile("CV check");
      setStep(0);
    };

    if (hasExistingDraft) {
      setImportConfirm({
        description: "This replaces your current draft with the information from your CV check.",
        onConfirm: applyHandoffImport,
      });
      return;
    }

    applyHandoffImport();
  // Run once after hydration when the param is present
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  // Paste-text fallback — shown when a scanned/image PDF is uploaded
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsingPaste, setParsingPaste] = useState(false);

  async function doFileImport(file: File) {
    setImporting(true);
    setImportedFile(null);
    try {
      const cvText = await extractTextFromFile(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await parseCvForBuilder({ data: { cvText } } as any);
      // Preserve current template selection
      setData({ ...parsed, templateId: data.templateId });
      setImportedFile(file.name);
      setStep(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("scanned image") || msg.includes("encrypted or corrupted")) {
        // Show paste-text fallback instead of a dead-end error toast
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
    // Reset input so re-uploading same file triggers onChange
    e.target.value = "";

    // Warn if user has real work in progress (not just sample/empty state)
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
    if (text.length < 50) {
      toast.error("Please paste more text — at least a few lines of your CV.");
      return;
    }
    setParsingPaste(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await parseCvForBuilder({ data: { cvText: text } } as any);
      setData({ ...parsed, templateId: data.templateId });
      setImportedFile("pasted text");
      setShowPasteFallback(false);
      setPasteText("");
      setStep(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not parse the CV text. Please check the content and try again.");
    } finally {
      setParsingPaste(false);
    }
  }

  const onPatch = (patch: Partial<ResumeData>) => setData((d) => ({ ...d, ...patch }));

  const sectionProps = { data, onChange: onPatch };

  const sections = useMemo(
    () => [
      { ...STEPS[0], content: <PersonalSection {...sectionProps} /> },
      { ...STEPS[1], content: <ExperienceSection {...sectionProps} /> },
      { ...STEPS[2], content: <EducationSection {...sectionProps} /> },
      { ...STEPS[3], content: <SkillsSection {...sectionProps} /> },
      { ...STEPS[4], content: <CertificationsSection {...sectionProps} /> },
      { ...STEPS[5], content: <HospitalitySection {...sectionProps} /> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  if (!hydrated) return null;

  return (
    // --bh (builder header height) is consumed by the sticky tab bar and preview column
    <div className="min-h-screen bg-background [--bh:3.75rem]">
      {/* Header — height controlled by --bh CSS variable */}
      <header className="no-print sticky top-0 z-30 h-[--bh] border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">Plate &amp; Pen</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Hospitality CV Studio
              </p>
            </div>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading CV…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Import CV</>
              )}
            </Button>
            <input
              ref={importFileRef}
              type="file"
              accept=".txt,.text,.docx,.pdf"
              className="hidden"
              onChange={handleImportCv}
            />
          </div>
        </div>
      </header>

      {/* Mobile tab switcher */}
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
        {/* Form column */}
        <div
          className={cn(
            "no-print min-h-[calc(100dvh-var(--bh))] overflow-wrap-anywhere border-r border-border bg-background",
            mobileTab === "edit" ? "block" : "hidden lg:block",
          )}
        >
          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Build your resume</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill in each section. The preview updates as you type.
              </p>

              {/* Paste-text fallback — shown when a scanned/image PDF is detected */}
              {showPasteFallback && (
                <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          This PDF appears to be a scanned image
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          We can't extract text from image-based PDFs. Open your CV in Word or Google Docs, select all, copy, and paste it below — or upload a .docx version instead.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowPasteFallback(false); setPasteText(""); }}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Textarea
                    className="mt-2"
                    rows={8}
                    placeholder="Paste your CV text here…"
                    value={pasteText}
                    onChange={(ev) => setPasteText(ev.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handlePasteImport}
                      disabled={parsingPaste || pasteText.trim().length < 50}
                    >
                      {parsingPaste ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing…</>
                      ) : (
                        <><ClipboardPaste className="mr-2 h-4 w-4" />Import from text</>
                      )}
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
                  <button
                    type="button"
                    onClick={() => setImportedFile(null)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {syncing ? (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </span>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  {resumeId ? <Cloud className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {resumeId ? "Saved to cloud" : "Auto-saved locally"}
                </span>
              )}
            </div>

            <StepProgress steps={STEPS} current={step} onJump={setStep} />

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
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() =>
                  setStep((s) => {
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

        {/* Preview column */}
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

      <AlertDialog open={importConfirm !== null} onOpenChange={(open) => { if (!open) setImportConfirm(null); }}>
        <AlertDialogContent className="mx-4 w-[calc(100%-2rem)] max-w-md px-6 pb-safe-bottom sm:mx-auto sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Import your CV data?</AlertDialogTitle>
            <AlertDialogDescription>
              {importConfirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel onClick={() => setImportConfirm(null)}>
              Keep current draft
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                importConfirm?.onConfirm();
                setImportConfirm(null);
              }}
            >
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
