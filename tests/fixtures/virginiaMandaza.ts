/**
 * Synthetic full-coverage CV fixture used by the PDF render-layer tests.
 *
 * Invented person (no real PII). Every ResumeData section is populated —
 * summary, experience, education, skills, certifications and the full
 * hospitality profile — so render tests can catch silently-dropped sections
 * and label/geometry regressions. Mirrors the "Virginia Mandaza — Cabin
 * Steward" QA sample that surfaced the three render bugs.
 */
import type { ResumeData } from "@/types/resume";

export const virginiaMandaza: ResumeData = {
  personal: {
    fullName: "Virginia Mandaza",
    title: "Cabin Steward / Housekeeping",
    email: "virginia.mandaza@example.com",
    phone: "+27 82 555 0142",
    location: "Cape Town, South Africa",
    photo: undefined,
    links: [{ label: "LinkedIn", url: "linkedin.com/in/virginiamandaza" }],
  },
  summary:
    "Detail-driven cabin steward with 6 years turning staterooms and suites on luxury cruise vessels. STCW-certified, allergen-aware, and trusted with VIP guest cabins. Known for silent-service turndown and consistent 5-star cabin scores.",
  experience: [
    {
      id: "e1",
      role: "Housekeeper",
      venue: "Cunard — Queen Mary 2",
      location: "Southampton / Global Itinerary",
      startDate: "2018-01",
      endDate: "",
      current: true,
      description:
        "Serviced 18 guest cabins per shift to luxury standard.\nDelivered nightly turndown for VIP suites.\nMaintained a 98% cabin cleanliness score across audits.",
    },
    {
      id: "e2",
      role: "Room Attendant",
      venue: "Table Bay Hotel",
      location: "Cape Town",
      startDate: "2015-03",
      endDate: "2017-12",
      description:
        "Managed housekeeping for a 40-room wing. Trained two junior attendants on linen and amenity standards.",
    },
  ],
  education: [
    {
      id: "ed1",
      school: "Zonnebloem High School",
      degree: "Ordinary Level (O-Level)",
      field: "",
      startDate: "2010",
      endDate: "2014",
    },
  ],
  skills: [
    "Stateroom turndown",
    "Linen & amenity management",
    "VIP guest service",
    "Deep cleaning",
    "Inventory control",
  ],
  certifications: [
    { id: "c1", name: "First Aid Certificate", issuer: "South African Red Cross", year: "2021" },
    { id: "c2", name: "STCW Basic Safety Training", issuer: "SAMSA", year: "2020", expiry: "05/2025" },
    { id: "c3", name: "ENG1 Medical Certificate", issuer: "MCA-approved physician", year: "2022", expiry: "03/2024" },
  ],
  hospitality: {
    serviceStyles: ["Fine dining", "Silver service", "Turndown service"],
    posSystems: ["Micros", "Fidelio"],
    wineKnowledge: "Beginner",
    spiritsKnowledge: "None",
    languages: [
      { name: "English", level: "Fluent" },
      { name: "Shona", level: "Native" },
      { name: "Afrikaans", level: "Conversational" },
    ],
    allergens: true,
    foodSafety: "HACCP Level 2",
  },
  templateId: "vintage",
};
