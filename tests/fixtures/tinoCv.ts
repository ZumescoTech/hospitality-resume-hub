/**
 * Real (anonymized) CV used to reproduce the recruiter-feedback pagination bugs.
 *
 * Source: tests/fixtures/tino-cv.json — real content with name/email/phone
 * replaced. The JSON uses descriptive placeholder keys; this file maps them onto
 * GetHired's actual ResumeData schema (src/types/resume.ts):
 *
 *   profile.name/title/location/email/phone → personal.*
 *   coreCompetencies                        → skills (flat string[])
 *   workExperience[].title/company/bullets  → experience[].role/venue/bullets
 *   education[].degree/institution/date      → education[].degree/school (endDate)
 *   certifications[].name/date               → certifications[].name/year
 *   languages                                → hospitality.languages
 *   hospitalityProfile.wineKnowledge         → hospitality.wineKnowledge
 *
 * Key traits for the bug repro:
 *  - FIVE work entries (Pigalle, Cunard, Bartinney, MERTIA, Muratie).
 *  - A SINGLE-field Hospitality Profile: only wineKnowledge is set, so the
 *    profile block is one row ("Wine knowledge — Intermediate") — the section
 *    reported stranded alone on Harbour's trailing page (Bug B).
 *  - education (BSc) and certifications (WSET + Cape Wine Academy) are NOT
 *    duplicated in this source (relevant to the Bug C diagnosis).
 */
import type { ResumeData } from "@/types/resume";

export const tinoCv: ResumeData = {
  personal: {
    fullName: "Candidate Name",
    title: "Hospitality Operations Professional | Restaurant & FOH Leadership | Wine & Guest Experience",
    email: "candidate@example.com",
    phone: "+27 00 000 0000",
    location: "Stellenbosch, Western Cape, SA",
    photo: undefined,
    links: [],
  },
  summary:
    "Hospitality operations professional with 6+ years of experience across premium Cape Winelands tasting rooms, fine dining and luxury cruise hospitality. Experienced in FOH leadership, guest experience, service coordination, team support, beverage operations, stock control and maintaining service standards in fast-paced environments. Strong wine knowledge with a proven ability to educate guests, build relationships and drive beverage sales. Comfortable working across busy restaurant and tasting-room operations while supporting teams and maintaining a consistent, professional guest experience.",
  experience: [
    {
      id: "e1",
      role: "Floor Assistant Manager (Acting)",
      venue: "Pigalle Restaurant, Green Point",
      location: "",
      startDate: "Mar 2026",
      endDate: "",
      current: true,
      description: "",
      bullets: [
        "Support the day-to-day operation of a 250-seat fine-dining restaurant, helping maintain service standards and efficient FOH operations.",
        "Assist with coordinating floor service, supporting team members and maintaining smooth service flow during busy periods.",
        "Respond to guest needs and service issues professionally and proactively.",
        "Drive beverage revenue through personalised wine recommendations and premium upselling.",
        "Support the wider beverage operation during peak periods, including bar service and cocktail preparation.",
        "Work closely with FOH and beverage teams to maintain a consistent guest experience at one of Cape Town's largest and most awarded dining venues.",
      ],
    },
    {
      id: "e2",
      role: "Sommelier",
      venue: "Cunard Cruise Line — Queen Victoria",
      location: "",
      startDate: "Jul 2025",
      endDate: "Feb 2026",
      description: "",
      bullets: [
        "Delivered premium food and beverage service across luxury dining venues while maintaining high guest-experience standards.",
        "Worked across breakfast, lunch and dinner service, adapting to changing guest volumes and operational demands.",
        "Drove beverage revenue through consultative upselling of wines, spirits, cocktails, digestifs and drinks packages.",
        "Supported wine education, tastings and food-pairing experiences, including the onboard Wine Academy programme.",
        "Maintained beverage inventory accuracy, stock rotation and replenishment; worked collaboratively across FOH and beverage teams during peak service.",
      ],
    },
    {
      id: "e3",
      role: "Assistant Tasting Room Manager",
      venue: "Bartinney Private Cellar",
      location: "",
      startDate: "Aug 2024",
      endDate: "Jun 2025",
      description: "",
      bullets: [
        "Supported the day-to-day operation of a busy premium Winelands tasting room during peak season.",
        "Managed high guest volumes associated with Wine Tram operations, with the property regularly cycling close to 100 guests per hour during peak periods.",
        "Coordinated guest flow, arrivals and tasting-room service while maintaining a welcoming and professional experience.",
        "Hosted wine tastings, cellar tours, private experiences and group events, coordinating logistics and service execution.",
        "Supported and coached junior team members on wine knowledge, service standards and upselling.",
        "Maintained operational readiness across stock levels, glassware, tasting-room presentation and cellar requirements.",
        "Used guest preferences and product knowledge to drive bottle sales and wine club sign-ups.",
      ],
    },
    {
      id: "e4",
      role: "Sommelier",
      venue: "MERTIA",
      location: "",
      startDate: "Dec 2023",
      endDate: "Jul 2024",
      description: "",
      bullets: [
        "Implemented beverage inventory controls and strengthened stock-management procedures across service periods.",
        "Supported staff wine education to improve product knowledge, recommendation confidence and service consistency.",
        "Contributed to wine-list development and food-and-wine pairing strategy.",
        "Maintained consistent service standards across tasting and dining experiences, ensuring compliance with alcohol-service and responsible-service requirements.",
      ],
    },
    {
      id: "e5",
      role: "Tasting Room Assistant",
      venue: "Muratie Wine Estate",
      location: "",
      startDate: "Dec 2019",
      endDate: "Jul 2023",
      description: "",
      bullets: [
        "Delivered warm, knowledgeable wine service in a high-traffic estate tasting room over a 3.5-year tenure.",
        "Increased wine club sign-ups by 25% through preference-led recommendations and genuine guest engagement.",
        "Used upselling and cross-selling strategies to increase transaction value across the wine portfolio.",
        "Built strong guest relationships that supported repeat visitation and increased confidence in purchase decisions.",
      ],
    },
  ],
  education: [
    {
      id: "ed1",
      school: "IU Applied Science",
      degree: "BSc Business and IT",
      field: "",
      startDate: "",
      endDate: "Dec 2024",
    },
  ],
  skills: [
    "Restaurant & FOH Operations",
    "Service Coordination",
    "Guest Experience",
    "Team Support & Training",
    "Service Standards",
    "Guest Problem Resolution",
    "Wine & Beverage Management",
    "Inventory & Stock Control",
    "Upselling & Revenue Generation",
    "Food & Wine Pairing",
    "Events & Private Experiences",
    "Operational Readiness",
  ],
  certifications: [
    { id: "c1", name: "WSET Level 2 Award in Wines", issuer: "WSET", year: "2021" },
    { id: "c2", name: "Cape Wine Academy Certificate in Wine", issuer: "Cape Wine Academy", year: "2021" },
  ],
  hospitality: {
    // Single-field profile — only wineKnowledge is populated (Bug B repro).
    serviceStyles: [],
    posSystems: [],
    wineKnowledge: "Intermediate",
    spiritsKnowledge: "None",
    languages: [{ name: "English", level: "Fluent" }],
    allergens: false,
    foodSafety: "",
  },
  templateId: "harbour",
};
