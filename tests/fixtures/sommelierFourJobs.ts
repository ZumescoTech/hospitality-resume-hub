/**
 * Synthetic full-length sommelier CV fixture (invented person — no real PII).
 *
 * Mirrors the real-world Wine Waiter / Sommelier profile that surfaced the
 * pagination/formatting bugs: four jobs with multi-bullet descriptions, wine
 * certifications, and a full hospitality profile — enough content to push the
 * single-column (Executive) and sidebar (Harbour) layouts past one page.
 *
 * Deliberately encodes two data conditions the tests rely on:
 *  - "WSET Level 2" appears in BOTH education and certifications (Bug C).
 *  - The WSET Level 2 education entry has startDate === endDate (Bug D).
 */
import type { ResumeData } from "@/types/resume";

export const sommelierFourJobs: ResumeData = {
  personal: {
    fullName: "Tomas Herrera",
    title: "Wine Waiter / Sommelier",
    email: "tomas.herrera@example.com",
    phone: "+27 82 555 0199",
    location: "Cape Town, South Africa",
    photo: undefined,
    links: [{ label: "LinkedIn", url: "linkedin.com/in/tomasherrera" }],
  },
  summary:
    "WSET-certified sommelier with 9 years across fine-dining and luxury hotel floors, from commis to head sommelier. Built and costed 400-bin cellars, ran nightly pairings for tasting menus, and grew wine revenue through by-the-glass programmes and producer dinners. Calm under pressure, fluent in guest storytelling, and trusted with VIP and celebrity service on high-turnover floors across the Cape winelands and waterfront.",
  experience: [
    {
      id: "e1",
      role: "Head Sommelier",
      venue: "Le Meridien Grand",
      location: "Cape Town",
      startDate: "2021-03",
      endDate: "",
      current: true,
      bullets: [
        "Curate and cost a 420-bin wine list spanning Old and New World regions, refreshed quarterly against live stock levels and margin targets set with the F&B director.",
        "Lead nightly pairing service for a nine-course tasting menu across 70 covers, briefing and training six floor staff before each service and running the pass on wine.",
        "Grew by-the-glass revenue 34% in twelve months by introducing a Coravin preservation programme, rotating flights and a premium-pour upsell script for the team.",
        "Host monthly producer dinners and weekly staff blind-tasting sessions to lift cellar knowledge and confidence across the whole front-of-house team.",
        "Manage supplier relationships, allocations and en-primeur orders for the group's flagship property, negotiating annual pricing with twenty importers.",
        "Own the cellar's temperature, humidity and insurance compliance, keeping a full audit trail for the group's finance and risk teams.",
      ],
    },
    {
      id: "e2",
      role: "Wine Waiter",
      venue: "Mertia Restaurant Group",
      location: "Franschhoek",
      startDate: "2019-01",
      endDate: "2021-02",
      bullets: [
        "Ran wine service across two adjoining fine-dining rooms totalling 110 covers on peak weekend nights during the summer season.",
        "Rebuilt the by-the-glass list around small South African producers, lifting the wine attachment rate on mains by nineteen percent.",
        "Trained new commis on decanting, glassware, tableside service and confident pairing recommendations for guests.",
        "Maintained cellar inventory and monthly stock-takes with under one percent variance across a 6,000-bottle holding.",
        "Coordinated with the kitchen on seasonal menu changes to keep pairings current and margins healthy.",
      ],
    },
    {
      id: "e3",
      role: "Commis Sommelier",
      venue: "The Vineyard Hotel",
      location: "Newlands",
      startDate: "2017-06",
      endDate: "2018-12",
      bullets: [
        "Supported the head sommelier on a 300-bin list across restaurant, banqueting and private-dining service.",
        "Managed daily cellar organisation, temperature logs, breakage reporting and delivery reconciliation.",
        "Delivered the wine elements of the staff induction programme for all new front-of-house hires.",
        "Assisted with quarterly list rewrites, printed-menu production and supplier tasting appointments.",
        "Stepped up to run wine service solo on the head sommelier's days off without service issues.",
      ],
    },
    {
      id: "e4",
      role: "Bar & Wine Waiter",
      venue: "Cape Grace",
      location: "V&A Waterfront",
      startDate: "2015-02",
      endDate: "2017-05",
      bullets: [
        "Delivered wine and cocktail service in a five-star hotel bar and waterfront lounge across long split shifts.",
        "Handled opening and closing stock counts, daily float reconciliation and end-of-night cash-ups.",
        "Built regular-guest rapport that drove repeat bookings and requests for the wine lounge.",
        "Supported private events and wine tastings for up to forty guests alongside the events team.",
      ],
    },
  ],
  education: [
    // Same-year completion — start === end (Bug D). Also duplicated in certs (Bug C).
    {
      id: "ed1",
      school: "Cape Wine Academy",
      degree: "WSET Level 2",
      field: "Wines",
      startDate: "2019",
      endDate: "2019",
    },
    {
      id: "ed2",
      school: "Pinelands High School",
      degree: "National Senior Certificate",
      field: "",
      startDate: "2009",
      endDate: "2013",
    },
  ],
  skills: [
    "Cellar management",
    "Wine list curation",
    "Food & wine pairing",
    "By-the-glass programmes",
    "Coravin preservation",
    "Inventory & costing",
    "Guest storytelling",
    "Staff training",
    "Decanting & service",
    "Supplier relations",
  ],
  certifications: [
    // Duplicate of the ed1 qualification (Bug C).
    { id: "c1", name: "WSET Level 2", issuer: "Cape Wine Academy", year: "2019" },
    { id: "c2", name: "WSET Level 3 Award in Wines", issuer: "WSET", year: "2022" },
    { id: "c3", name: "Cape Wine Academy Certificate", issuer: "Cape Wine Academy", year: "2020" },
  ],
  hospitality: {
    serviceStyles: ["Fine dining", "Tasting menu", "À la carte", "Private dining"],
    posSystems: ["Micros", "Lightspeed", "Eazywine"],
    wineKnowledge: "Sommelier",
    spiritsKnowledge: "Advanced",
    languages: [
      { name: "English", level: "Fluent" },
      { name: "Spanish", level: "Native" },
      { name: "Afrikaans", level: "Conversational" },
    ],
    allergens: true,
    foodSafety: "HACCP Level 2",
  },
  templateId: "executive",
};
