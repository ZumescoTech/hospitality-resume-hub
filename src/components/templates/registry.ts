import { ResumeData } from "@/types/resume";
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
  { id: "noir-premium", name: "Noir", description: "Clean minimal · cruise lines", swatch: ["#ffffff", "#0d6b5e"], purpose: "Luxury cruise lines", Component: PremiumNoirTemplate },
  { id: "executive", name: "Executive", description: "Crisp single-column · management", swatch: ["#ffffff", "#0d6b5e"], purpose: "Ship's management", Component: ExecutiveTemplate },
  { id: "harbour", name: "Harbour", description: "Two-column · hotel & resort", swatch: ["#0d6b5e", "#ffffff"], purpose: "Hotel & resort", Component: HarbourTemplate },
  { id: "admiral", name: "Admiral", description: "Centred header · senior officers", swatch: ["#ffffff", "#0d6b5e"], purpose: "Senior officers", Component: AdmiralTemplate },
  { id: "steward", name: "Steward", description: "Accent band header · service crew", swatch: ["#0d6b5e", "#ffffff"], purpose: "Cabin & service crew", Component: StewardTemplate },
];

export const getTemplate = (id: string) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
