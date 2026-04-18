import { ResumeData, Certification } from "@/types/resume";
import { TextField } from "../Field";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/resume-store";

export function CertificationsSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (n: Partial<ResumeData>) => void;
}) {
  const update = (i: number, patch: Partial<Certification>) =>
    onChange({
      certifications: data.certifications.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    });
  const remove = (i: number) =>
    onChange({ certifications: data.certifications.filter((_, idx) => idx !== i) });
  const add = () =>
    onChange({
      certifications: [...data.certifications, { id: uid(), name: "", issuer: "", year: "" }],
    });

  return (
    <div className="space-y-3">
      {data.certifications.map((c, i) => (
        <div key={c.id} className="grid items-end gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
          <TextField
            label="Certification"
            value={c.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="WSET Level 3"
          />
          <TextField
            label="Issuer"
            value={c.issuer}
            onChange={(e) => update(i, { issuer: e.target.value })}
            placeholder="WSET"
          />
          <TextField
            label="Year"
            value={c.year}
            onChange={(e) => update(i, { year: e.target.value })}
            placeholder="2024"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add certification
      </Button>
    </div>
  );
}
