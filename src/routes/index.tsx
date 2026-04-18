import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { ArrowLeft, ArrowRight, Download, RefreshCw, Sparkles, Eye, Pencil, User, Briefcase, GraduationCap, Star, Award, Wine, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
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
  { id: "personal", label: "Personal" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "certifications", label: "Certifications" },
  { id: "hospitality", label: "Hospitality" },
];

function BuilderPage() {
  const { data, setData, reset, loadSample, hydrated } = useResumeStore();
  const [step, setStep] = useState(0);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  const onPatch = (patch: Partial<ResumeData>) => setData((d) => ({ ...d, ...patch }));

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data.personal.fullName || "resume").replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Resume JSON downloaded");
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
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
            <Button variant="ghost" size="sm" onClick={loadSample} className="hidden sm:inline-flex">
              <Sparkles className="mr-2 h-4 w-4" /> Sample
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { reset(); toast.message("Cleared"); }} className="hidden sm:inline-flex">
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button variant="default" size="sm" onClick={downloadJSON}>
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile tab switcher */}
      <div className="no-print sticky top-[60px] z-20 flex border-b border-border bg-background lg:hidden">
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium ${mobileTab === "edit" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMobileTab("edit")}
        >
          <Pencil className="mr-1.5 inline h-4 w-4" /> Edit
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium ${mobileTab === "preview" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMobileTab("preview")}
        >
          <Eye className="mr-1.5 inline h-4 w-4" /> Preview
        </button>
      </div>

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Form column */}
        <div
          className={`no-print min-h-[calc(100vh-60px)] border-r border-border bg-background ${mobileTab === "edit" ? "block" : "hidden lg:block"}`}
        >
          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Build your resume</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill in each section. The preview updates as you type — and your work is auto-saved locally.
              </p>
            </div>

            <StepProgress steps={STEPS} current={step} onJump={setStep} />

            <div className="space-y-3">
              {sections.map((s, i) => (
                <Section
                  key={s.id}
                  step={i + 1}
                  title={s.label}
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
          className={`bg-muted/30 lg:sticky lg:top-[60px] lg:h-[calc(100vh-60px)] ${mobileTab === "preview" ? "block" : "hidden lg:block"}`}
        >
          <PreviewPanel data={data} onTemplateChange={(id) => onPatch({ templateId: id })} />
        </div>
      </main>
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
