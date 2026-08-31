import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AppHeader } from "@/components/ui/AppHeader";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useResumeStore } from "@/lib/resume-store";
import { ResumeData, STORAGE_KEY, sampleResume } from "@/types/resume";
import { Section } from "@/components/builder/Section";
import { StepProgress } from "@/components/builder/StepProgress";
import { BottomCta } from "@/components/builder/BottomCta";
import { PreviewPanel } from "@/components/builder/PreviewPanel";
import { StyleDrawer } from "@/components/builder/StyleDrawer";
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
import { Check, Loader2, Upload, X, ClipboardPaste, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { MobilePreviewModal } from "@/components/builder/MobilePreviewModal";
import { extractTextFromFile } from "@/lib/extractCvText";
import { parseCvForBuilder, enrichImportedCv } from "@/lib/parseCvForBuilder";
import { consumeCvImport } from "@/lib/cv-import-handoff";
import { hydrateBuilderFromHandoff } from "@/lib/map-parsed-cv-to-builder";
import { ImprovementChecklist } from "@/components/builder/ImprovementChecklist";
import type { BuilderSectionId } from "@/types/checker-audit";
import { pdf } from "@react-pdf/renderer";
import { ResumePDF } from "@/lib/pdf/ResumePDF";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/clarity";
import { MobileModeSwitcher } from "@/components/builder/MobileModeSwitcher";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { trackLeadJourney } from "@/lib/cruise-cv-check";
import { readActiveLeadId, type JourneyStage } from "@/lib/leads";

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

/**
 * Does a section hold user-entered content? Drives which accordions are
 * expanded by default on load — content-bearing sections open, empty ones
 * collapsed. Defensive against partially-shaped data during import.
 */
function sectionHasContent(id: string, d: ResumeData): boolean {
  switch (id) {
    case "personal": {
      const p = d.personal;
      return Boolean(p?.fullName || p?.email || p?.phone || p?.title || p?.location || d.summary);
    }
    case "experience":     return (d.experience?.length ?? 0) > 0;
    case "education":      return (d.education?.length ?? 0) > 0;
    case "skills":         return (d.skills?.length ?? 0) > 0;
    case "certifications": return (d.certifications?.length ?? 0) > 0;
    case "hospitality": {
      const h = d.hospitality;
      if (!h) return false;
      return (
        (h.serviceStyles?.length ?? 0) > 0 ||
        (h.posSystems?.length ?? 0) > 0 ||
        (h.wineKnowledge && h.wineKnowledge !== "None") ||
        (h.spiritsKnowledge && h.spiritsKnowledge !== "None") ||
        Boolean(h.allergens) ||
        Boolean(h.foodSafety) ||
        // languages defaults to a single English entry — treat that as empty
        (h.languages?.length ?? 0) > 1
      );
    }
    default: return false;
  }
}

function BuilderPage() {
  const { data, setData, hydrated, syncing, resumeId, setTemplateColours, resetTemplateColours, loadSample } = useResumeStore();

  // ── Tab state ──────────────────────────────────────────────────────────────
  // Two top-level modes only. Template/style choice is a drawer over Preview
  // (Step 7), not a third mode.
  //
  // activeTab is *mobile* state: below 1024px it picks which single pane is on
  // screen. At >=1024px both panes are always up, so nothing may read it —
  // the mode switcher is not even reachable there, which means a stale value
  // could never be corrected by the user. Step 8 routes every layout decision
  // through isDesktop first and only falls back to activeTab below the split.
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const isDesktop = useIsDesktop();

  // ── Style drawer (Step 7) ──────────────────────────────────────────────────
  const [styleDrawerOpen, setStyleDrawerOpen] = useState(false);

  // ── Mobile preview modal ───────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Preview zoom lightbox (Step 5) ─────────────────────────────────────────
  // Owned by PreviewPanel; mirrored here only so the pinned CTA can step aside.
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
  // Multi-open accordion: any number of sections may be expanded at once.
  // Seeded once after hydration from which sections hold content (see effect).
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set<string>(['personal']));
  const didInitOpenRef = useRef(false);
  const didImportRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const trackedJourneyStagesRef = useRef<Set<JourneyStage>>(new Set());

  const trackActiveJourney = (stage: JourneyStage, fullName?: string) => {
    if (trackedJourneyStagesRef.current.has(stage)) return;
    const leadId = readActiveLeadId();
    if (!leadId) return;
    trackedJourneyStagesRef.current.add(stage);
    void trackLeadJourney({
      data: {
        leadId,
        stage,
        fullName: fullName?.trim() || undefined,
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).then((result: { ok?: boolean }) => {
      if (!result?.ok) trackedJourneyStagesRef.current.delete(stage);
    }).catch(() => {
      trackedJourneyStagesRef.current.delete(stage);
    });
  };

  const toggleSection = (id: string) => {
    const willOpen = !openSections.has(id);
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (willOpen) {
      // Scroll into view after state update paints
      setTimeout(() => {
        document.getElementById(`section-${id}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 50);
    }
  };

  // Ensure every content-bearing section is expanded (used on import).
  const openContentSections = (d: ResumeData) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      for (const s of BUILDER_SECTIONS) {
        if (sectionHasContent(s.id, d)) next.add(s.id);
      }
      return next;
    });
  };

  // Load the sample CV and expand the sections it fills.
  const handleLoadSample = () => {
    loadSample();
    openContentSections(sampleResume);
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

  useEffect(() => {
    if (!hydrated) return;
    trackActiveJourney('builder_opened', data.personal.fullName);
    // The active lead and initial name are read once when the hydrated builder opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ── Seed accordion open-state from content (once, after hydration) ─────────
  useEffect(() => {
    if (!hydrated || didInitOpenRef.current) return;
    didInitOpenRef.current = true;
    const initial = new Set(BUILDER_SECTIONS.map(s => s.id).filter(id => sectionHasContent(id, data)));
    // Never leave the whole form collapsed — Personal is the natural entry point.
    if (initial.size === 0) initial.add('personal');
    setOpenSections(initial);
  }, [hydrated, data]);

  // ── CV import from handoff (ATS checker → builder) ─────────────────────────
  useEffect(() => {
    if (!hydrated || search.from !== "import" || didImportRef.current) return;
    void navigate({ to: "/builder", search: { from: undefined, role: undefined }, replace: true });
    const imported = consumeCvImport();
    if (!imported) return;
    didImportRef.current = true;
    const hasExistingDraft = Boolean(data.personal.fullName);
    const applyHandoffImport = () => {
      void (async () => {
        let next = hydrateBuilderFromHandoff(data, imported);
        const source = imported.sourceText?.trim() ?? "";
        if (source.length >= 50) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            next = await enrichImportedCv({ data: { resume: next, cvText: source } } as any);
          } catch {
            // Keep the local parse if enrichment fails.
          }
        }
        setData(next);
        setImportedFile("CV check");
        openContentSections(next);
        trackActiveJourney('cv_edited', next.personal.fullName);
      })();
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
      const next = { ...parsed, templateId: data.templateId };
      setData(next);
      setImportedFile(file.name);
      openContentSections(next);
      trackActiveJourney('cv_edited', next.personal.fullName);
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
      const next = { ...parsed, templateId: data.templateId };
      setData(next);
      setImportedFile("pasted text");
      openContentSections(next);
      trackActiveJourney('cv_edited', next.personal.fullName);
      setShowPasteFallback(false);
      setPasteText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not parse the CV text. Please check the content and try again.");
    } finally {
      setParsingPaste(false);
    }
  }

  const onPatch = (patch: Partial<ResumeData>) => {
    trackActiveJourney('cv_edited', patch.personal?.fullName ?? data.personal.fullName);
    setData((d) => ({ ...d, ...patch }));
  };
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
      trackActiveJourney('exported', data.personal.fullName);
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

      {/* ── Mobile mode switcher (< 1024px) ──────────────────────────────────── */}
      <MobileModeSwitcher
        activeTab={activeTab}
        onTabChange={(tab) => { setStyleDrawerOpen(false); setActiveTab(tab); }}
      />

      {/* ── Step pill bar (edit tab only) ────────────────────────────────────── */}
      {/* Below the split the nav belongs to the Edit pane and steps aside in
          Preview. At >=1024px the Edit pane is always on screen, so the nav is
          always relevant — and reading activeTab there let a tab chosen at
          mobile width hide it permanently, since the switcher that would set
          it back is display:none at desktop. */}
      <StepProgress
        sections={BUILDER_SECTIONS}
        activeTab={isDesktop ? "edit" : activeTab}
        onSectionOpen={(id) => setOpenSections(prev => (prev.has(id) ? prev : new Set(prev).add(id)))}
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
        {/* Shown because the viewport is wide, or because Edit is the chosen
            mobile tab — never because a CSS breakpoint class out-specifies a
            `hidden` that tab state put there. */}
        <div
          className={cn(isDesktop || activeTab === "edit" ? "block" : "hidden")}
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
                  onClick={handleLoadSample}
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

          <ImprovementChecklist
            resume={data}
            onOpenSection={(id: BuilderSectionId) => {
              setOpenSections((prev) => new Set(prev).add(id));
              setTimeout(() => {
                document.getElementById(`section-${id}`)?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }, 50);
            }}
            onAuditChange={(audit) => setData((d) => ({ ...d, checkerAudit: audit }))}
          />

          {/* Section accordions.
              Bottom padding equals the pinned CTA's height so the last section
              is never hidden behind it at the end of the scroll. */}
          <div
            data-testid="builder-sections"
            style={{ paddingBottom: 'calc(var(--cta-h) + env(safe-area-inset-bottom, 0px))' }}
          >
            <Section id="personal" title="Personal details" isOpen={openSections.has('personal')} onToggle={() => toggleSection('personal')}>
              <PersonalSection {...sectionProps} showErrors={false} />
            </Section>
            <Section id="experience" title="Work experience" isOpen={openSections.has('experience')} onToggle={() => toggleSection('experience')}>
              <ExperienceSection {...sectionProps} showErrors={false} />
            </Section>
            <Section id="education" title="Education" isOpen={openSections.has('education')} onToggle={() => toggleSection('education')}>
              <EducationSection {...sectionProps} />
            </Section>
            <Section id="skills" title="Skills" isOpen={openSections.has('skills')} onToggle={() => toggleSection('skills')}>
              <SkillsSection {...sectionProps} />
            </Section>
            <Section id="certifications" title="Certifications" isOpen={openSections.has('certifications')} onToggle={() => toggleSection('certifications')}>
              <CertificationsSection {...sectionProps} />
            </Section>
            <Section id="hospitality" title="Hospitality profile" isOpen={openSections.has('hospitality')} onToggle={() => toggleSection('hospitality')}>
              <HospitalitySection {...sectionProps} />
            </Section>
          </div>
        </div>

        {/* ── PREVIEW panel ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            "preview-panel-outer",
            isDesktop || activeTab === "preview" ? "block" : "hidden",
          )}
        >
          {/* Style drawer trigger. Lives only in Preview's base view — the
              lightbox renders over it, so it is unreachable while zoomed.
              Top-right below the split; bottom-right at >=1024px, where the
              preview toolbar already occupies the top of the pane and the
              sheet rises from the bottom edge the button sits on. */}
          <button
            type="button"
            id="open-style-drawer-btn"
            data-testid="open-style-drawer-btn"
            aria-haspopup="dialog"
            aria-expanded={styleDrawerOpen}
            onClick={() => setStyleDrawerOpen(true)}
            className="no-print absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-border bg-white/95 px-4 text-xs font-medium text-foreground shadow-sm lg:right-4 lg:top-auto lg:bottom-4 lg:shadow-md"
            style={{ height: 44, minHeight: 44 }}
          >
            <SlidersHorizontal style={{ width: 14, height: 14 }} />
            Customize
          </button>

          {/* Style callbacks now belong to the drawer below — the preview
              toolbar is view + export only (Step 8). */}
          <PreviewPanel
            data={data}
            onLightboxOpenChange={setLightboxOpen}
          />

          {/* ── Style drawer (Step 7, scoped to this pane at >=1024px) ──────── */}
          {/* Rendered inside the preview pane so contained mode can position
              against it. Below 1024px it portals to <body> from here and is
              unaffected by where it sits in the tree. */}
          <StyleDrawer
            isOpen={styleDrawerOpen && (isDesktop || activeTab === "preview") && !lightboxOpen}
            contained={isDesktop}
            onClose={() => setStyleDrawerOpen(false)}
            data={data}
            onTemplateChange={(id) => onPatch({ templateId: id })}
            onFormattingChange={(formatting) => onPatch({ formatting })}
            onColourChange={(slot, value) => setTemplateColours(data.templateId, { [slot]: value })}
            onColourReset={() => resetTemplateColours(data.templateId)}
          />
        </div>
      </div>

      {/* ── Pinned primary CTA (mobile only) ─────────────────────────────────── */}
      {/* Hidden while the preview lightbox owns the screen — it has its own
          bottom controls, and two stacked bars would fight for the thumb. */}
      <BottomCta
        mode={activeTab}
        onPress={handleDownload}
        busy={downloading}
        hidden={lightboxOpen}
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
