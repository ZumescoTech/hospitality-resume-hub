import { ResumeData, Hospitality } from "@/types/resume";
import { Field, TextField } from "../Field";
import { TagInput } from "../TagInput";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SERVICE = ["Fine dining", "Bistro", "Brasserie", "Banquet", "Tasting menu", "À la carte", "Cocktail bar", "Wine bar", "Café", "Hotel F&B"];
const POS = ["Toast", "Square", "Lightspeed", "Micros", "Aloha", "Resy", "OpenTable", "TouchBistro"];
const WINE = ["None", "Beginner", "Intermediate", "Advanced", "Sommelier"] as const;
const SPIRITS = ["None", "Beginner", "Intermediate", "Advanced", "Mixologist"] as const;

export function HospitalitySection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (n: Partial<ResumeData>) => void;
}) {
  const set = (patch: Partial<Hospitality>) =>
    onChange({ hospitality: { ...data.hospitality, ...patch } });
  const h = data.hospitality;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 min-[480px]:grid-cols-2" data-field-grid>
        <Field label="Wine knowledge">
          <Select value={h.wineKnowledge} onValueChange={(v) => set({ wineKnowledge: v as Hospitality["wineKnowledge"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WINE.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Spirits / cocktails">
          <Select value={h.spiritsKnowledge} onValueChange={(v) => set({ spiritsKnowledge: v as Hospitality["spiritsKnowledge"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPIRITS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Service styles" hint="Select or type to add.">
        <TagInput values={h.serviceStyles} onChange={(serviceStyles) => set({ serviceStyles })} placeholder="e.g. Fine dining" suggestions={SERVICE} />
      </Field>

      <Field label="POS systems">
        <TagInput values={h.posSystems} onChange={(posSystems) => set({ posSystems })} placeholder="e.g. Toast" suggestions={POS} />
      </Field>

      <div className="grid gap-4 min-[480px]:grid-cols-2" data-field-grid>
        <TextField
          label="Food safety"
          value={h.foodSafety ?? ""}
          onChange={(e) => set({ foodSafety: e.target.value })}
          placeholder="ServSafe / Level 2 Food Safety"
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <Checkbox checked={h.allergens} onCheckedChange={(v) => set({ allergens: !!v })} />
          <span>Allergen-awareness trained</span>
        </label>
      </div>
    </div>
  );
}
