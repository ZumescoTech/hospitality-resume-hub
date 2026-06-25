import { ResumeData, PersonalDetails } from "@/types/resume";
import { TextField, Field } from "../Field";
import { PhotoUpload } from "../PhotoUpload";
import { Textarea } from "@/components/ui/textarea";
import { AssistedTextarea } from "../AssistedTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRUISE_ROLE_OPTIONS } from "@/lib/cruise-role-options";

interface Props {
  data: ResumeData;
  onChange: (next: Partial<ResumeData>) => void;
  /** When true, show required-field errors even without blur (triggered by Continue tap). */
  showErrors?: boolean;
}

export function PersonalSection({ data, onChange, showErrors }: Props) {
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
        position={data.personal.photoPosition ?? "top-right"}
        onPositionChange={(photoPosition) => set({ photoPosition })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <TextField
            label="Full name"
            required
            value={data.personal.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder="Elena Marchetti"
          />
          {showErrors && !data.personal.fullName.trim() && (
            <p className="mt-1 text-xs font-medium text-destructive">Full name is required to continue</p>
          )}
        </div>
        <TextField
          label="Job title"
          required
          value={data.personal.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Head Sommelier"
        />
        <div>
          <TextField
            label="Email"
            type="email"
            required
            value={data.personal.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="elena@example.com"
          />
          {showErrors && !data.personal.email.trim() && (
            <p className="mt-1 text-xs font-medium text-destructive">Email is required to continue</p>
          )}
        </div>
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

      {/* Target role selector — primary signal for AI phrasing engine */}
      <Field
        label="Target cruise role"
        hint="Sets the AI suggestion style across all sections. Pre-filled if you came from the CV checker."
      >
        <Select
          value={data.targetRoleSlug ?? ''}
          onValueChange={(v) => onChange({ targetRoleSlug: v || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select the role you're applying for…" />
          </SelectTrigger>
          <SelectContent>
            {CRUISE_ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.slug} value={r.slug}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

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
          targetRoleSlug={data.targetRoleSlug}
        />
      </Field>

      <Field
        label="References"
        hint='Shown on templates that include a references section. Leave blank to hide it, or write "Available upon request."'
      >
        <Textarea
          rows={2}
          value={data.references ?? ""}
          onChange={(e) => onChange({ references: e.target.value })}
          placeholder="Available upon request."
          className="resize-none text-sm"
        />
      </Field>
    </div>
  );
}
