export type FontFamily = "Calibri" | "Cambria" | "Arial" | "Helvetica" | "Garamond";
export type LineSpacing = 1.15 | 1.2;
export type MarginInches = 0.5 | 0.75 | 1.0;

export interface FormattingSettings {
  fontFamily: FontFamily;
  bodyFontSize: number;    // 10.5–12 pt
  headingFontSize: number; // 14–16 pt
  lineSpacing: LineSpacing;
  marginInches: MarginInches;
}

export const FONT_FAMILIES: FontFamily[] = [
  "Calibri",
  "Cambria",
  "Arial",
  "Helvetica",
  "Garamond",
];

export const MARGIN_PRESETS: { label: string; value: MarginInches }[] = [
  { label: 'Tight (0.5")', value: 0.5 },
  { label: 'Standard (0.75")', value: 0.75 },
  { label: 'Spacious (1.0")', value: 1.0 },
];

export const FORMATTING_PRESETS: { name: string; description: string; settings: FormattingSettings }[] = [
  {
    name: "Classic",
    description: "Cambria · 11pt · 1.15 spacing",
    settings: {
      fontFamily: "Cambria",
      bodyFontSize: 11,
      headingFontSize: 14,
      lineSpacing: 1.15,
      marginInches: 0.75,
    },
  },
  {
    name: "Modern",
    description: "Calibri · 11.5pt · 1.2 spacing",
    settings: {
      fontFamily: "Calibri",
      bodyFontSize: 11.5,
      headingFontSize: 14,
      lineSpacing: 1.2,
      marginInches: 0.75,
    },
  },
  {
    name: "Compact",
    description: "Arial · 10.5pt · 1.15 spacing",
    settings: {
      fontFamily: "Arial",
      bodyFontSize: 10.5,
      headingFontSize: 14,
      lineSpacing: 1.15,
      marginInches: 0.5,
    },
  },
];

export const defaultFormatting: FormattingSettings = {
  fontFamily: "Calibri",
  bodyFontSize: 11,
  headingFontSize: 14,
  lineSpacing: 1.15,
  marginInches: 0.75,
};
