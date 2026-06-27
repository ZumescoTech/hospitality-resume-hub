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
    primary:    '#7c3aed',   // C.heading — section heading colour
    accent:     '#a78bfa',   // C.title — job title colour
    text:       '#e2e8f0',   // C.body — body text
    background: '#0f172a',   // C.bg — page background
  },
  'executive': {
    primary:    '#7c3aed',   // C.accent — left border stripe + title colour
    accent:     '#7c3aed',   // C.title — same slot, separate customisable
    text:       '#334155',   // C.body — body text
    background: '#ffffff',   // C.bg — page background
  },
  'harbour': {
    primary:    '#7c3aed',   // C.sidebarBg + C.mainTitle — sidebar background
    accent:     '#ddd6fe',   // C.divider — main heading underline
    text:       '#334155',   // C.mainBody — main column body text
    background: '#ffffff',   // C.mainBg — main column background
  },
  'admiral': {
    primary:    '#7c3aed',   // C.rule1 + C.title — thick rule + title colour
    accent:     '#7c3aed',   // C.title — job title
    text:       '#334155',   // C.body — body text
    background: '#ffffff',   // C.bg — page background
  },
  'steward': {
    primary:    '#7c3aed',   // C.headerBg — header band background
    accent:     '#7c3aed',   // C.heading — section heading colour in body
    text:       '#334155',   // C.body — body text
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
