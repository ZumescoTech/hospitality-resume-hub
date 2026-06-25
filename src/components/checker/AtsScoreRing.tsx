/**
 * AtsScoreRing
 *
 * Animated SVG circular progress ring for displaying ATS scores (0–100).
 *
 * Ring geometry:
 *   viewBox 160×160, center (80,80), radius 62, strokeWidth 12.
 *   circumference = 2π × 62 ≈ 389.56px
 *   Arc starts at 12-o'clock via SVG transform rotate(-90 80 80).
 *
 * Animation:
 *   requestAnimationFrame count-up from 0 → score over 1200ms, ease-out cubic.
 *   Respects prefers-reduced-motion — shows final value immediately if enabled.
 *
 * Fix suggestions:
 *   Renders topFixes array as priority cards (up to 3; shows fewer if fewer returned).
 *   Impact labels: index 0 → High, index 1 → Medium, index 2+ → Medium.
 */

import { useEffect, useRef, useState } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────

const RADIUS = 62;
const STROKE = 12;
const CX = 80;
const CY = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION = 1200;

const TRACK_COLOR = '#bec9c5'; /* outline-variant */

// ── Colour helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return '#1d9e75';
  if (score >= 50) return '#ef9f27';
  return '#e24b4a';
}

function scoreBandLabel(score: number): string {
  if (score >= 90) return 'Excellent — your CV is application-ready';
  if (score >= 75) return 'Strong CV — a couple of tweaks left';
  if (score >= 50) return 'Getting there — a few changes will help';
  return 'Your CV needs work before applying';
}

const IMPACT_LABELS = ['High impact', 'Medium impact', 'Medium impact'];
const BADGE_BG = '#e5eeff';    /* surface-container */
const BADGE_COLOR = '#005147'; /* primary teal */

// ── Easing ────────────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  score: number;
  topFixes: string[];
}

export function AtsScoreRing({ score, topFixes }: Props) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // Cancel any in-flight animation
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    if (prefersReduced) {
      setDisplayed(score);
      return;
    }

    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = easeOutCubic(progress);
      setDisplayed(Math.round(score * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayed(score);
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [score]); // eslint-disable-line react-hooks/exhaustive-deps

  const color = scoreColor(score);
  // dashoffset: full circumference = empty arc, 0 = full arc
  // animate from circumference → circumference * (1 - displayed/100)
  const dashOffset = CIRCUMFERENCE * (1 - displayed / 100);

  const fixes = topFixes.slice(0, 3);

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Ring ── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {/* 160px desktop, 140px mobile — CSS clamp via style */}
        <svg
          role="img"
          aria-label={`ATS score: ${score} out of 100`}
          style={{
            width: 'clamp(140px, 40vw, 160px)',
            height: 'clamp(140px, 40vw, 160px)',
            display: 'block',
            overflow: 'visible',
          }}
          viewBox="0 0 160 160"
        >
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke={TRACK_COLOR}
            strokeWidth={STROKE}
          />
          {/* Progress arc */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: prefersReduced ? 'none' : undefined }}
          />
          {/* Score number */}
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="36"
            fontWeight="500"
            fill={color}
          >
            {displayed}
          </text>
          {/* "ATS Score" label */}
          <text
            x={CX}
            y={CY + 18}
            textAnchor="middle"
            fontSize="11"
            fill="#94a3b8"
          >
            ATS Score
          </text>
        </svg>
      </div>

      {/* ── Band label ── */}
      <p
        style={{
          textAlign: 'center',
          fontSize: 14,
          color: '#64748b',
          margin: '12px 0 20px',
          lineHeight: 1.4,
        }}
      >
        {scoreBandLabel(score)}
      </p>

      {/* ── Fix suggestion cards ── */}
      {fixes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fixes.map((fix, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              {/* Priority badge */}
              <span
                style={{
                  background: BADGE_BG,
                  color: BADGE_COLOR,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 99,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                Fix {i + 1}
              </span>

              {/* Text + impact */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#1e293b', margin: 0, lineHeight: 1.45 }}>
                  {fix}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>
                  {IMPACT_LABELS[i] ?? 'Medium impact'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
