/**
 * ResumePDF
 *
 * @react-pdf/renderer Document component that converts ResumeData into a
 * clean, ATS-safe A4 PDF. Single-column layout — no tables, no decorative
 * columns, no images-as-text — so ATS parsers read every word correctly.
 *
 * Used by PDFDownloadButton. The visual browser templates remain separate
 * (HTML/Tailwind) — this file owns only the PDF rendering layer.
 */
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ResumeData } from "@/types/resume";
import { dateRange } from "@/components/templates/utils";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ink:    "#1a1a2e",
  accent: "#2563eb",
  muted:  "#64748b",
  rule:   "#e2e8f0",
  pill:   "#f1f5f9",
  white:  "#ffffff",
} as const;

// ─── StyleSheet ───────────────────────────────────────────────────────────────
// react-pdf uses a subset of CSS. All dimensions are in points unless noted.
// Flexbox defaults to column direction (same as React Native).
const s = StyleSheet.create({
  // ── Page ──
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.ink,
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 46,
    lineHeight: 1.5,
    backgroundColor: C.white,
  },

  // ── Header ──
  header:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 20, gap: 14 },
  photo:        { width: 64, height: 64, borderRadius: 32 },
  headerInfo:   { flex: 1 },
  name:         { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.ink, letterSpacing: -0.2 },
  jobTitle:     { fontSize: 9.5, color: C.accent, marginTop: 3, letterSpacing: 1.1, textTransform: "uppercase" },
  contactRow:   { flexDirection: "row", flexWrap: "wrap", marginTop: 7, gap: 10 },
  contactItem:  { fontSize: 8, color: C.muted },
  contactLink:  { fontSize: 8, color: C.accent, textDecoration: "none" },

  // ── Section container ──
  section:      { marginBottom: 14 },
  sectionLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  sectionRule:  { height: 0.75, backgroundColor: C.rule, marginBottom: 8 },

  // ── Summary ──
  summaryText: { fontSize: 9, color: C.ink, lineHeight: 1.65 },

  // ── Experience ──
  expEntry:  { marginBottom: 10 },
  expTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  expRole:   { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.ink },
  expDates:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.accent, textTransform: "uppercase", letterSpacing: 0.5 },
  expVenue:  { fontSize: 8.5, color: C.muted, marginTop: 1 },
  expDesc:   { fontSize: 8.5, color: C.ink, marginTop: 3, lineHeight: 1.55 },

  // ── Education ──
  eduEntry:  { marginBottom: 8 },
  eduTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  eduDegree: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.ink },
  eduDates:  { fontSize: 7.5, color: C.muted },
  eduSchool: { fontSize: 8.5, color: C.muted, fontFamily: "Helvetica-Oblique", marginTop: 1 },
  eduDesc:   { fontSize: 8.5, color: C.ink, marginTop: 3, lineHeight: 1.5 },

  // ── Skills ──
  skillsRow:  { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  skillPill:  {
    fontSize: 8,
    color: C.ink,
    backgroundColor: C.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },

  // ── Certifications ──
  certEntry: { marginBottom: 6 },
  certName:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink },
  certMeta:  { fontSize: 7.5, color: C.muted },

  // ── Hospitality Profile ──
  hospRow:   { flexDirection: "row", marginBottom: 4 },
  hospLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink, width: 96 },
  hospValue: { fontSize: 8, color: C.muted, flex: 1 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.sectionRule} />
    </>
  );
}

