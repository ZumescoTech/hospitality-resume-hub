import { ResumeData } from "@/types/resume";
import { Field } from "../Field";
import { TagInput } from "../TagInput";

const SUGGESTIONS = [
  "Guest relations",
  "Cellar management",
  "Menu pairing",
  "Inventory & costing",
  "Staff training",
  "Plate carrying",
  "Upselling",
  "Conflict resolution",
  "Reservation systems",
  "Cash handling",
];

export function SkillsSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (n: Partial<ResumeData>) => void;
}) {
  return (
    <Field label="Add your top skills" hint="Press Enter or comma to add. Aim for 6–10.">
      <TagInput
        values={data.skills}
        onChange={(skills) => onChange({ skills })}
        placeholder="e.g. Guest relations"
        suggestions={SUGGESTIONS}
      />
    </Field>
  );
}
