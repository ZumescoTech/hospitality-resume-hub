/**
 * ResumePDF
 *
 * @react-pdf/renderer Document that converts ResumeData into a downloadable PDF.
 * Each visual template ID maps to a distinct PDF style config — different colours,
 * section heading styles, and page layouts (single-column, sidebar, header-band).
 *
 * Bullet points from Experience.bullets are rendered as a proper bulleted list.
 * Falls back to splitting Experience.description on newlines for legacy entries.
 */
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ResumeData } from "@/types/resume";
import type { FormattingSettings } from "@/types/formatting";
import { defaultFormatting } from "@/types/formatting";
import { dateRange } from "@/components/templates/utils";

// ─── Font Registration ─────────────────────────────────────────────────────────
// Register Rubik from Google Fonts CDN (woff2). react-pdf fetches these
// client-side. Falls back to Helvetica if the fetch fails.
Font.register({
  family: "Rubik",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-WIq1UA.woff2",
      fontWeight: 700,
    },
  ],
});

// ─── Font Fallback Map ─────────────────────────────────────────────────────────
// For user-selected formatting fonts that aren't Rubik.
const PDF_FONT_MAP: Record<FormattingSettings["fontFamily"], string> = {
  Calibri: "Helvetica",
  Arial: "Helvetica",
  Helvetica: "Helvetica",
  Cambria: "Times-Roman",
  Garamond: "Times-Roman",
};
const PDF_FONT_BOLD_MAP: Record<FormattingSettings["fontFamily"], string> = {
  Calibri: "Helvetica-Bold",
  Arial: "Helvetica-Bold",
  Helvetica: "Helvetica-Bold",
  Cambria: "Times-Bold",
  Garamond: "Times-Bold",
};

// ─── Template Config ───────────────────────────────────────────────────────────

interface PDFTemplateConfig {
  /** Primary colour — section headings, accent bars, key UI elements. */
  primary: string;
  /** Secondary/accent colour — dates, employer names, bullet dots. */
  accent: string;
  /** Candidate name text colour. */
  nameColour: string;
  /** Page background colour. */
  pageBg: string;
  /** Section heading visual style. */
  sectionStyle: "underline" | "bar" | "uppercase-spaced" | "bordered-left";
  /** Page layout type. */
  layout: "single" | "sidebar" | "header-band";
  /** Background colour for the sidebar or header band. */
  bandBg?: string;
}

/** Returns true if a hex colour is perceptually dark. */
function isDark(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}

