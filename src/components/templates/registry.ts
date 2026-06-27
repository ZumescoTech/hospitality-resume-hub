import { ResumeData } from "@/types/resume";
import { ClassicTemplate } from "./ClassicTemplate";
import { ClaretTemplate } from "./ClaretTemplate";
import { BistroTemplate } from "./BistroTemplate";
import { ManhattanTemplate } from "./ManhattanTemplate";
import { CellarTemplate } from "./CellarTemplate";
import { ProvenceTemplate } from "./ProvenceTemplate";
import { TokyoTemplate } from "./TokyoTemplate";
import { BrasserieTemplate } from "./BrasserieTemplate";
import { CoastalTemplate } from "./CoastalTemplate";
import { TerracottaTemplate } from "./TerracottaTemplate";
import { NoirTemplate } from "./NoirTemplate";
import { EditorialSidebarTemplate } from "./EditorialSidebarTemplate";
import { ElegantTemplate } from "./ElegantTemplate";
import { PremiumNoirTemplate } from "./premium/PremiumNoirTemplate";
import { ExecutiveTemplate } from "./premium/ExecutiveTemplate";
import { HarbourTemplate } from "./premium/HarbourTemplate";
import { AdmiralTemplate } from "./premium/AdmiralTemplate";
import { StewardTemplate } from "./premium/StewardTemplate";

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  swatch: [string, string];
  purpose?: string;
  premium?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: (props: { data: ResumeData; colours?: { primary: string; accent: string; text: string; background: string } }) => any;
}

export const TEMPLATES: TemplateMeta[] = [
  { id: "classic", name: "Classic", description: "Clean two-column professional", swatch: ["#1a1a2e", "#2563eb"], Component: ClassicTemplate },
  { id: "bistro", name: "Classic Professional", description: "For waiters & front-of-house", swatch: ["#2a2218", "#a07b3c"], Component: BistroTemplate },
  { id: "tokyo", name: "Modern Minimal", description: "For bartenders & mixologists", swatch: ["#111111", "#e7e3dc"], Component: TokyoTemplate },
  { id: "cellar", name: "Elegant Sommelier", description: "Wine-focused roles", swatch: ["#241016", "#a0743a"], Component: CellarTemplate },
  { id: "claret", name: "Claret", description: "Editorial wine-list", swatch: ["#3a1119", "#c9a55a"], Component: ClaretTemplate },
  { id: "manhattan", name: "Manhattan", description: "Cocktail-bar bold", swatch: ["#0f1115", "#d4a24a"], Component: ManhattanTemplate },
  { id: "provence", name: "Provence", description: "Soft, floral, modern", swatch: ["#5b6b4f", "#f3e9d8"], Component: ProvenceTemplate },
  { id: "brasserie", name: "Brasserie", description: "Two-column classic", swatch: ["#14322a", "#d2b377"], Component: BrasserieTemplate },
  { id: "coastal", name: "Coastal", description: "Light & airy", swatch: ["#1f3a4a", "#dce7ec"], Component: CoastalTemplate },
  { id: "terracotta", name: "Terracotta", description: "Earthy & warm", swatch: ["#3a1f12", "#d8825a"], Component: TerracottaTemplate },
  { id: "noir", name: "Noir", description: "Dark & dramatic", swatch: ["#0a0a0a", "#bfa46f"], Component: NoirTemplate },
  // ⚠ Visual/portfolio templates — two-column layouts may not parse correctly in ATS systems.
  // Pair with a single-column ATS-safe export when applying to large employers.
  { id: "editorial-sidebar", name: "Editorial Sidebar", description: "Visual · serif two-column", swatch: ["#A6433C", "#D9D9D9"], Component: EditorialSidebarTemplate },
  { id: "elegant", name: "Elegant", description: "Visual · circular photo · serif", swatch: ["#A6433C", "#8A8A8A"], Component: ElegantTemplate },
  // ── Premium templates ──────────────────────────────────────────────────────
  { id: "noir-premium", name: "Noir", description: "Dark luxury · cruise lines", swatch: ["#0f172a", "#7c3aed"], purpose: "Luxury cruise lines", premium: true, Component: PremiumNoirTemplate },
  { id: "executive", name: "Executive", description: "Crisp single-column · management", swatch: ["#1e293b", "#7c3aed"], purpose: "Ship's management", premium: true, Component: ExecutiveTemplate },
  { id: "harbour", name: "Harbour", description: "Two-column · hotel & resort", swatch: ["#7c3aed", "#f8fafc"], purpose: "Hotel & resort", premium: true, Component: HarbourTemplate },
  { id: "admiral", name: "Admiral", description: "Centred header · senior officers", swatch: ["#f8fafc", "#7c3aed"], purpose: "Senior officers", premium: true, Component: AdmiralTemplate },
  { id: "steward", name: "Steward", description: "Purple band header · service crew", swatch: ["#7c3aed", "#ffffff"], purpose: "Cabin & service crew", premium: true, Component: StewardTemplate },
];

export const getTemplate = (id: string) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
