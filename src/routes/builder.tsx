import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AppHeader } from "@/components/ui/AppHeader";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useResumeStore } from "@/lib/resume-store";
import { ResumeData, STORAGE_KEY } from "@/types/resume";
import { Section } from "@/components/builder/Section";
import { StepProgress } from "@/components/builder/StepProgress";
import { BottomNav } from "@/components/builder/BottomNav";
import { TemplatesPanel } from "@/components/builder/TemplatesPanel";
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
import { Check, Loader2, Upload, X, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { MobilePreviewModal } from "@/components/builder/MobilePreviewModal";
import { extractTextFromFile } from "@/lib/extractCvText";
import { parseCvForBuilder } from "@/lib/parseCvForBuilder";
import { consumeCvImport } from "@/lib/cv-import-handoff";
import { mapParsedCvToBuilderForm } from "@/lib/map-parsed-cv-to-builder";
import { pdf } from "@react-pdf/renderer";
import { ResumePDF } from "@/lib/pdf/ResumePDF";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/clarity";

export function BuilderSkeleton() {
  return (
    <div data-testid="builder-skeleton" style={{ minHeight: '100vh', background: 'var(--surface-warm, #f7f7f5)' }}>
      {/* Header placeholder */}
      <div style={{ height: 56, background: 'var(--color-primary, #0d9488)' }} />
      {/* Step pill bar placeholder */}
      <div style={{ height: 48, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ height: 28, width: 72, borderRadius: 14, background: '#e5e7eb', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      {/* Form skeleton */}
      <div style={{ maxWidth: 680, margin: '24px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[120, 80, 80, 80].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 12, background: '#e5e7eb', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )
}

export const Route = createFileRoute("/builder")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === "import" ? ("import" as const) : undefined,
    role: typeof search.role === "string" && search.role.length > 0 ? search.role : undefined,
  }),
  head: () => ({
    meta: [
      { title: "GetHired — Resume Builder for Hospitality Pros" },
      {
        name: "description",
        content:
          "A modern resume builder for waiters, sommeliers, bartenders and chefs. Live preview, 7 editorial templates, hospitality-specific sections.",
      },
      { property: "og:title", content: "GetHired — Resume Builder for Hospitality" },
      {
        property: "og:description",
        content: "Build a beautiful, hospitality-focused CV with live preview and 7 templates.",
      },
    ],
  }),
  component: BuilderPage,
});

const BUILDER_SECTIONS = [
  { id: "personal",       label: "Personal", subtitle: "Contact details, photo and your professional summary" },
  { id: "experience",     label: "Experience", subtitle: "Restaurants, bars, hotels — most recent first" },
  { id: "education",      label: "Education", subtitle: "Schools, hospitality programmes and apprenticeships" },
  { id: "skills",         label: "Skills",        subtitle: "Soft skills, technical strengths, service techniques" },
  { id: "certifications", label: "Certifications", subtitle: "WSET, ServSafe, BarSmarts, sommelier titles…" },
  { id: "hospitality",    label: "Hospitality", subtitle: "Wine, spirits, POS, languages, service style" },
];

function BuilderPage() {
  const { data, setData, hydrated, syncing, resumeId, setTemplateColours, resetTemplateColours, loadSample } = useResumeStore();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"edit" | "templates" | "preview">("edit");

  // ── Mobile preview modal ───────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── CV import ─────────────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importConfirm, setImportConfirm] = useState<{
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsingPaste, setParsingPaste] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('personal');
  const [downloading, setDownloading] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSection(prev => {
      const next = prev === id ? null : id;
      if (next !== null) {
        // Scroll into view after state update paints
        setTimeout(() => {
          document.getElementById(`section-${id}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 50);
      }
      return next;
    });
  };

  const search = useSearch({ from: "/builder" });
  const navigate = useNavigate();

  // ── iOS keyboard scroll fix ────────────────────────────────────────────────
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 320);
      }
    };
    document.addEventListener("focus", handleFocus, true);

    const handleResize = () => {
      const f = document.activeElement as HTMLElement;
      if (f && (f.tagName === "INPUT" || f.tagName === "TEXTAREA")) {
        setTimeout(() => f.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      }
    };
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("focus", handleFocus, true);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  // ── Funnel: builder entered ────────────────────────────────────────────────
  useEffect(() => {
    trackEvent('builder_entered');
  }, []);

  // ── CV import from handoff (ATS checker → builder) ─────────────────────────
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
    trackEvent('cv_upload_started');
    try {
      const cvText = await extractTextFromFile(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await parseCvForBuilder({ data: { cvText } } as any);
      setData({ ...parsed, templateId: data.templateId });
      setImportedFile(file.name);
      trackEvent('cv_upload_succeeded');
    } catch (err) {
      trackEvent('cv_upload_failed');
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not parse the CV text. Please check the content and try again.");
    } finally {
      setParsingPaste(false);
    }
  }

  const onPatch = (patch: Partial<ResumeData>) => setData((d) => ({ ...d, ...patch }));
  const sectionProps = { data, onChange: onPatch };

  // ── PDF download ────────────────────────────────────────────────────────────
  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    trackEvent('export_triggered');
    try {
      const fileName = `${(data.personal.fullName || "resume").replace(/\s+/g, "_")}_CV.pdf`;
      const blob = await pdf(<ResumePDF data={data} formatting={data.formatting} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      trackEvent('export_succeeded');
    } catch (err) {
      trackEvent('export_failed');
      const msg = err instanceof Error ? err.message : 'Could not generate PDF. Please try again.';
      toast.error(`Download failed: ${msg}`);
    } finally {
      setDownloading(false);
    }
  }

  if (!hydrated) return <BuilderSkeleton />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-warm, #f7f7f5)' }}>

      {/* ── Teal header ─────────────────────────────────────────────────────── */}
      <AppHeader />

      {/* ── Step pill bar (edit tab only) ────────────────────────────────────── */}
      <StepProgress
        sections={BUILDER_SECTIONS}
        activeTab={activeTab}
        onSectionOpen={(id) => setOpenSection(id)}
      />

      {/* ── PDF loading overlay ───────────────────────────────────────────────── */}
      {downloading && (
        <div
          data-testid="pdf-loading"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 12, padding: '24px 32px',
            display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 500,
          }}>
            <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
            Generating PDF…
          </div>
        </div>
      )}

      {/* ── Builder body ──────────────────────────────────────────────────────── */}
      <div
        style={{ display: 'grid' }}
        className="builder-layout"
      >

        {/* ── EDIT panel ────────────────────────────────────────────────────── */}
        <div
          className={cn(activeTab === "edit" ? "block" : "hidden lg:block")}
          style={{ overflowY: 'auto' }}
        >
          {/* Import CV banner + controls */}
          <div style={{ padding: '12px 12px 0' }}>
            {/* Import CV button row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: importedFile || showPasteFallback ? '8px' : '0' }}>
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                disabled={importing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--brand)',
                  background: 'var(--brand-light, #eaf8f5)',
                  border: '1px solid var(--brand-light, #eaf8f5)',
                  borderRadius: '6px',
                  padding: '0 10px',
                  height: '32px',
                  minHeight: '32px',
                  cursor: importing ? 'default' : 'pointer',
                  opacity: importing ? 0.6 : 1,
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
              >
                {importing ? (
                  <><Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />Reading CV…</>
                ) : (
                  <><Upload style={{ width: 12, height: 12 }} />Import CV</>
                )}
              </button>

              {/* Load example CV button — only shows when the form is empty */}
              {!data.personal.fullName && (
                <button
                  type="button"
                  onClick={loadSample}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#666',
                    background: 'transparent',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '0 10px',
                    height: '32px',
                    minHeight: '32px',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  } as React.CSSProperties}
                >
                  Load example CV
                </button>
              )}
            </div>
            <input ref={importFileRef} type="file" accept=".txt,.text,.docx,.pdf" className="hidden" onChange={handleImportCv} />

            {/* Import success banner */}
            {importedFile && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', marginBottom: '4px',
              }}>
                <Check style={{ width: 14, height: 14, color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                <span style={{ flex: 1 }}>
                  <strong>CV imported from {importedFile}.</strong>{" "}
                  Review each section and edit as needed.
                </span>
                <button type="button" onClick={() => setImportedFile(null)} aria-label="Dismiss"
                  style={{ flexShrink: 0, color: '#888', background: 'none', border: 'none', cursor: 'pointer', minHeight: 'unset', padding: 0 }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}

            {/* Paste fallback panel */}
            {showPasteFallback && (
              <div style={{
                background: '#fafafa', border: '1px solid var(--border-brand)',
                borderRadius: '8px', padding: '12px', marginBottom: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ClipboardPaste style={{ width: 14, height: 14, color: '#888', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>This PDF appears to be a scanned image</p>
                      <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>Open your CV in Word or Google Docs, copy all, and paste below — or upload a .docx instead.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setShowPasteFallback(false); setPasteText(""); }}
                    aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', minHeight: 'unset', padding: 0 }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                <Textarea rows={6} placeholder="Paste your CV text here…" value={pasteText} onChange={ev => setPasteText(ev.target.value)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <Button size="sm" onClick={handlePasteImport} disabled={parsingPaste || pasteText.trim().length < 50}>
                    {parsingPaste ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing…</> : <><ClipboardPaste className="mr-2 h-4 w-4" />Import from text</>}
                  </Button>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {pasteText.trim().length < 50 ? `${pasteText.trim().length} / 50 chars min` : "Ready"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section accordions */}
          <div style={{ paddingBottom: '16px' }}>
            <Section id="personal" title="Personal details" isOpen={openSection === 'personal'} onToggle={() => toggleSection('personal')}>
              <PersonalSection {...sectionProps} showErrors={false} />
            </Section>
            <Section id="experience" title="Work experience" isOpen={openSection === 'experience'} onToggle={() => toggleSection('experience')}>
              <ExperienceSection {...sectionProps} showErrors={false} />
            </Section>
            <Section id="education" title="Education" isOpen={openSection === 'education'} onToggle={() => toggleSection('education')}>
              <EducationSection {...sectionProps} />
            </Section>
            <Section id="skills" title="Skills" isOpen={openSection === 'skills'} onToggle={() => toggleSection('skills')}>
              <SkillsSection {...sectionProps} />
            </Section>
            <Section id="certifications" title="Certifications" isOpen={openSection === 'certifications'} onToggle={() => toggleSection('certifications')}>
              <CertificationsSection {...sectionProps} />
            </Section>
            <Section id="hospitality" title="Hospitality profile" isOpen={openSection === 'hospitality'} onToggle={() => toggleSection('hospitality')}>
              <HospitalitySection {...sectionProps} />
            </Section>
          </div>
        </div>

        {/* ── TEMPLATES panel (mobile only) ─────────────────────────────────── */}
        <div className={cn(activeTab === "templates" ? "block lg:hidden" : "hidden")}>
          <TemplatesPanel
            selectedId={data.templateId}
            onSelect={(id) => onPatch({ templateId: id })}
          />
        </div>

        {/* ── PREVIEW panel ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            "preview-panel-outer",
            activeTab === "preview" ? "block" : "hidden lg:block",
          )}
        >
          <PreviewPanel
            data={data}
            onTemplateChange={(id) => onPatch({ templateId: id })}
            onFormattingChange={(formatting) => onPatch({ formatting })}
            onColourChange={(slot, value) => setTemplateColours(data.templateId, { [slot]: value })}
            onColourReset={() => resetTemplateColours(data.templateId)}
          />
        </div>
      </div>

      {/* ── Bottom navigation (mobile only) ──────────────────────────────────── */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDownload={handleDownload}
      />

      {/* ── Mobile preview modal ──────────────────────────────────────────────── */}
      <MobilePreviewModal
        data={data}
        onTemplateChange={(id) => onPatch({ templateId: id })}
        onColourChange={(slot, value) => setTemplateColours(data.templateId, { [slot]: value })}
        onColourReset={() => resetTemplateColours(data.templateId)}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      {/* ── Import confirm dialog ─────────────────────────────────────────────── */}
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