const PDF_TEMPLATE_CONFIGS: Record<string, PDFTemplateConfig> = {
  // ── Free templates ────────────────────────────────────────────────────────
  classic: {
    primary: "#2563eb",
    accent: "#2563eb",
    nameColour: "#1a1a2e",
    pageBg: "#ffffff",
    sectionStyle: "underline",
    layout: "single",
  },
  bistro: {
    primary: "#a07b3c",
    accent: "#7a5820",
    nameColour: "#2a2218",
    pageBg: "#fffdf8",
    sectionStyle: "uppercase-spaced",
    layout: "single",
  },
  tokyo: {
    primary: "#111111",
    accent: "#555555",
    nameColour: "#111111",
    pageBg: "#fafaf8",
    sectionStyle: "bar",
    layout: "single",
  },
  cellar: {
    primary: "#a0743a",
    accent: "#7a5520",
    nameColour: "#241016",
    pageBg: "#ffffff",
    sectionStyle: "uppercase-spaced",
    layout: "single",
  },
  claret: {
    primary: "#7c2d2d",
    accent: "#c9a55a",
    nameColour: "#3a1119",
    pageBg: "#ffffff",
    sectionStyle: "underline",
    layout: "single",
  },
  manhattan: {
    primary: "#d4a24a",
    accent: "#d4a24a",
    nameColour: "#f5f0e8",
    pageBg: "#0f1115",
    sectionStyle: "bordered-left",
    layout: "single",
  },
  provence: {
    primary: "#5b6b4f",
    accent: "#5b6b4f",
    nameColour: "#3a4a2e",
    pageBg: "#fefce8",
    sectionStyle: "underline",
    layout: "single",
  },
  brasserie: {
    primary: "#d2b377",
    accent: "#14322a",
    nameColour: "#14322a",
    pageBg: "#ffffff",
    sectionStyle: "bar",
    layout: "single",
  },
  coastal: {
    primary: "#1f3a4a",
    accent: "#1f3a4a",
    nameColour: "#1f3a4a",
    pageBg: "#f4f8fb",
    sectionStyle: "underline",
    layout: "single",
  },
  terracotta: {
    primary: "#b85c38",
    accent: "#3a1f12",
    nameColour: "#3a1f12",
    pageBg: "#fdf6f0",
    sectionStyle: "bar",
    layout: "single",
  },
  noir: {
    primary: "#bfa46f",
    accent: "#bfa46f",
    nameColour: "#f5f5f0",
    pageBg: "#0a0a0a",
    sectionStyle: "uppercase-spaced",
    layout: "single",
  },
  "editorial-sidebar": {
    primary: "#A6433C",
    accent: "#D9D9D9",
    nameColour: "#ffffff",
    pageBg: "#ffffff",
    sectionStyle: "uppercase-spaced",
    layout: "sidebar",
    bandBg: "#A6433C",
  },
  elegant: {
    primary: "#A6433C",
    accent: "#8A8A8A",
    nameColour: "#A6433C",
    pageBg: "#ffffff",
    sectionStyle: "bordered-left",
    layout: "single",
  },
  // ── Premium templates ─────────────────────────────────────────────────────
  "noir-premium": {
    primary: "#7c3aed",
    accent: "#a78bfa",
    nameColour: "#f8fafc",
    pageBg: "#0f172a",
    sectionStyle: "uppercase-spaced",
    layout: "single",
  },
  executive: {
    primary: "#1e293b",
    accent: "#64748b",
    nameColour: "#1e293b",
    pageBg: "#ffffff",
    sectionStyle: "bordered-left",
    layout: "single",
  },
  harbour: {
    primary: "#7c3aed",
    accent: "#ede9fe",
    nameColour: "#ffffff",
    pageBg: "#ffffff",
    sectionStyle: "uppercase-spaced",
    layout: "sidebar",
    bandBg: "#7c3aed",
  },
  admiral: {
    primary: "#7c3aed",
    accent: "#7c3aed",
    nameColour: "#7c3aed",
    pageBg: "#f8fafc",
    sectionStyle: "bar",
    layout: "single",
  },
  steward: {
    primary: "#7c3aed",
    accent: "#ede9fe",
    nameColour: "#ffffff",
    pageBg: "#ffffff",
    sectionStyle: "uppercase-spaced",
    layout: "header-band",
    bandBg: "#7c3aed",
  },
};

function getConfig(templateId?: string): PDFTemplateConfig {
  if (templateId && Object.prototype.hasOwnProperty.call(PDF_TEMPLATE_CONFIGS, templateId)) {
    return PDF_TEMPLATE_CONFIGS[templateId];
  }
  return PDF_TEMPLATE_CONFIGS["classic"];
}

// ─── Dynamic StyleSheet ────────────────────────────────────────────────────────

