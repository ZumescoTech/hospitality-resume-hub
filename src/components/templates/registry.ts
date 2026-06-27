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
  { id: "noir-premium", name: "Noir", description: "Dark luxury · cruise lines", swatch: ["#0f172a", "#7c3aed"], purpose: "Luxury cruise lines", premium: true, Component: PremiumNoirTemplate },
  { id: "executive", name: "Executive", description: "Crisp single-column · management", swatch: ["#1e293b", "#7c3aed"], purpose: "Ship's management", premium: true, Component: ExecutiveTemplate },
  { id: "harbour", name: "Harbour", description: "Two-column · hotel & resort", swatch: ["#7c3aed", "#f8fafc"], purpose: "Hotel & resort", premium: true, Component: HarbourTemplate },
  { id: "admiral", name: "Admiral", description: "Centred header · senior officers", swatch: ["#f8fafc", "#7c3aed"], purpose: "Senior officers", premium: true, Component: AdmiralTemplate },
  { id: "steward", name: "Steward", description: "Purple band header · service crew", swatch: ["#7c3aed", "#ffffff"], purpose: "Cabin & service crew", premium: true, Component: StewardTemplate },
];

export const getTemplate = (id: string) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
