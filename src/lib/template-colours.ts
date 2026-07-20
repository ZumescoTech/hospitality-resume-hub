// src/lib/template-colours.ts
// Colour customisation system for CV templates.
// Custom colours apply to browser preview only.
// PDF export uses ResumePDF.tsx with fixed styles — unaffected by this system.

export interface TemplateColours {
  primary:    string   // main accent — section headings, sidebar bg, header band
  accent:     string   // secondary — title colour, dividers, highlights
  text:       string   // body text colour
  background: string   // CV page/surface background
}

// Default colours per template ID — must match the hardcoded values in each template file.
// Changing these will change what "Reset defaults" restores to.
export const TEMPLATE_COLOUR_DEFAULTS: Record<string, TemplateColours> = {
  'noir-premium': {
    primary:    '#0d6b5e',   // C.heading — section heading colour
    accent:     '#0d6b5e',   // C.title — job title colour
    text:       '#1a1a1a',   // C.body — body text
    background: '#ffffff',   // C.bg — page background
  },
  'executive': {
    primary:    '#0d6b5e',   // C.accent — left border stripe + title colour
    accent:     '#0d6b5e',   // C.title — same slot, separate customisable
    text:       '#1a1a1a',   // C.body — body text
    background: '#ffffff',   // C.bg — page background
  },
  'harbour': {
    primary:    '#0d6b5e',   // C.sideHeading + C.mainTitle + C.divider
    accent:     '#0d6b5e',   // C.divider — main heading underline
    text:       '#1a1a1a',   // C.mainBody — main column body text
    background: '#ffffff',   // C.mainBg — main column background
  },
  'admiral': {
    primary:    '#0d6b5e',   // C.rule1 + C.title + C.heading — thick rule + heading colour
    accent:     '#0d6b5e',   // C.title — job title
    text:       '#1a1a1a',   // C.body — body text
    background: '#ffffff',   // C.bg — page background
  },
  'steward': {
    primary:    '#0d6b5e',   // C.headerBorder + C.headerTitle + C.heading
    accent:     '#0d6b5e',   // C.heading — section heading colour in body
    text:       '#1a1a1a',   // C.body — body text
    background: '#ffffff',   // C.bg — body section background
  },
}

// Human-readable labels for each colour slot shown in the picker UI
export const COLOUR_SLOT_LABELS: Record<keyof TemplateColours, string> = {
  primary:    'Primary colour',
  accent:     'Accent colour',
  text:       'Body text',
  background: 'Background',
}

// Get resolved colours for a template — custom if set, defaults otherwise
export function getTemplateColours(
  templateId: string,
  customColours?: Partial<Record<string, TemplateColours>>,
): TemplateColours {
  const custom = customColours?.[templateId]
  const defaults = TEMPLATE_COLOUR_DEFAULTS[templateId] ?? {
    primary:    '#0d6b5e',
    accent:     '#1a9e8a',
    text:       '#1e293b',
    background: '#ffffff',
  }
  return custom ?? defaults
}

// Returns true if the template has colour customisation support
export function templateSupportsColours(templateId: string): boolean {
  return templateId in TEMPLATE_COLOUR_DEFAULTS
}
