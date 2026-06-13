import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

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
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap",
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
    <div className="border-b border-[#2a3a52]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left gap-4 group"
      >
        <span className="font-display text-xl text-[#f0ebe0] group-hover:text-[#d4a853] transition-colors duration-200">
          {q}
        </span>
        <span
          className={`text-[#d4a853] text-2xl leading-none flex-shrink-0 transition-transform duration-300 ${open ? "rotate-45" : "rotate-0"}`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48 pb-6" : "max-h-0"}`}
      >
        <p className="font-body text-[#8a9ab5] leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <>
      <style>{`
        .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-body { font-family: 'DM Sans', system-ui, sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        .anim-fade-up       { animation: fadeUp  0.8s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-fade-up-d1    { animation: fadeUp  0.8s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .anim-fade-up-d2    { animation: fadeUp  0.8s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .anim-fade-up-d3    { animation: fadeUp  0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .anim-fade-in       { animation: fadeIn  1.2s ease both; }
        .hero-orb           { animation: shimmer 6s ease-in-out infinite; }

        .step-card:hover .step-num { transform: scale(1.08); }
        .step-num { transition: transform 0.3s ease; }

        .btn-gold {
          background: linear-gradient(135deg, #d4a853 0%, #b8892f 100%);
          box-shadow: 0 4px 24px rgba(212,168,83,0.25);
          transition: all 0.25s ease;
        }
        .btn-gold:hover {
          box-shadow: 0 6px 32px rgba(212,168,83,0.45);
          transform: translateY(-2px);
        }

        .noise-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }
        .grid-dot-bg {
          background-image: radial-gradient(circle, rgba(212,168,83,0.12) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .section-divider {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, #d4a853, transparent);
        }
      `}</style>

      <div className="font-body bg-[#0c1a2e] min-h-screen">

        {/* ── NAV ────────────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c1a2e]/90 backdrop-blur-md border-b border-[#1e2f45]">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="font-display text-2xl font-bold text-[#f0ebe0] tracking-wide">
              Get<span className="text-[#d4a853]">Hired</span>
            </span>
            <div className="flex items-center gap-4">
              <Link
                to="/builder"
                className="hidden sm:block text-sm text-[#8a9ab5] hover:text-[#f0ebe0] transition-colors duration-200"
              >
                Build CV
              </Link>
              <Link
                to="/builder"
                className="btn-gold px-5 py-2 rounded-full text-sm font-semibold text-[#0c1a2e]"
              >
                Check My CV Free
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────── */}
        <section className="noise-bg relative min-h-screen flex items-center pt-16 overflow-hidden">
          <div className="hero-orb absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-[#d4a853]/6 blur-[120px] pointer-events-none" />
          <div className="hero-orb absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-[#1a4a7a]/30 blur-[100px] pointer-events-none" />

          <div className="absolute top-32 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a853]/20 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="anim-fade-in flex items-center gap-3 mb-8">
                <div className="section-divider" />
                <span className="text-[#d4a853] text-xs font-semibold tracking-[0.2em] uppercase">
                  Cruise Ship &amp; Luxury Hospitality
                </span>
              </div>

              <h1 className="anim-fade-up font-display text-[clamp(2.6rem,6vw,4.5rem)] leading-[1.1] font-bold text-[#f0ebe0] mb-6">
                Your CV isn&apos;t bad.
                <br />
                <em className="text-[#d4a853] not-italic">It&apos;s written for the wrong industry.</em>
              </h1>

              <p className="anim-fade-up-d1 text-[#8a9ab5] text-lg leading-relaxed mb-10 max-w-lg">
                Cruise lines use ATS software to filter applications before a
                human ever sees them. If your CV isn&apos;t formatted and keyworded
                for hospitality roles at sea, it gets rejected automatically —
                no matter how good your experience is.
              </p>

              <div className="anim-fade-up-d2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  to="/builder"
                  className="btn-gold inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold text-[#0c1a2e]"
                >
                  Check My CV Free
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <span className="text-[#4a6080] text-sm">
                  No signup required · Results in under 60 seconds
                </span>
              </div>
            </div>

            {/* Right — decorative score card mockup */}
            <div className="anim-fade-up-d3 hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#d4a853]/10 to-transparent blur-xl" />
                <div className="relative bg-[#0f2035] border border-[#1e3352] rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[#4a6080] text-xs uppercase tracking-widest mb-1">ATS Score</p>
                      <p className="font-display text-6xl font-bold text-[#d4a853]">34</p>
                    </div>
                    <div className="w-20 h-20 rounded-full border-4 border-[#d4a853]/30 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#d4a853]/10 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#d4a853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {[
                      { label: "Keyword Match", val: 28, max: 100 },
                      { label: "Format Score", val: 55, max: 100 },
                      { label: "Role Alignment", val: 20, max: 100 },
                    ].map(({ label, val, max }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#8a9ab5]">{label}</span>
                          <span className="text-[#d4a853]">{val}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#1e3352]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#d4a853] to-[#b8892f]"
                            style={{ width: `${(val / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#0c1a2e] rounded-xl p-4 border border-[#1e3352]">
                    <p className="text-[#d4a853] text-xs font-semibold uppercase tracking-widest mb-2">Top Fix</p>
                    <p className="text-[#8a9ab5] text-sm leading-relaxed">
                      Missing keywords: <span className="text-[#f0ebe0]">F&amp;B service</span>, <span className="text-[#f0ebe0]">STCW</span>, <span className="text-[#f0ebe0]">vessel experience</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full">
              <path d="M0 60V30C240 0 480 60 720 30C960 0 1200 60 1440 30V60H0Z" fill="#f5f0e6" />
            </svg>
          </div>
        </section>

        {/* ── PROBLEM ────────────────────────────────────── */}
        <section className="bg-[#f5f0e6] py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-0.5 bg-[#b8892f]" />
              <span className="text-[#b8892f] text-xs font-semibold tracking-[0.2em] uppercase">The Real Problem</span>
            </div>

            <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.15] font-bold text-[#0c1a2e] mb-8">
              The reason you&apos;re not<br />
              getting called back
            </h2>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-[#3a4a5e] text-lg leading-relaxed mb-6">
                  Most hospitality CVs are built for hotels, wine estates, or
                  restaurants. That&apos;s a problem when you&apos;re applying to{" "}
                  <span className="font-semibold text-[#0c1a2e]">Cunard, MSC, Royal Caribbean,</span>{" "}
                  or <span className="font-semibold text-[#0c1a2e]">Norwegian</span> — because their hiring
                  systems don&apos;t speak the same language.
                </p>
                <p className="text-[#3a4a5e] text-lg leading-relaxed">
                  ATS scans your CV for specific keywords, formatting signals,
                  and role-relevant structure before your application reaches a
                  recruiter.
                </p>
              </div>

              <div className="bg-[#0c1a2e] rounded-2xl p-8 text-[#f0ebe0]">
                <p className="font-display text-2xl italic font-semibold leading-snug mb-4 text-[#f5efe0]">
                  &ldquo;You never hear back. Not because you aren&apos;t qualified. Because your CV wasn&apos;t written for the system reading it first.&rdquo;
                </p>
                <div className="w-10 h-0.5 bg-[#d4a853]" />
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────── */}
        <section className="bg-[#0c1a2e] grid-dot-bg py-28 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1a2e] via-transparent to-[#0c1a2e] pointer-events-none" />

          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#d4a853]" />
                <span className="text-[#d4a853] text-xs font-semibold tracking-[0.2em] uppercase">How It Works</span>
                <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#d4a853]" />
              </div>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-[#f0ebe0]">
                Three steps from rejected<br />to interview-ready
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  num: "01",
                  title: "Upload your CV",
                  body: "Paste your CV or upload your file. Tell us the role you're targeting — waiter, bartender, housekeeping, F&B supervisor, sommelier.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4-4 4 4M12 8v8" stroke="#d4a853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  num: "02",
                  title: "Get your ATS score",
                  body: "GetHired analyses your CV against real cruise line hiring criteria. You get a score, a breakdown of what's working, and exactly what's costing you interviews.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="#d4a853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  num: "03",
                  title: "Fix it with the CV builder",
                  body: "Don't start from scratch. Use our hospitality-specific CV builder to rewrite, restructure, and reword — built around the keywords cruise ship recruiters actually need to see.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="#d4a853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="step-card group relative bg-[#0f2035] border border-[#1e3352] rounded-2xl p-8 hover:border-[#d4a853]/40 transition-colors duration-300"
                >
                  <div className="step-num font-display text-[6rem] font-bold text-[#d4a853]/8 absolute top-4 right-6 leading-none select-none">
                    {step.num}
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-[#d4a853]/10 flex items-center justify-center mb-6">
                      {step.icon}
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#f0ebe0] mb-3">
                      {step.title}
                    </h3>
                    <p className="text-[#8a9ab5] leading-relaxed text-[0.95rem]">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ANCHOR ────────────────────────── */}
        <section className="bg-[#f5f0e6] py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#b8892f]" />
              <span className="text-[#b8892f] text-xs font-semibold tracking-[0.2em] uppercase">Built Different</span>
              <div className="w-8 h-px bg-[#b8892f]" />
            </div>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] font-bold text-[#0c1a2e] mb-6">
              Built for one industry.
              <br />
              <span className="text-[#b8892f]">Not general. Not generic.</span>
            </h2>
            <p className="text-[#3a4a5e] text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              GetHired is built specifically for cruise ship and luxury hospitality roles.
              Every keyword set, every scoring criteria, every CV template is calibrated
              for the roles cruise lines hire for — not office jobs, not tech roles,
              not generic hospitality.
            </p>
            <p className="font-display text-xl italic text-[#0c1a2e]/60">
              If you&apos;ve been using a standard CV template or a generic CV builder,
              this is why the silence keeps coming back.
            </p>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
              {["Cunard", "MSC", "Royal Caribbean", "Norwegian", "Celebrity"].map((name) => (
                <span key={name} className="text-[#0c1a2e]/25 font-display text-xl font-semibold tracking-wider">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────────────────────── */}
        <section className="noise-bg relative bg-[#0c1a2e] py-28 px-6 overflow-hidden">
          <div className="hero-orb absolute inset-x-0 top-1/2 -translate-y-1/2 h-[400px] bg-[#d4a853]/5 blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#d4a853]" />
              <span className="text-[#d4a853] text-xs font-semibold tracking-[0.2em] uppercase">Free Check</span>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#d4a853]" />
            </div>

            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold text-[#f0ebe0] leading-tight mb-6">
              Find out in 60 seconds why your CV isn&apos;t landing interviews.
            </h2>

            <p className="text-[#8a9ab5] text-lg leading-relaxed mb-10">
              Run your free ATS check now. No account needed to see your score.
              No credit card. Just upload, check, and know exactly where you stand.
            </p>

            <Link
              to="/builder"
              className="btn-gold inline-flex items-center gap-3 px-10 py-5 rounded-full text-lg font-semibold text-[#0c1a2e] mb-6"
            >
              Check My CV — It&apos;s Free
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            <p className="text-[#4a6080] text-sm">
              Join hospitality workers who stopped guessing and started getting called back.
            </p>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────── */}
        <section className="bg-[#0a1726] py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="section-divider" />
              <span className="text-[#d4a853] text-xs font-semibold tracking-[0.2em] uppercase">FAQ</span>
            </div>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold text-[#f0ebe0] mb-12">
              Common questions
            </h2>

            <div>
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────── */}
        <footer className="bg-[#060f1c] py-12 px-6 border-t border-[#1e2f45]">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-display text-xl font-bold text-[#f0ebe0]/60">
              Get<span className="text-[#d4a853]/60">Hired</span>
            </span>
            <p className="text-[#4a6080] text-sm text-center">
              Built for cruise ship &amp; luxury hospitality professionals.
            </p>
            <div className="flex items-center gap-6 text-sm text-[#4a6080]">
              <Link to="/builder" className="hover:text-[#8a9ab5] transition-colors">
                Builder
              </Link>
              <Link to="/pricing" className="hover:text-[#8a9ab5] transition-colors">
                Pricing
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
