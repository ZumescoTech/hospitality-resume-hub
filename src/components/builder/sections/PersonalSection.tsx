import { ResumeData, PersonalDetails } from "@/types/resume";
import { TextField, Field } from "./Field";
import { PhotoUpload } from "./PhotoUpload";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  data: ResumeData;
  onChange: (next: Partial<ResumeData>) => void;
}

export function PersonalSection({ data, onChange }: Props) {
  const set = (patch: Partial<PersonalDetails>) =>
    onChange({ personal: { ...data.personal, ...patch } });

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
          value={data.personal.fullName}
          onChange={(e) => set({ fullName: e.target.value })}
          placeholder="Elena Marchetti"
        />
        <TextField
          label="Job title"
          value={data.personal.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Head Sommelier"
        />
        <TextField
          label="Email"
          type="email"
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
      <Field label="Professional summary" hint="2–4 sentences. Lead with your specialty and years of experience.">
        <Textarea
          rows={4}
          value={data.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          placeholder="WSET Level 3 sommelier with 9+ years curating wine programs for Michelin-starred kitchens…"
        />
      </Field>
    </div>
  );
}