function buildStyles(fmt: FormattingSettings, config: PDFTemplateConfig) {
  const font = PDF_FONT_MAP[fmt.fontFamily] ?? "Rubik";
  const fontBold = PDF_FONT_BOLD_MAP[fmt.fontFamily] ?? "Rubik";
  const body = fmt.bodyFontSize;
  const heading = fmt.headingFontSize;
  const margin = fmt.marginInches * 72;
  const lh = fmt.lineSpacing;

  const small = Math.max(body - 1.5, 7.5);
  const medium = body - 0.5;

  // Derive body/heading text colours from page background
  const darkPage = isDark(config.pageBg);
  const bodyText = darkPage ? "#c9cdd4" : "#374151";
  const headingText = darkPage ? "#e2e8f0" : config.nameColour;
  const mutedText = darkPage ? "#6b7280" : "#64748b";

  return StyleSheet.create({
    page: {
      fontFamily: font,
      fontSize: body,
      color: bodyText,
      paddingTop: config.layout === "header-band" ? 0 : margin,
      paddingBottom: margin,
      paddingHorizontal: config.layout !== "single" ? 0 : margin,
      lineHeight: lh,
      backgroundColor: config.pageBg,
    },

    // Header (single-column templates)
    header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18, gap: 14 },
    photo: { width: 60, height: 60, borderRadius: 30 },
    headerInfo: { flex: 1 },
    name: { fontSize: heading + 8, fontFamily: fontBold, color: headingText, letterSpacing: -0.2 },
    jobTitle: { fontSize: medium, color: config.primary, marginTop: 3, letterSpacing: 0.8, textTransform: "uppercase" },
    contactRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 8 },
    contactItem: { fontSize: small, color: mutedText },
    contactLink: { fontSize: small, color: config.primary, textDecoration: "none" },

    // Body padding for non-single layouts
    bodyPad: { paddingHorizontal: margin, paddingTop: 14 },

    // Section
    section: { marginBottom: 14 },
    sectionLabel: {
      fontSize: heading,
      fontFamily: fontBold,
      color: config.primary,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      marginBottom: 3,
    },
    sectionRule: { height: 0.75, backgroundColor: darkPage ? "#334155" : "#e2e8f0", marginBottom: 8 },
    sectionBar: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 6,
    },
    sectionBarAccent: {
      width: 3,
      height: 14,
      backgroundColor: config.primary,
      borderRadius: 2,
    },
    sectionBarLabel: {
      fontSize: heading,
      fontFamily: fontBold,
      color: config.primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    sectionBorderedLeft: {
      borderLeftWidth: 2,
      borderLeftColor: config.primary,
      borderLeftStyle: "solid",
      paddingLeft: 8,
      marginBottom: 8,
    },
    sectionSpacedLabel: {
      fontSize: heading,
      fontFamily: fontBold,
      color: config.primary,
      textTransform: "uppercase",
      letterSpacing: 1.8,
      marginBottom: 8,
      marginTop: 12,
    },

    // Summary
    summaryText: { fontSize: body, color: bodyText, lineHeight: lh + 0.1 },

    // Experience
    expEntry: { marginBottom: 10 },
    expTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    expRole: { fontSize: body + 0.5, fontFamily: fontBold, color: headingText },
    expDates: { fontSize: small, fontFamily: fontBold, color: config.accent, textTransform: "uppercase", letterSpacing: 0.5 },
    expVenue: { fontSize: medium, color: mutedText, marginTop: 1 },

    // Education
    eduEntry: { marginBottom: 8 },
    eduTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    eduDegree: { fontSize: body + 0.5, fontFamily: fontBold, color: headingText },
    eduDates: { fontSize: small, color: mutedText },
    eduSchool: { fontSize: medium, color: mutedText, marginTop: 1 },
    eduDesc: { fontSize: body, color: bodyText, marginTop: 3 },

    // Skills
    skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
    skillPill: {
      fontSize: small,
      color: darkPage ? bodyText : "#1e293b",
      backgroundColor: darkPage ? "#1e293b" : "#f1f5f9",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 3,
    },

    // Certifications
    certEntry: { marginBottom: 6 },
    certName: { fontSize: body, fontFamily: fontBold, color: headingText },
    certMeta: { fontSize: small, color: mutedText },

    // Hospitality
    hospRow: { flexDirection: "row", marginBottom: 4 },
    hospLabel: { fontSize: small, fontFamily: fontBold, color: headingText, width: 96 },
    hospValue: { fontSize: small, color: bodyText, flex: 1 },

    // Bullet list
    bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3, gap: 5 },
    bulletDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: config.accent, marginTop: 4.5, flexShrink: 0 },
    bulletText: { fontSize: body - 0.5, color: bodyText, lineHeight: lh, flex: 1 },
  });
}

// ─── Section Heading ───────────────────────────────────────────────────────────

type StylesType = ReturnType<typeof buildStyles>;

