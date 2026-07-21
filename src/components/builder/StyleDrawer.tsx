// StyleDrawer.tsx
// Step 7 — bottom sheet for template + style choices.
//
// Layered *over* the Preview tab rather than being a top-level mode: the mode
// switcher (Step 3) carries Edit/Preview only, and styling is something you do
// while looking at the document, not instead of looking at it.
//
// Deliberate choices, mirroring PreviewZoomLightbox (Step 5):
//  - Below 1024px it portals onto document.body so it escapes the builder
//    grid's stacking and overflow contexts. Its z-index therefore sits cleanly
//    above the pinned CTA (Step 6, z-index 100) without the CTA having to move.
//    At >=1024px (`contained`, Step 8) it stays in the tree instead and scopes
//    itself to the preview pane — see the `contained` prop.
//  - Owns nothing but which sub-tab is showing. Every selection is pushed
//    straight into builder state, so it survives Edit ⇄ Preview round trips
//    exactly like a form field does.
//  - The builder only mounts it from Preview's base view, never while the
//    lightbox is open — the two overlays can never be on screen together.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Palette, LayoutTemplate, Type, X } from "lucide-react";
import { ResumeData } from "@/types/resume";
import { FormattingSettings, defaultFormatting } from "@/types/formatting";
import { TEMPLATES, getTemplate } from "@/components/templates/registry";
import { FormattingPanel } from "@/components/builder/FormattingPanel";
import { TemplateColourPicker } from "@/components/builder/TemplateColourPicker";
import {
  TemplateColours,
  getTemplateColours,
  templateSupportsColours,
} from "@/lib/template-colours";

export type StyleDrawerTab = "template" | "colour" | "format";

interface TabDef {
  id: StyleDrawerTab;
  label: string;
  Icon: typeof Palette;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ResumeData;
  onTemplateChange: (id: string) => void;
  onFormattingChange: (formatting: FormattingSettings) => void;
  onColourChange: (slot: keyof TemplateColours, value: string) => void;
  onColourReset: () => void;
  /**
   * Scope the sheet to its parent element instead of the viewport (Step 8).
   *
   * At >=1024px the editor pane is on screen next to the preview, so a
   * full-viewport sheet would dim and block a pane that has nothing to do with
   * styling. Contained mode drops the portal and positions against the nearest
   * positioned ancestor — `.preview-panel-outer`, which is already `sticky` —
   * so the backdrop covers exactly the preview pane's box and no more.
   */
  contained?: boolean;
}

export function StyleDrawer({
  isOpen,
  onClose,
  data,
  onTemplateChange,
  onFormattingChange,
  onColourChange,
  onColourReset,
  contained = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<StyleDrawerTab>("template");
  const closeRef = useRef<HTMLButtonElement>(null);

  // A fresh draft still carries the legacy id "classic", which left the
  // registry. getTemplate resolves it to the first template — the same one the
  // preview is actually rendering — so the marked card matches the document.
  const templateId = getTemplate(data.templateId ?? "").id;
  const supportsColours = templateSupportsColours(templateId);
  const colours = getTemplateColours(templateId, data.templateColours);
  const fmt = data.formatting ?? defaultFormatting;

  // Colours only exists for templates that expose colour slots; Template and
  // Text are always there, so the drawer always has real sub-tabs to switch.
  const tabs = useMemo<TabDef[]>(
    () => [
      { id: "template", label: "Template", Icon: LayoutTemplate },
      ...(supportsColours
        ? [{ id: "colour" as const, label: "Colours", Icon: Palette }]
        : []),
      { id: "format", label: "Text", Icon: Type },
    ],
    [supportsColours],
  );

  // Picking a template without colour slots while sitting on the Colours tab
  // would strand the drawer on a tab that no longer exists.
  useEffect(() => {
    if (activeTab === "colour" && !supportsColours) setActiveTab("template");
  }, [activeTab, supportsColours]);

  // Reopen always lands on Template — the reason people open this sheet.
  useEffect(() => {
    if (isOpen) setActiveTab("template");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  const tree = (
    <div
      className={"no-print" + (contained ? " style-drawer--contained" : "")}
      data-testid="style-drawer-root"
      data-contained={contained ? "true" : "false"}
    >
      {/* Dimmed backdrop — tapping anywhere on it closes. */}
      <div
        className="style-drawer__backdrop"
        data-testid="style-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="style-drawer__sheet"
        data-testid="style-drawer"
        role="dialog"
        /* Only a true modal when it owns the viewport. Contained, it dims the
           preview pane while the editor pane beside it stays fully usable —
           claiming aria-modal there would tell a screen reader the rest of the
           page is inert when it is not. */
        aria-modal={contained ? undefined : "true"}
        aria-label="Customize your CV"
      >
        <div className="style-drawer__grabber" aria-hidden="true" />

        <div className="style-drawer__head">
          <p className="style-drawer__title">Customize</p>
          <button
            ref={closeRef}
            type="button"
            data-testid="style-drawer-close"
            aria-label="Close customize drawer"
            onClick={onClose}
            className="style-drawer__close"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* ── Sub-tabs — switch categories without closing the sheet ───────── */}
        <div className="style-drawer__tabs" role="tablist" aria-label="Style categories">
          {tabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`style-drawer-tab-${id}`}
                onClick={() => setActiveTab(id)}
                className={
                  "style-drawer__tab" + (isActive ? " style-drawer__tab--active" : "")
                }
              >
                <Icon style={{ width: 14, height: 14 }} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Panel body ──────────────────────────────────────────────────── */}
        <div className="style-drawer__body">
          {activeTab === "template" && (
            <div
              role="tabpanel"
              data-testid="style-drawer-panel-template"
              className="style-drawer__grid"
            >
              {TEMPLATES.map((t) => {
                const isSelected = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`drawer-template-${t.id}`}
                    data-selected={isSelected ? "true" : "false"}
                    aria-pressed={isSelected}
                    aria-label={`Use the ${t.name} template`}
                    onClick={() => onTemplateChange(t.id)}
                    className={
                      "style-drawer__card" +
                      (isSelected ? " style-drawer__card--selected" : "")
                    }
                  >
                    <span
                      className="style-drawer__cardSwatch"
                      style={{
                        background: `linear-gradient(120deg, ${t.swatch[0]} 0%, ${t.swatch[0]} 62%, ${t.swatch[1]} 62%, ${t.swatch[1]} 100%)`,
                      }}
                    />
                    <span className="style-drawer__cardName">{t.name}</span>
                    <span className="style-drawer__cardDesc">{t.description}</span>
                    {isSelected && (
                      <span className="style-drawer__cardCheck" aria-hidden="true">
                        <Check style={{ width: 11, height: 11 }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "colour" && supportsColours && (
            <div role="tabpanel" data-testid="style-drawer-panel-colour">
              <TemplateColourPicker
                templateId={templateId}
                colours={colours}
                onChange={onColourChange}
                onReset={onColourReset}
              />
            </div>
          )}

          {activeTab === "format" && (
            <div role="tabpanel" data-testid="style-drawer-panel-format">
              <FormattingPanel settings={fmt} onChange={onFormattingChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Contained mode must stay in the tree to inherit the preview pane as its
  // containing block; portalling would reparent it to <body> and put it back
  // on the viewport.
  return contained ? tree : createPortal(tree, document.body);
}
