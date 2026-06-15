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

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  swatch: [string, string];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: (props: { data: ResumeData }) => any;
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
  // ⚠ Visual/portfolio template — two-column layout may not parse correctly in ATS systems.
  // Pair with a single-column ATS-safe export when applying to large employers.
  { id: "editorial-sidebar", name: "Editorial Sidebar", description: "Visual · serif two-column", swatch: ["#A6433C", "#D9D9D9"], Component: EditorialSidebarTemplate },
];

export const getTemplate = (id: string) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