function SectionHeading({
  label,
  config,
  s,
}: {
  label: string;
  config: PDFTemplateConfig;
  s: StylesType;
}) {
  switch (config.sectionStyle) {
    case "underline":
      return (
        <>
          <Text style={s.sectionLabel}>{label}</Text>
          <View style={s.sectionRule} />
        </>
      );
    case "bar":
      return (
        <View style={s.sectionBar}>
          <View style={s.sectionBarAccent} />
          <Text style={s.sectionBarLabel}>{label}</Text>
        </View>
      );
    case "uppercase-spaced":
      return <Text style={s.sectionSpacedLabel}>{label.toUpperCase()}</Text>;
    case "bordered-left":
      return (
        <View style={s.sectionBorderedLeft}>
          <Text style={s.sectionLabel}>{label}</Text>
        </View>
      );
    default:
      return (
        <>
          <Text style={s.sectionLabel}>{label}</Text>
          <View style={s.sectionRule} />
        </>
      );
  }
}

// ─── Bullet List ───────────────────────────────────────────────────────────────

function BulletList({
  bullets,
  description,
  s,
}: {
  bullets?: string[];
  description?: string;
  s: StylesType;
}) {
  // Prefer bullets array; fall back to splitting description on newlines
  const items: string[] = (() => {
    if (bullets && bullets.length > 0 && bullets.some((b) => b.trim())) {
      return bullets.filter((b) => b.trim());
    }
    if (description && description.trim()) {
      const lines = description
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      return lines.length > 0 ? lines : [description.trim()];
    }
    return [];
  })();

  if (items.length === 0) return null;

  return (
    <View style={{ marginTop: 4 }}>
      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Sidebar Layout (Harbour / Editorial-Sidebar) ─────────────────────────────

function SidebarLayout({
  data,
  config,
  s,
  fmt,
}: {
  data: ResumeData;
  config: PDFTemplateConfig;
  s: StylesType;
  fmt: FormattingSettings;
}) {
  const { personal, summary, experience, education, skills, hospitality } = data;
  const margin = fmt.marginInches * 72;
  const sidebarBg = config.bandBg ?? config.primary;
  const sidebarText = "rgba(255,255,255,0.88)";
  const sidebarMuted = "rgba(255,255,255,0.55)";
  const sidebarLabel = {
    fontSize: 7,
    color: sidebarMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 5,
    marginTop: 10,
  };
  const sidebarItem = { fontSize: 8, color: sidebarText, marginBottom: 2.5 };

  function SectionHead({ label }: { label: string }) {
    return <SectionHeading label={label} config={config} s={s} />;
  }

  return (
    <View style={{ flexDirection: "row", minHeight: "100%" }}>
      {/* Sidebar */}
      <View
        style={{
          width: "33%",
          backgroundColor: sidebarBg,
          padding: `${margin}pt ${margin * 0.7}pt`,
        }}
      >
        {/* Photo */}
        {personal.photo && (
          <Image
            src={personal.photo}
            style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 10 }}
          />
        )}

        {/* Name + title */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 2,
            lineHeight: 1.2,
          }}
        >
          {personal.fullName || "Your Name"}
        </Text>
        {personal.title && (
          <Text
            style={{ fontSize: 8.5, color: sidebarText, marginBottom: 14 }}
          >
            {personal.title}
          </Text>
        )}

        {/* Contact */}
        <Text style={sidebarLabel}>Contact</Text>
        {personal.email && <Text style={sidebarItem}>{personal.email}</Text>}
        {personal.phone && <Text style={sidebarItem}>{personal.phone}</Text>}
        {personal.location && <Text style={sidebarItem}>{personal.location}</Text>}
        {personal.links?.map((l) => (
          <Text key={l.label} style={{ ...sidebarItem, color: "rgba(255,255,255,0.7)" }}>
            {l.url}
          </Text>
        ))}

        {/* Skills */}
        {skills.length > 0 && (
          <>
            <Text style={sidebarLabel}>Skills</Text>
            {skills.map((sk) => (
              <Text key={sk} style={sidebarItem}>
                · {sk}
              </Text>
            ))}
          </>
        )}

        {/* Languages */}
        {hospitality.languages.length > 0 && (
          <>
            <Text style={sidebarLabel}>Languages</Text>
            {hospitality.languages.map((l) => (
              <Text key={l.name} style={sidebarItem}>
                {l.name} · {l.level}
              </Text>
            ))}
          </>
        )}
      </View>

      {/* Main column */}
      <View style={{ flex: 1, padding: `${margin}pt ${margin * 0.85}pt` }}>
        {/* Summary */}
        {summary && (
          <View style={{ marginBottom: 14 }}>
            <SectionHead label="Professional Summary" />
            <Text style={s.summaryText}>{summary}</Text>
          </View>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <SectionHead label="Experience" />
            {experience.map((e) => (
              <View key={e.id} style={s.expEntry}>
                <View style={s.expTopRow}>
                  <Text style={s.expRole}>{e.role}</Text>
                  <Text style={s.expDates}>
                    {dateRange(e.startDate, e.endDate, e.current)}
                  </Text>
                </View>
                <Text style={s.expVenue}>
                  {e.venue}
                  {e.location ? ` · ${e.location}` : ""}
                </Text>
                <BulletList bullets={e.bullets} description={e.description} s={s} />
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {education.length > 0 && (
          <View>
            <SectionHead label="Education" />
            {education.map((e) => (
              <View key={e.id} style={s.eduEntry}>
                <View style={s.eduTopRow}>
                  <Text style={s.eduDegree}>
                    {e.degree}
                    {e.field ? `, ${e.field}` : ""}
                  </Text>
                  <Text style={s.eduDates}>
                    {[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                <Text style={s.eduSchool}>{e.school}</Text>
                {e.description && <Text style={s.eduDesc}>{e.description}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Header-Band Layout (Steward) ─────────────────────────────────────────────

function HeaderBand({
  data,
  config,
}: {
  data: ResumeData;
  config: PDFTemplateConfig;
}) {
  const bandBg = config.bandBg ?? config.primary;
  return (
    <View
      style={{
        backgroundColor: bandBg,
        padding: "20pt 28pt 18pt",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 0,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -0.3,
            lineHeight: 1.2,
          }}
        >
          {data.personal.fullName || "Your Name"}
        </Text>
        {data.personal.title && (
          <Text
            style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 4 }}
          >
            {data.personal.title}
          </Text>
        )}
        {/* Contact row in band */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 8,
          }}
        >
          {data.personal.email && (
            <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.75)" }}>
              {data.personal.email}
            </Text>
          )}
          {data.personal.phone && (
            <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.75)" }}>
              {data.personal.phone}
            </Text>
          )}
          {data.personal.location && (
            <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.75)" }}>
              {data.personal.location}
            </Text>
          )}
        </View>
      </View>
      {data.personal.photo && (
        <Image
          src={data.personal.photo}
          style={{ width: 52, height: 52, borderRadius: 26, marginLeft: 12 }}
        />
      )}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toHref(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

// ─── Main Document ─────────────────────────────────────────────────────────────

export function ResumePDF({
  data,
  formatting,
}: {
  data: ResumeData;
  formatting?: FormattingSettings;
}) {
  const fmt = formatting ?? data.formatting ?? defaultFormatting;
  const config = getConfig(data.templateId);
  const s = buildStyles(fmt, config);

  function SectionHead({ label }: { label: string }) {
    return <SectionHeading label={label} config={config} s={s} />;
  }

  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  const hasHospitality =
    hospitality.serviceStyles.length > 0 ||
    hospitality.posSystems.length > 0 ||
    hospitality.wineKnowledge !== "None" ||
    hospitality.spiritsKnowledge !== "None" ||
    hospitality.languages.length > 0 ||
    hospitality.allergens ||
    !!hospitality.foodSafety;

  // ── Sidebar layout ───────────────────────────────────────────────────────
  if (config.layout === "sidebar") {
    return (
      <Document
        title={personal.fullName ? `${personal.fullName} — CV` : "CV"}
        author={personal.fullName}
        subject="Hospitality CV"
        creator="GetHired"
      >
        <Page size="A4" style={{ ...s.page, paddingHorizontal: 0, paddingTop: 0 }}>
          <SidebarLayout data={data} config={config} s={s} fmt={fmt} />
        </Page>
      </Document>
    );
  }

  // ── Single column + header-band layout ───────────────────────────────────
  const margin = fmt.marginInches * 72;

  return (
    <Document
      title={personal.fullName ? `${personal.fullName} — CV` : "CV"}
      author={personal.fullName}
      subject="Hospitality CV"
      creator="GetHired"
    >
      <Page size="A4" style={s.page}>

        {/* Header band (Steward) */}
        {config.layout === "header-band" && (
          <HeaderBand data={data} config={config} />
        )}

        {/* Standard single-column header (all other single templates) */}
        {config.layout === "single" && (
          <View style={s.header}>
            {personal.photo ? (
              <Image src={personal.photo} style={s.photo} />
            ) : null}
            <View style={s.headerInfo}>
              <Text style={s.name}>{personal.fullName || "Your Name"}</Text>
              {personal.title ? (
                <Text style={s.jobTitle}>{personal.title}</Text>
              ) : null}
              <View style={s.contactRow}>
                {personal.email ? (
                  <Text style={s.contactItem}>{personal.email}</Text>
                ) : null}
                {personal.phone ? (
                  <Text style={s.contactItem}>{personal.phone}</Text>
                ) : null}
                {personal.location ? (
                  <Text style={s.contactItem}>{personal.location}</Text>
                ) : null}
                {personal.links?.map((l) => (
                  <Link key={l.label} src={toHref(l.url)} style={s.contactLink}>
                    {l.url}
                  </Link>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Body section for header-band — add horizontal padding */}
        <View
          style={
            config.layout === "header-band"
              ? { paddingHorizontal: margin, paddingTop: 16 }
              : {}
          }
        >
          {/* Professional Summary */}
          {summary ? (
            <View style={s.section}>
              <SectionHead label="Professional Summary" />
              <Text style={s.summaryText}>{summary}</Text>
            </View>
          ) : null}

          {/* Experience */}
          {experience.length > 0 ? (
            <View style={s.section}>
              <SectionHead label="Experience" />
              {experience.map((e) => (
                <View key={e.id} style={s.expEntry}>
                  <View style={s.expTopRow}>
                    <Text style={s.expRole}>{e.role}</Text>
                    <Text style={s.expDates}>
                      {dateRange(e.startDate, e.endDate, e.current)}
                    </Text>
                  </View>
                  <Text style={s.expVenue}>
                    {e.venue}
                    {e.location ? ` · ${e.location}` : ""}
                  </Text>
                  <BulletList
                    bullets={e.bullets}
                    description={e.description}
                    s={s}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {/* Education */}
          {education.length > 0 ? (
            <View style={s.section}>
              <SectionHead label="Education" />
              {education.map((e) => (
                <View key={e.id} style={s.eduEntry}>
                  <View style={s.eduTopRow}>
                    <Text style={s.eduDegree}>
                      {e.degree}
                      {e.field ? `, ${e.field}` : ""}
                    </Text>
                    <Text style={s.eduDates}>
                      {[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                    </Text>
                  </View>
                  <Text style={s.eduSchool}>{e.school}</Text>
                  {e.description ? (
                    <Text style={s.eduDesc}>{e.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Skills */}
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

          {/* Certifications */}
          {certifications.length > 0 ? (
            <View style={s.section}>
              <SectionHead label="Certifications" />
              {certifications.map((c) => (
                <View key={c.id} style={s.certEntry}>
                  <Text style={s.certName}>{c.name}</Text>
                  <Text style={s.certMeta}>
                    {c.issuer} · {c.year}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Hospitality Profile */}
          {hasHospitality ? (
            <View style={s.section}>
              <SectionHead label="Hospitality Profile" />
              {hospitality.serviceStyles.length > 0 && (
                <View style={s.hospRow}>
                  <Text style={s.hospLabel}>Service styles</Text>
                  <Text style={s.hospValue}>
                    {hospitality.serviceStyles.join(", ")}
                  </Text>
                </View>
              )}
              {hospitality.posSystems.length > 0 && (
                <View style={s.hospRow}>
                  <Text style={s.hospLabel}>POS systems</Text>
                  <Text style={s.hospValue}>
                    {hospitality.posSystems.join(", ")}
                  </Text>
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
                  <Text style={s.hospValue}>
                    {hospitality.spiritsKnowledge}
                  </Text>
                </View>
              )}
              {hospitality.languages.length > 0 && (
                <View style={s.hospRow}>
                  <Text style={s.hospLabel}>Languages</Text>
                  <Text style={s.hospValue}>
                    {hospitality.languages
                      .map((l) => `${l.name} (${l.level})`)
                      .join(", ")}
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
        </View>
      </Page>
    </Document>
  );
}