/** Prepend https:// if the link has no scheme, so react-pdf's Link works. */
function toHref(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function ResumePDF({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  const hasHospitality =
    hospitality.serviceStyles.length > 0 ||
    hospitality.posSystems.length > 0 ||
    hospitality.wineKnowledge !== "None" ||
    hospitality.spiritsKnowledge !== "None" ||
    hospitality.languages.length > 0 ||
    hospitality.allergens ||
    !!hospitality.foodSafety;

  return (
    <Document
      title={personal.fullName ? `${personal.fullName} — CV` : "CV"}
      author={personal.fullName}
      subject="Hospitality CV"
      creator="Plate & Pen"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={s.header}>
          {personal.photo ? (
            <Image src={personal.photo} style={s.photo} />
          ) : null}
          <View style={s.headerInfo}>
            <Text style={s.name}>{personal.fullName || "Your Name"}</Text>
            {personal.title ? <Text style={s.jobTitle}>{personal.title}</Text> : null}
            <View style={s.contactRow}>
              {personal.email    ? <Text style={s.contactItem}>{personal.email}</Text>    : null}
              {personal.phone    ? <Text style={s.contactItem}>{personal.phone}</Text>    : null}
              {personal.location ? <Text style={s.contactItem}>{personal.location}</Text> : null}
              {personal.links?.map((l) => (
                <Link key={l.label} src={toHref(l.url)} style={s.contactLink}>
                  {l.url}
                </Link>
              ))}
            </View>
          </View>
        </View>

        {/* ── Professional Summary ─────────────────────────── */}
        {summary ? (
          <View style={s.section}>
            <SectionHead label="Professional Summary" />
            <Text style={s.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* ── Experience ───────────────────────────────────── */}
        {experience.length > 0 ? (
          <View style={s.section}>
            <SectionHead label="Experience" />
            {experience.map((e) => (
              <View key={e.id} style={s.expEntry}>
                <View style={s.expTopRow}>
                  <Text style={s.expRole}>{e.role}</Text>
                  <Text style={s.expDates}>{dateRange(e.startDate, e.endDate, e.current)}</Text>
                </View>
                <Text style={s.expVenue}>
                  {e.venue}{e.location ? ` · ${e.location}` : ""}
                </Text>
                {e.description ? <Text style={s.expDesc}>{e.description}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Education ────────────────────────────────────── */}
        {education.length > 0 ? (
          <View style={s.section}>
            <SectionHead label="Education" />
            {education.map((e) => (
              <View key={e.id} style={s.eduEntry}>
                <View style={s.eduTopRow}>
                  <Text style={s.eduDegree}>
                    {e.degree}{e.field ? `, ${e.field}` : ""}
                  </Text>
                  <Text style={s.eduDates}>
                    {[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                <Text style={s.eduSchool}>{e.school}</Text>
                {e.description ? <Text style={s.eduDesc}>{e.description}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Skills ───────────────────────────────────────── */}
        {skills.length > 0 ? (
          <View style={s.section}>
            <SectionHead label="Skills" />
            <View style={s.skillsRow}>
              {skills.map((sk) => (
                <View key={sk} style={s.skillPill}>
                  <Text>{sk}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Certifications ───────────────────────────────── */}
        {certifications.length > 0 ? (
          <View style={s.section}>
            <SectionHead label="Certifications" />
            {certifications.map((c) => (
              <View key={c.id} style={s.certEntry}>
                <Text style={s.certName}>{c.name}</Text>
                <Text style={s.certMeta}>{c.issuer} · {c.year}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Hospitality Profile ──────────────────────────── */}
        {hasHospitality ? (
          <View style={s.section}>
            <SectionHead label="Hospitality Profile" />
            {hospitality.serviceStyles.length > 0 && (
              <View style={s.hospRow}>
                <Text style={s.hospLabel}>Service styles</Text>
                <Text style={s.hospValue}>{hospitality.serviceStyles.join(", ")}</Text>
              </View>
            )}
            {hospitality.posSystems.length > 0 && (
              <View style={s.hospRow}>
                <Text style={s.hospLabel}>POS systems</Text>
                <Text style={s.hospValue}>{hospitality.posSystems.join(", ")}</Text>
              </View>
            )}
            {hospitality.wineKnowledge !== "None" && (
              <View style={s.hospRow}>
                <Text style={s.hospLabel}>Wine knowledge</Text>
                <Text style={s.hospValue}>{hospitality.wineKnowledge}</Text>
              </View>
            )}
            {hospitality.spiritsKnowledge !== "None" && (
              <View style={s.hospRow}>
                <Text style={s.hospLabel}>Spirits / cocktails</Text>
                <Text style={s.hospValue}>{hospitality.spiritsKnowledge}</Text>
              </View>
            )}
            {hospitality.languages.length > 0 && (
              <View style={s.hospRow}>
                <Text style={s.hospLabel}>Languages</Text>
                <Text style={s.hospValue}>
                  {hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", ")}
                </Text>
              </View>
            )}
            {hospitality.allergens && (
              <View style={s.hospRow}>
                <Text style={s.hospLabel}>Allergen awareness</Text>
                <Text style={s.hospValue}>Trained</Text>
              </View>
            )}
            {hospitality.foodSafety ? (
              <View style={s.hospRow}>
                <Text style={s.hospLabel}>Food safety</Text>
                <Text style={s.hospValue}>{hospitality.foodSafety}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

      </Page>
    </Document>
  );
}
