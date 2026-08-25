export interface PersonalDetails {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  photo?: string; // data URL
  photoPosition?: "top-left" | "top-right" | "centre";
  links?: { label: string; url: string }[];
}

export interface Experience {
  id: string;
  role: string;
  venue: string;
  location?: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  /**
   * Free-text description typed in the builder form. Legacy/builder-authored entries
   * use this field. Freshly-parsed CVs populate `bullets` instead.
   */
  description: string;
  /**
   * Structured bullet points from the CV parser. Each item is one bullet's exact
   * text — no leading marker character. Takes precedence over `description` when
   * both are present. Absent for manually-typed entries (use `description` then).
   */
  bullets?: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate: string;
  /** Free-text description (builder-typed). Parsed CVs use `bullets` instead. */
  description?: string;
  /** Structured bullet points from the CV parser. See Experience.bullets. */
  bullets?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  expiry?: string; // "MM/YYYY" or empty — for STCW certificates
}

export interface Hospitality {
  serviceStyles: string[]; // Fine dining, Bistro, Banquet, Cocktail bar...
  posSystems: string[];    // Toast, Square, Lightspeed, Micros...
  wineKnowledge: "None" | "Beginner" | "Intermediate" | "Advanced" | "Sommelier";
  spiritsKnowledge: "None" | "Beginner" | "Intermediate" | "Advanced" | "Mixologist";
  languages: { name: string; level: "Basic" | "Conversational" | "Fluent" | "Native" }[];
  allergens: boolean; // trained
  foodSafety?: string; // e.g. ServSafe
}

export interface ResumeData {
  personal: PersonalDetails;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  hospitality: Hospitality;
  templateId: string;
  formatting?: import("./formatting").FormattingSettings;
  /** Job ad text for AI tailoring suggestions. Persisted with draft, never exported to PDF. */
  targetJobDescription?: string;
  /**
   * Cruise role slug from cruise-roles.json (e.g. "bartender-bar-waiter").
   * Primary signal for AI phrasing engine pattern selection.
   * Populated from CV-checker handoff or the builder's role selector.
   * Never exported to PDF.
   */
  targetRoleSlug?: string;
  /** Optional references text shown in templates that support it. */
  references?: string;
  /**
   * Per-template custom colour overrides. Keyed by template ID.
   * Applies to browser preview only — PDF export uses ResumePDF.tsx with fixed styles.
   * Optional so existing saved CVs without this field still load correctly.
   */
  templateColours?: Partial<Record<string, {
    primary:    string
    accent:     string
    text:       string
    background: string
  }>>
  /**
   * Optional ATS-checker advice carried into the builder. Absent on blank
   * sessions and on resumes saved before the checker handoff existed.
   */
  checkerAudit?: import('./checker-audit').CheckerAudit
}

export const STORAGE_KEY = "hospitality-resume-v1";

export const emptyResume: ResumeData = {
  personal: {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    photo: undefined,
    links: [],
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  hospitality: {
    serviceStyles: [],
    posSystems: [],
    wineKnowledge: "None",
    spiritsKnowledge: "None",
    languages: [{ name: "English", level: "Fluent" as const }],
    allergens: false,
    foodSafety: "",
  },
  templateId: "classic",
};

export const sampleResume: ResumeData = {
  personal: {
    fullName: "Elena Marchetti",
    title: "Head Sommelier & Floor Manager",
    email: "elena.marchetti@example.com",
    phone: "+44 20 7946 0123",
    location: "London, UK",
    photo: undefined,
    links: [{ label: "LinkedIn", url: "linkedin.com/in/elenam" }],
  },
  summary:
    "WSET Level 3 sommelier with 9+ years curating wine programs for Michelin-starred kitchens. Known for warm, intuitive service and building cellars that pair narrative with terroir.",
  experience: [
    {
      id: "e1",
      role: "Head Sommelier",
      venue: "Maison Laurent",
      location: "London",
      startDate: "2021-03",
      endDate: "",
      current: true,
      description:
        "Curate a 420-bin list across Old & New World. Lead nightly service for 80 covers, train 6 commis, and host monthly producer dinners.",
    },
    {
      id: "e2",
      role: "Sommelier",
      venue: "Trattoria Bianca",
      location: "Milan",
      startDate: "2017-06",
      endDate: "2021-02",
      description:
        "Built an all-Italian regional list focused on small natural producers. Grew wine revenue by 38% in 18 months.",
    },
  ],
  education: [
    {
      id: "ed1",
      school: "Wine & Spirit Education Trust",
      degree: "WSET Level 3 Award",
      field: "Wines",
      startDate: "2018",
      endDate: "2019",
    },
  ],
  skills: ["Cellar management", "Guest relations", "Staff training", "Menu pairing", "Inventory & costing"],
  certifications: [
    { id: "c1", name: "WSET Level 3 — Distinction", issuer: "WSET", year: "2019" },
    { id: "c2", name: "Allergen Awareness", issuer: "FSA", year: "2022" },
  ],
  hospitality: {
    serviceStyles: ["Fine dining", "Tasting menu", "À la carte"],
    posSystems: ["Toast", "Lightspeed"],
    wineKnowledge: "Sommelier",
    spiritsKnowledge: "Intermediate",
    languages: [
      { name: "English", level: "Fluent" },
      { name: "Italian", level: "Native" },
      { name: "French", level: "Conversational" },
    ],
    allergens: true,
    foodSafety: "Level 2 Food Safety",
  },
  templateId: "cellar",
};
