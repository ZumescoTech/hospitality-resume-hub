import { ResumeData, PersonalDetails } from "@/types/resume";
import { TextField, Field } from "../Field";
import { PhotoUpload } from "../PhotoUpload";
import { Textarea } from "@/components/ui/textarea";
import { AssistedTextarea } from "../AssistedTextarea";

interface Props {
  data: ResumeData;
  onChange: (next: Partial<ResumeData>) => void;
}

export function PersonalSection({ data, onChange }: Props) {
  const set = (patch: Partial<PersonalDetails>) =>
    onChange({ personal: { ...data.personal, ...patch } });

  const handleSkillsAccepted = (newSkills: string[]) => {
    const merged = [...data.skills, ...newSkills.filter((s) => !data.skills.includes(s))];
    onChange({ skills: merged });
  };

  return (
    <div className="space-y-5">
      <PhotoUpload
        value={data.personal.photo}
        onChange={(photo) => set({ photo })}
        name={data.personal.fullName}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          required
          value={data.personal.fullName}
          onChange={(e) => set({ fullName: e.target.value })}
          placeholder="Elena Marchetti"
        />
        <TextField
          label="Job title"
          required
          value={data.personal.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Head Sommelier"
        />
        <TextField
          label="Email"
          type="email"
          required
          value={data.personal.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="elena@example.com"
        />
        <TextField
          label="Phone"
          value={data.personal.phone}
          onChange={(e) => set({ phone: e.target.value })}
          placeholder="+44 20 7946 0123"
        />
        <TextField
          label="Location"
          value={data.personal.location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="London, UK"
          className="sm:col-span-2"
        />
      </div>

      {/* Phase 2: target job description for AI context */}
      <Field
        label="Target job ad"
        hint="Paste the job description you're applying for. Used to tailor your CV — not shown on the final document."
      >
        <Textarea
          rows={3}
          value={data.targetJobDescription ?? ""}
          onChange={(e) => onChange({ targetJobDescription: e.target.value })}
          placeholder="Paste the job ad here to get role-tailored suggestions across all sections…"
          className="resize-none text-sm"
        />
      </Field>

      {/* Summary with Layer 1 + Layer 2 AI assistance */}
      <Field
        label="Professional summary"
        hint="2–4 sentences. Lead with your specialty and years of experience."
      >
        <AssistedTextarea
          fieldType="summary"
          rows={4}
          value={data.summary}
          onChange={(summary) => onChange({ summary })}
          placeholder="WSET Level 3 sommelier with 9+ years curating wine programs for Michelin-starred kitchens…"
          jobTitle={data.personal.title}
          targetJobDescription={data.targetJobDescription}
          onSkillsAccepted={handleSkillsAccepted}
          canDraftFromScratch={data.experience.length > 0}
        />
      </Field>
    </div>
  );
}
