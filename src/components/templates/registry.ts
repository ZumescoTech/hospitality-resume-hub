import { ResumeData } from "@/types/resume";
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

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  swatch: [string, string];
  Component: React.ComponentType<{ data: ResumeData }>;
}

export const TEMPLATES: TemplateMeta[] = [
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
];

export const getTemplate = (id: string) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
