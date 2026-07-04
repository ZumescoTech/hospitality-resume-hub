import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { HeroBanner } from "@/components/landing/HeroBanner";
import { LogoLockup } from "@/components/ui/LogoLockup";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GetHired — Cruise Ship CV Builder" },
      {
        name: "description",
        content:
          "ATS-optimised CV builder built specifically for cruise ship and luxury hospitality roles. Get your score in 60 seconds.",
      },
    ],
  }),
  component: LandingPage,
});

const FAQ_ITEMS = [
  {
    q: "What is ATS?",
    a: "Applicant Tracking Software is the system most large employers — including cruise lines — use to automatically screen CVs before a recruiter reads them. If your CV doesn't pass the ATS filter, it never reaches a human.",
  },
  {
    q: "What roles does GetHired cover?",
    a: "Currently optimised for cruise ship hospitality roles: waiters, bartenders, sommeliers, F&B supervisors, housekeeping, and cabin crew.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. You can run a free ATS check without signing up. Creating an account unlocks the CV builder and lets you save your progress.",
  },
  {
    q: "My CV already looks professional — why would it fail ATS?",
    a: "ATS doesn't judge how your CV looks. It reads text, scans for keywords, and checks structure. A beautifully designed CV with the wrong keywords in the wrong format will still be filtered out.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left gap-4 group"
      >
        <span className="font-display text-xl text-foreground group-hover:text-primary transition-colors duration-200">
          {q}
        </span>
        <span
          className={`text-accent text-2xl leading-none flex-shrink-0 transition-transform duration-300 ${open ? "rotate-45" : "rotate-0"}`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-none pb-6" : "max-h-0"}`}
      >
        <p className="text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Editorial reveal — extracted to useReveal() with fallbacks for:
  // (1) IntersectionObserver unavailable, (2) elements already in viewport at mount
  useReveal()

  return (
    <>
      <style>{`
        @keyframes step-num-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
        .step-num { transition: transform 0.3s ease; animation: step-num-pulse 3s ease-in-out infinite; }
        .step-card:hover .step-num { transform: scale(1.06); animation-play-state: paused; opacity: 0.9; }

        .btn-wine {
          background-color: var(--color-primary);
          color: var(--color-primary-foreground);
          box-shadow: 0 4px 20px -4px color-mix(in oklab, var(--color-primary) 40%, transparent);
          transition: all 0.2s ease;
        }
        .btn-wine:hover {
          opacity: 0.9;
          box-shadow: 0 6px 28px -4px color-mix(in oklab, var(--color-primary) 55%, transparent);
          transform: translateY(-1px);
        }
        .btn-brass {
          background-color: var(--color-accent);
          color: var(--color-accent-foreground);
          box-shadow: 0 4px 20px -4px color-mix(in oklab, var(--color-accent) 35%, transparent);
          transition: all 0.2s ease;
        }
        .btn-brass:hover {
          opacity: 0.92;
          box-shadow: 0 6px 28px -4px color-mix(in oklab, var(--color-accent) 50%, transparent);
          transform: translateY(-1px);
        }
        .ink-section {
          background-color: var(--color-ink);
        }
        .wine-section {
          background-color: var(--color-wine);
        }

        /* ── EDITORIAL REVEAL ANIMATIONS ── */
        .gh-reveal {
          opacity: 0;
          transform: translateY(28px);
          /* A2-1: keep on GPU compositing layer to prevent scroll repaint flash */
          will-change: transform, opacity;
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gh-reveal-left {
          opacity: 0;
          transform: translateX(-36px);
          will-change: transform, opacity;
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gh-reveal.gh-visible,
        .gh-reveal-left.gh-visible {
          opacity: 1;
          transform: none;
          /* A2-1: release GPU memory once animation is done */
          will-change: auto;
        }
        /* Stagger delays */
        .gh-d1 { transition-delay: 0.08s; }
        .gh-d2 { transition-delay: 0.18s; }
        .gh-d3 { transition-delay: 0.28s; }
        .gh-d4 { transition-delay: 0.38s; }
        .gh-d5 { transition-delay: 0.48s; }
        .gh-d6 { transition-delay: 0.58s; }
        /* Pull-quote accent line reveal */
        .gh-quote-bar {
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s;
        }
        .gh-reveal.gh-visible .gh-quote-bar {
          transform: scaleX(1);
        }
        @media (prefers-reduced-motion: reduce) {
          .gh-reveal, .gh-reveal-left { opacity: 1; transform: none; transition: none; }
          .gh-quote-bar { transform: scaleX(1); transition: none; }
        }
      `}</style>

      <div className="min-h-screen bg-background text-foreground">

        {/* ── NAV ─────────────────────────────────────────── */}
        <nav
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            transition: 'background 250ms ease, border-color 250ms ease',
            background: scrolled ? '#ffffff' : 'transparent',
            borderBottom: scrolled ? '0.5px solid #e2e8f0' : '0.5px solid transparent',
          }}
        >
          <div style={{ maxWidth: '1152px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" aria-label="GetHired — go to home page" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <LogoLockup variant={scrolled ? 'dark' : 'light'} height={32} showWordmark={true} />
            </a>
            <Link
              to="/tools/cruise-cv-checker"
              style={{
                height: '44px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 20px',
                borderRadius: '999px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: 'Rubik, system-ui, sans-serif',
                background: scrolled ? '#0d6b5e' : 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: scrolled ? 'none' : '0.5px solid rgba(255,255,255,0.4)',
                transition: 'background 250ms ease',
              }}
            >
              Check My CV Free
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────── */}
        <HeroBanner />

        {/* ── PROBLEM ──────────────────────────────────────── */}
        <section className="bg-background py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="gh-reveal flex items-center gap-3 mb-6">
              <div className="w-10 h-0.5 bg-accent" />
              <span className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">The Real Problem</span>
            </div>

            <h2 className="gh-reveal gh-d1 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.15] font-bold text-foreground mb-8">
              The reason you&apos;re not<br />getting called back
            </h2>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="gh-reveal gh-d2 text-muted-foreground text-lg leading-relaxed mb-6">
                  Most hospitality CVs are built for hotels, wine estates, or
                  restaurants. That&apos;s a problem when you&apos;re applying to{" "}
                  <span className="font-semibold text-foreground">Cunard, MSC, Royal Caribbean,</span>{" "}
                  or <span className="font-semibold text-foreground">Norwegian</span> — because their hiring
                  systems don&apos;t speak the same language.
                </p>
                <p className="gh-reveal gh-d3 text-muted-foreground text-lg leading-relaxed">
                  ATS scans your CV for specific keywords, formatting signals,
                  and role-relevant structure before your application reaches a
                  recruiter.
                </p>
              </div>

              {/* Pull quote — editorial interplay */}
              <div className="gh-reveal gh-d2 bg-primary rounded-2xl p-8">
                <p className="font-display text-2xl italic font-semibold leading-snug mb-4 text-primary-foreground">
                  &ldquo;You never hear back. Not because you aren&apos;t qualified. Because your CV wasn&apos;t written for the system reading it first.&rdquo;
                </p>
                <div className="gh-quote-bar w-10 h-0.5 bg-accent" />
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <section className="bg-muted py-28 px-6 relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="gh-reveal inline-flex items-center gap-3 mb-6">
                <div className="w-8 h-px bg-accent" />
                <span className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">How It Works</span>
                <div className="w-8 h-px bg-accent" />
              </div>
              <h2 className="gh-reveal gh-d1 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-foreground">
                Three steps from rejected<br />to interview-ready
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  title: "Upload your CV",
                  body: "Paste your CV or upload your file. Tell us the role you're targeting — waiter, bartender, housekeeping, F&B supervisor, sommelier.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4-4 4 4M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  num: "02",
                  title: "Get your ATS score",
                  body: "GetHired analyses your CV against real cruise line hiring criteria. You get a score, a breakdown of what's working, and exactly what's costing you interviews.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  num: "03",
                  title: "Fix it with the CV builder",
                  body: "Don't start from scratch. Use our hospitality-specific CV builder to rewrite, restructure, and reword — built around the keywords cruise ship recruiters actually need to see.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ].map((step, i) => (
                <div
                  key={step.num}
                  className={`gh-reveal gh-d${i + 1} step-card group relative bg-card border border-border rounded-2xl p-8 hover:border-accent/50 hover:shadow-soft transition-all duration-300`}
                >
                  <div className="step-num font-display text-[5.5rem] font-bold text-amber-500 absolute top-4 right-5 leading-none select-none">
                    {step.num}
                  </div>
                  <div className="relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                      {step.icon}
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ─────────────────────────────────── */}
        <section className="bg-background py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="gh-reveal inline-flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-accent" />
              <span className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">Built Different</span>
              <div className="w-8 h-px bg-accent" />
            </div>
            <h2 className="gh-reveal gh-d1 font-display text-[clamp(2rem,4.5vw,3.2rem)] font-bold text-foreground mb-6">
              Built for one industry.
              <br />
              <span className="text-primary">Not general. Not generic.</span>
            </h2>
            <p className="gh-reveal gh-d2 text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-8">
              GetHired is built specifically for cruise ship and luxury hospitality roles.
              Every keyword set, every scoring criteria, every CV template is calibrated
              for the roles cruise lines hire for — not office jobs, not tech roles,
              not generic hospitality.
            </p>
            <p className="gh-reveal gh-d3 font-display text-xl italic text-foreground/40">
              If you&apos;ve been using a standard CV template or a generic CV builder,
              this is why the silence keeps coming back.
            </p>

            {/* Editorial stagger — cruise line names reveal one by one */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
              {["Cunard", "MSC", "Royal Caribbean", "Norwegian", "Celebrity"].map((name, i) => (
                <span key={name} className={`gh-reveal gh-d${i + 1} font-display text-xl font-semibold tracking-wider text-foreground/20`}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── CV CHECKER CTA ───────────────────────────────── */}
        <section className="bg-background py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-muted border border-border rounded-3xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Left — copy */}
                <div className="p-10 lg:p-14">
                  <div className="gh-reveal flex items-center gap-3 mb-6">
                    <div className="w-8 h-0.5 bg-accent" />
                    <span className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">Free Tool</span>
                  </div>
                  <h2 className="gh-reveal gh-d1 font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold text-foreground leading-tight mb-4">
                    See exactly where your CV fails — before you apply.
                  </h2>
                  <p className="gh-reveal gh-d2 text-muted-foreground leading-relaxed mb-8">
                    Paste your CV, select your role, get an instant AI score against real cruise recruiter criteria.
                    No account. No credit card. Results in under 60 seconds.
                  </p>

                  {/* What you get free */}
                  <ul className="gh-reveal gh-d3 space-y-3 mb-10">
                    {[
                      "Overall ATS score (0–100)",
                      "Risk level — High / Medium / Low",
                      "Your top 2–4 rejection triggers",
                      "Full category breakdown (email unlock)",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                        <span className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/tools/cruise-cv-checker"
                    className="gh-reveal gh-d4 btn-wine inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold"
                  >
                    Check My CV — It&apos;s Free
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>

                {/* Right — categories list */}
                <div className="gh-reveal-left gh-d2 bg-primary/5 border-l border-border p-10 lg:p-14 flex flex-col justify-center">
                  <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-5">5 categories checked</p>
                  <ul className="space-y-2.5">
                    {[
                      "Personal information block",
                      "Professional photo",
                      "Quantified experience",
                      "Structure & length",
                      "Role keyword match",
                    ].map((cat) => (
                      <li key={cat} className="flex items-center gap-2.5 text-sm text-foreground/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {cat}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-xs text-muted-foreground">
                    Covers 13 cruise ship roles including waiter, bartender, cabin steward, chef, spa therapist and more.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <section className="wine-section relative py-28 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-accent)/10_0%,_transparent_70%)] pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="gh-reveal inline-flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-accent/60" />
              <span className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">Free Check</span>
              <div className="w-8 h-px bg-accent/60" />
            </div>

            <h2 className="gh-reveal gh-d1 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold text-primary-foreground leading-tight mb-6">
              Find out in 60 seconds why your CV isn&apos;t landing interviews.
            </h2>

            <p className="gh-reveal gh-d2 text-primary-foreground/70 text-lg leading-relaxed mb-10">
              Run your free ATS check now. No account needed to see your score.
              No credit card. Just upload, check, and know exactly where you stand.
            </p>

            <Link
              to="/tools/cruise-cv-checker"
              className="gh-reveal gh-d3 btn-brass inline-flex items-center gap-3 px-10 py-5 rounded-full text-lg font-semibold mb-6"
            >
              Check My CV — It&apos;s Free
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            <p className="gh-reveal gh-d4 text-primary-foreground/50 text-sm">
              Join hospitality workers who stopped guessing and started getting called back.
            </p>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="bg-muted py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="gh-reveal flex items-center gap-3 mb-4">
              <div className="w-10 h-0.5 bg-accent" />
              <span className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">FAQ</span>
            </div>
            <h2 className="gh-reveal gh-d1 font-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold text-foreground mb-12">
              Common questions
            </h2>
            <div>
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────── */}
        <footer className="ink-section py-12 px-6 border-t border-border/10">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <LogoLockup variant="light" height={40} showWordmark={true} />
            <p className="text-cream/30 text-sm text-center">
              Built for cruise ship &amp; luxury hospitality professionals.
            </p>
            <div className="flex items-center gap-6 text-sm text-cream/40">
              <Link to="/tools/cruise-cv-checker" className="hover:text-cream/70 transition-colors">
                CV Checker
              </Link>
              <Link to="/builder" search={{ from: undefined, role: undefined }} className="hover:text-cream/70 transition-colors">
                Builder
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
