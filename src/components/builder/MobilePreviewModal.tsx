// MobilePreviewModal.tsx
// Full-screen slide-up modal for mobile CV preview.
// Spec 03 (Phase 1C) — renders via React portal, pure CSS animation,
// browser-back closes it, body-position locking for iOS Safari.

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResumeData } from '@/types/resume';
import { TEMPLATES, getTemplate } from '@/components/templates/registry';
import { TemplateColourPicker } from '@/components/builder/TemplateColourPicker';
import {
  TemplateColours,
  getTemplateColours,
  templateSupportsColours,
} from '@/lib/template-colours';

// ── A4 constants ──────────────────────────────────────────────────────────────
const PAGE_W = 794;
const PAGE_H = 1123;

interface Props {
  data: ResumeData;
  onTemplateChange: (id: string) => void;
  onColourChange: (slot: keyof TemplateColours, value: string) => void;
  onColourReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function MobilePreviewModal({ data, onTemplateChange, onColourChange, onColourReset, isOpen, onClose }: Props) {
  // `mounted` keeps the portal in the DOM during close animation.
  const [mounted, setMounted] = useState(false);
  // `animated` drives the translateY: false → 100% (off-screen), true → 0.
  const [animated, setAnimated] = useState(false);

  // P1-2: swipe-to-dismiss
  const touchStartY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Body scroll restoration (iOS Safari: use position:fixed not overflow:hidden)
  const savedScrollY = useRef(0);

  // Preview container measurement for scale calculation
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(375);
  const [templateH, setTemplateH] = useState(PAGE_H);
  const templateWrapRef = useRef<HTMLDivElement>(null);

  // ── Open / close lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Mount first, then animate in next frame
      setMounted(true);
      // Lock body scroll (iOS-safe)
      savedScrollY.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${savedScrollY.current}px`;
      // Push history entry so browser back closes the modal
      history.pushState({ mobilePreviewOpen: true }, '');
      // Defer animation so the DOM is painted in the "off-screen" state first
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    } else {
      // Animate out
      setAnimated(false);
      // Restore body scroll
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, savedScrollY.current);
      // Unmount after the 250ms transition
      const t = setTimeout(() => setMounted(false), 270);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Browser back button ───────────────────────────────────────────────────
  const handlePopState = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, handlePopState]);

  // ── Measure preview container width ──────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const el = previewContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width || 375);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);

  // ── Measure template natural height for margin correction ─────────────────
  useEffect(() => {
    if (!mounted) return;
    const el = templateWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setTemplateH(Math.max(PAGE_H, entry.contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted, data.templateId]);

  // ── Swipe-to-dismiss (P1-2) ───────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragOffset(delta);
  }
  function handleTouchEnd() {
    if (dragOffset > 120) {
      setDragOffset(0);
      // Pop the history entry we pushed on open, which triggers handlePopState → onClose
      history.back();
    } else {
      setDragOffset(0);
    }
  }

  // ── Colour picker state ───────────────────────────────────────────────────
  const [colourPickerOpen, setColourPickerOpen] = useState(false);
  const supportsColours = templateSupportsColours(data.templateId);
  const colours = getTemplateColours(data.templateId, data.templateColours);

  // ── Template & scale ──────────────────────────────────────────────────────
  const { Component: TemplateComponent } = getTemplate(data.templateId);
  const scale = Math.min(containerW / PAGE_W, 1);
  // Negative margin collapses the extra layout space when scale < 1
  const marginBottom = (scale - 1) * templateH;

  if (!mounted) return null;

  const transform = animated
    ? `translateY(${dragOffset > 0 ? dragOffset : 0}px)`
    : 'translateY(100%)';

  const transition = dragOffset > 0 ? 'none' : 'transform 250ms ease-out';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CV Preview"
      className="fixed inset-0 z-[200] flex flex-col bg-white"
      style={{ transform, transition }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b-half border-border px-4">
        <button
          type="button"
          onClick={() => {
            // Pop the history entry we pushed; popstate handler will call onClose
            if (history.state?.mobilePreviewOpen) {
              history.back();
            } else {
              onClose();
            }
          }}
          className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to editing</span>
        </button>

        <span className="text-sm font-semibold text-foreground">
          Preview
        </span>

        {/* Colours toggle (premium templates only) */}
        <div className="w-[120px] flex justify-end">
          {supportsColours && (
            <button
              type="button"
              onClick={() => setColourPickerOpen((o) => !o)}
              className={cn(
                'flex min-h-[44px] items-center gap-1.5 rounded px-2 text-sm font-medium transition-colors',
                colourPickerOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Palette className="h-4 w-4" />
              <span>Colours</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Template swatch row ───────────────────────────────────────── */}
      <div className="scrollbar-none flex shrink-0 gap-3 overflow-x-auto border-b-half border-border px-4 py-3">
        {TEMPLATES.map((t) => {
          const isActive = t.id === data.templateId;
          return (
            <button
              key={t.id}
              type="button"
              id={`swatch-${t.id}`}
              onClick={() => onTemplateChange(t.id)}
              className="flex shrink-0 flex-col items-center gap-1"
              aria-pressed={isActive}
              aria-label={`Switch to ${t.name} template`}
            >
              {/* Mini portrait thumbnail — 52×68px */}
              <div
                className={cn(
                  'overflow-hidden rounded-sm',
                  isActive ? 'border border-primary' : 'border-half border-border',
                )}
                style={{ width: 52, height: 68, flexShrink: 0 }}
              >
                <div className="flex h-full">
                  <div className="flex-1" style={{ background: t.swatch[0] }} />
                  <div style={{ width: '34%', background: t.swatch[1] }} />
                </div>
              </div>
              <span className={cn('w-[56px] truncate text-center text-[11px]', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {t.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Colour picker (premium only) ─────────────────────────────────── */}
      {supportsColours && colourPickerOpen && (
        <div className="shrink-0 overflow-y-auto border-b-half border-border bg-background" style={{ maxHeight: 320 }}>
          <TemplateColourPicker
            templateId={data.templateId}
            colours={colours}
            onChange={onColourChange}
            onReset={onColourReset}
          />
        </div>
      )}

      {/* ── CV preview area (P0-2, P1-1) ────────────────────────────────── */}
      <div
        ref={previewContainerRef}
        className="flex-1 overflow-y-auto bg-[#f1f5f9]"
        style={{
          // P1-1: allow pinch-to-zoom within the preview
          touchAction: 'pan-y pinch-zoom',
        }}
      >
        {/* Centre the scaled-down A4 page */}
        <div className="flex justify-center py-4">
          <div
            ref={templateWrapRef}
            style={{
              width: PAGE_W,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginBottom: marginBottom,
            }}
          >
            <div className={cn('print-area bg-white shadow-elegant')}>
              <TemplateComponent data={data} colours={supportsColours ? colours : undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
