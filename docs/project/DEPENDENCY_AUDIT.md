# Dependency audit

## Closure update - 2026-10-04

ISSUE-001 is **PASS / CLOSED** per the [verified closure record](../sessions/2026-10-04-01-issue-001-closure.md). Seroval and TanStack server-function deserialization/XSS remediation passed; **17 unrelated findings remain (10 high, 6 moderate, 1 low)**. The September snapshot, package versions and remediation priorities below are historical and superseded for ISSUE-001; they have not been rewritten. No new audit was run for this update.

## Cleanup executed 2026-09-22

Removed 30 unused direct dependencies after checking source, tests, scripts and configuration. npm regenerated the lockfile and pruned 78 installed packages; retained lockfile package versions did not change. `@tanstack/router-plugin` remains transitively available through TanStack Start; the application does not configure it directly. The table and advisory totals below are the **pre-cleanup audit snapshot**; vulnerability remediation was not performed or claimed.

Removed direct declarations: `@hookform/resolvers`, `@radix-ui/react-accordion`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@tanstack/router-plugin`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-hook-form`, `react-resizable-panels`, `recharts`, `vaul`.


2026-09-22. Resolved versions from package-lock.json. No package changes. `npm ls --depth=0` passed; `npm audit --json` reported 26 affected packages: 1 critical, 11 high, 12 moderate, 2 low. Counts include transitive and development packages, not confirmed deployed exploit paths.

**P0:** locked/installed seroval 1.5.2 is used by TanStack's server-functions-handler `fromJSON` request deserialization with plugins. [GHSA-mv8w-475r-vwqw](https://github.com/advisories/GHSA-mv8w-475r-vwqw) identifies affected versions through 1.5.2, patch 1.5.3, and downstream TanStack Start impact. No exploit attempted; verify compatible remediation and deployed versions in the next authorized dependency change. See ISSUE-001; historical credential containment ISSUE-017 comes first.

Usage classification is conservative: references include source/configuration/tests. A package referenced only by an unreferenced UI scaffold is a removal candidate after the scaffold is removed. Build plugins may be declared in dependencies but remain build tooling. React Query is used by dashboard and must be fixed, not removed as unused. No exhaustive latest-version comparison was run; age alone is not a defect. Advisory ranges are the verified upgrade concern. CI's latest Bun install differs from the npm lock workflow; establish a frozen reproducible install policy. Do not blanket-upgrade the stack.

| Package | Kind | Resolved | Classification | References | Advisory |
|---|---|---|---|---|---|
| @cloudflare/vite-plugin | dependencies | 1.32.2 | ACTIVELY USED | vite.config.ts | moderate |
| @hookform/resolvers | dependencies | 5.2.2 | POSSIBLY UNUSED / SCAFFOLD ONLY | Manifest/tooling; verify before removal | none directly reported |
| @microsoft/clarity | dependencies | 1.0.2 | ACTIVELY USED | src/lib/clarity.ts | none directly reported |
| @radix-ui/react-accordion | dependencies | 1.2.12 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/accordion.tsx | none directly reported |
| @radix-ui/react-alert-dialog | dependencies | 1.1.15 | ACTIVELY USED | src/components/ui/alert-dialog.tsx | none directly reported |
| @radix-ui/react-aspect-ratio | dependencies | 1.1.8 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/aspect-ratio.tsx | none directly reported |
| @radix-ui/react-avatar | dependencies | 1.1.11 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/avatar.tsx | none directly reported |
| @radix-ui/react-checkbox | dependencies | 1.3.3 | ACTIVELY USED | src/components/ui/checkbox.tsx | none directly reported |
| @radix-ui/react-collapsible | dependencies | 1.1.12 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/collapsible.tsx | none directly reported |
| @radix-ui/react-context-menu | dependencies | 2.2.16 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/context-menu.tsx | none directly reported |
| @radix-ui/react-dialog | dependencies | 1.1.15 | ACTIVELY USED | src/components/ui/command.tsx; src/components/ui/dialog.tsx; src/components/ui/sheet.tsx | none directly reported |
| @radix-ui/react-dropdown-menu | dependencies | 2.1.16 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/dropdown-menu.tsx | none directly reported |
| @radix-ui/react-hover-card | dependencies | 1.1.15 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/hover-card.tsx | none directly reported |
| @radix-ui/react-label | dependencies | 2.1.8 | ACTIVELY USED | src/components/ui/form.tsx; src/components/ui/label.tsx | none directly reported |
| @radix-ui/react-menubar | dependencies | 1.1.16 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/menubar.tsx | none directly reported |
| @radix-ui/react-navigation-menu | dependencies | 1.2.14 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/navigation-menu.tsx | none directly reported |
| @radix-ui/react-popover | dependencies | 1.1.15 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/popover.tsx | none directly reported |
| @radix-ui/react-progress | dependencies | 1.1.8 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/progress.tsx | none directly reported |
| @radix-ui/react-radio-group | dependencies | 1.3.8 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/radio-group.tsx | none directly reported |
| @radix-ui/react-scroll-area | dependencies | 1.2.10 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/scroll-area.tsx | none directly reported |
| @radix-ui/react-select | dependencies | 2.2.6 | ACTIVELY USED | src/components/ui/select.tsx | none directly reported |
| @radix-ui/react-separator | dependencies | 1.1.8 | ACTIVELY USED | src/components/ui/separator.tsx | none directly reported |
| @radix-ui/react-slider | dependencies | 1.3.6 | ACTIVELY USED | src/components/ui/slider.tsx | none directly reported |
| @radix-ui/react-slot | dependencies | 1.2.4 | ACTIVELY USED | src/components/ui/breadcrumb.tsx; src/components/ui/button.tsx; src/components/ui/form.tsx; src/components/ui/sidebar.tsx | none directly reported |
| @radix-ui/react-switch | dependencies | 1.2.6 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/switch.tsx | none directly reported |
| @radix-ui/react-tabs | dependencies | 1.1.13 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/tabs.tsx | none directly reported |
| @radix-ui/react-toggle | dependencies | 1.1.10 | ACTIVELY USED | src/components/ui/toggle-group.tsx; src/components/ui/toggle.tsx | none directly reported |
| @radix-ui/react-toggle-group | dependencies | 1.1.11 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/toggle-group.tsx | none directly reported |
| @radix-ui/react-tooltip | dependencies | 1.2.8 | ACTIVELY USED | src/components/ui/tooltip.tsx | none directly reported |
| @react-pdf/renderer | dependencies | 4.5.1 | ACTIVELY USED | src/lib/pdf/PDFDownloadButton.tsx; src/lib/pdf/ResumePDF.tsx; src/routes/builder.tsx; tests/helpers/renderPdf.ts | none directly reported |
| @supabase/supabase-js | dependencies | 2.108.0 | ACTIVELY USED | src/hooks/use-user.ts; src/lib/cruise-cv-check.ts; src/lib/supabase.ts | none directly reported |
| @tailwindcss/vite | dependencies | 4.2.2 | ACTIVELY USED | vite.config.ts | none directly reported |
| @tanstack/react-query | dependencies | 5.99.0 | ACTIVELY USED | src/routes/dashboard.tsx | none directly reported |
| @tanstack/react-router | dependencies | 1.168.21 | ACTIVELY USED | src/routeTree.gen.ts; src/router.tsx; src/routes/__root.tsx; src/routes/builder.tsx | none directly reported |
| @tanstack/react-start | dependencies | 1.167.39 | ACTIVELY USED | src/lib/ai/builder-assist.ts; src/lib/ai/phrasing-chips.ts; src/lib/cruise-cv-check.ts; src/lib/metrics-api.ts | moderate |
| @tanstack/router-plugin | dependencies | 1.167.22 | POSSIBLY UNUSED / SCAFFOLD ONLY | Manifest/tooling; verify before removal | none directly reported |
| class-variance-authority | dependencies | 0.7.1 | ACTIVELY USED | src/components/ui/alert.tsx; src/components/ui/badge.tsx; src/components/ui/button.tsx; src/components/ui/label.tsx | none directly reported |
| clsx | dependencies | 2.1.1 | ACTIVELY USED | src/lib/utils.ts | none directly reported |
| cmdk | dependencies | 1.1.1 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/command.tsx | none directly reported |
| date-fns | dependencies | 4.1.0 | POSSIBLY UNUSED / SCAFFOLD ONLY | Manifest/tooling; verify before removal | none directly reported |
| embla-carousel-react | dependencies | 8.6.0 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/carousel.tsx | none directly reported |
| input-otp | dependencies | 1.4.2 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/input-otp.tsx | none directly reported |
| libphonenumber-js | dependencies | 1.13.7 | ACTIVELY USED | src/components/checker/WhatsAppCaptureForm.tsx | none directly reported |
| lucide-react | dependencies | 0.575.0 | ACTIVELY USED | src/components/builder/AssistedTextarea.tsx; src/components/builder/BottomCta.tsx; src/components/builder/MobilePreviewModal.tsx; src/components/builder/PhotoUpload.tsx | none directly reported |
| mammoth | dependencies | 1.12.0 | ACTIVELY USED | src/lib/extractCvText.ts; src/lib/extraction-error.ts; src/lib/upload-failure-kv.ts | none directly reported |
| pdfjs-dist | dependencies | 4.10.38 | ACTIVELY USED | src/lib/extractCvText.ts; tests/helpers/renderPdf.ts; tests/scripts/judge-cvs.mjs | none directly reported |
| react | dependencies | 19.2.5 | ACTIVELY USED | eslint.config.js; src/components/builder/AssistedTextarea.tsx; src/components/builder/BottomCta.tsx; src/components/builder/BulletEditor.tsx | none directly reported |
| react-colorful | dependencies | 5.7.0 | ACTIVELY USED | src/components/builder/TemplateColourPicker.tsx; tests/unit/style-drawer.test.tsx | none directly reported |
| react-day-picker | dependencies | 9.14.0 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/calendar.tsx | none directly reported |
| react-dom | dependencies | 19.2.5 | ACTIVELY USED | src/components/builder/MobilePreviewModal.tsx; src/components/builder/PreviewZoomLightbox.tsx; src/components/builder/StyleDrawer.tsx; vite.config.ts | none directly reported |
| react-hook-form | dependencies | 7.72.1 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/form.tsx | none directly reported |
| react-resizable-panels | dependencies | 4.10.0 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/resizable.tsx | none directly reported |
| recharts | dependencies | 2.15.4 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/chart.tsx | none directly reported |
| sonner | dependencies | 2.0.7 | ACTIVELY USED | src/components/builder/AssistedTextarea.tsx; src/components/ui/sonner.tsx; src/routes/__root.tsx; src/routes/builder.tsx | none directly reported |
| tailwind-merge | dependencies | 3.5.0 | ACTIVELY USED | src/lib/utils.ts | none directly reported |
| tailwindcss | dependencies | 4.2.2 | ACTIVELY USED | src/styles.css; vite.config.ts | none directly reported |
| tesseract.js | dependencies | 5.1.1 | ACTIVELY USED | src/lib/extractCvText.ts | none directly reported |
| tw-animate-css | dependencies | 1.4.0 | ACTIVELY USED | src/styles.css | none directly reported |
| vaul | dependencies | 1.1.2 | POSSIBLY UNUSED / SCAFFOLD ONLY | src/components/ui/drawer.tsx | none directly reported |
| vite-tsconfig-paths | dependencies | 6.1.1 | ACTIVELY USED | vite.config.ts; vitest.config.ts | none directly reported |
| zod | dependencies | 3.25.76 | ACTIVELY USED | src/lib/ai/builder-assist.ts; src/lib/ai/merged-call.ts; src/lib/ai/phrasing-chips.ts; src/lib/ai/provider.ts | none directly reported |
| @eslint/js | devDependencies | 9.39.4 | DEV ONLY | eslint.config.js | none directly reported |
| @playwright/test | devDependencies | 1.61.1 | DEV ONLY | playwright.config.ts; tests/e2e/builder-bottom-cta.spec.ts; tests/e2e/cv-journey.spec.ts; tests/e2e/debug-checker.spec.ts | none directly reported |
| @testing-library/jest-dom | devDependencies | 6.9.1 | DEV ONLY | tests/setup.ts | none directly reported |
| @testing-library/react | devDependencies | 16.3.2 | DEV ONLY | tests/unit/assisted-textarea-tailor-error.test.tsx; tests/unit/builder-loading.test.tsx; tests/unit/checker-builder-handoff.integration.test.tsx; tests/unit/desktop-two-pane.test.tsx | none directly reported |
| @testing-library/user-event | devDependencies | 14.6.1 | DEV ONLY | tests/unit/assisted-textarea-tailor-error.test.tsx; tests/unit/improvement-checklist.test.tsx | none directly reported |
| @types/node | devDependencies | 22.19.17 | DEV ONLY | Manifest/tooling; verify before removal | none directly reported |
| @types/react | devDependencies | 19.2.14 | DEV ONLY | Manifest/tooling; verify before removal | none directly reported |
| @types/react-dom | devDependencies | 19.2.3 | DEV ONLY | Manifest/tooling; verify before removal | none directly reported |
| @types/testing-library__jest-dom | devDependencies | 5.14.9 | DEV ONLY | Manifest/tooling; verify before removal | none directly reported |
| @vitejs/plugin-react | devDependencies | 5.2.0 | DEV ONLY | vite.config.ts | none directly reported |
| @vitest/ui | devDependencies | 4.1.9 | DEV ONLY | Manifest/tooling; verify before removal | moderate |
| eslint | devDependencies | 9.39.4 | DEV ONLY | eslint.config.js; src/components/builder/AssistedTextarea.tsx; src/components/builder/PhrasingChips.tsx; src/components/checker/AtsScoreRing.tsx | none directly reported |
| eslint-config-prettier | devDependencies | 10.1.8 | DEV ONLY | Manifest/tooling; verify before removal | none directly reported |
| eslint-plugin-prettier | devDependencies | 5.5.5 | DEV ONLY | eslint.config.js | none directly reported |
| eslint-plugin-react-hooks | devDependencies | 5.2.0 | DEV ONLY | eslint.config.js | none directly reported |
| eslint-plugin-react-refresh | devDependencies | 0.4.26 | DEV ONLY | eslint.config.js | none directly reported |
| globals | devDependencies | 15.15.0 | DEV ONLY | eslint.config.js; tests/helpers/renderPdf.ts; vitest.config.ts | none directly reported |
| jsdom | devDependencies | 29.1.1 | DEV ONLY | src/components/builder/StepProgress.tsx; src/lib/kv-cache.ts; tests/helpers/renderPdf.ts; tests/unit/desktop-two-pane.test.tsx | none directly reported |
| prettier | devDependencies | 3.8.2 | DEV ONLY | eslint.config.js | none directly reported |
| typescript | devDependencies | 5.9.3 | DEV ONLY | eslint.config.js; src/components/builder/AssistedTextarea.tsx; src/components/builder/PhrasingChips.tsx; src/components/checker/WhatsAppCaptureForm.tsx | none directly reported |
| typescript-eslint | devDependencies | 8.58.2 | DEV ONLY | eslint.config.js; src/components/builder/AssistedTextarea.tsx; src/components/builder/PhrasingChips.tsx; src/components/checker/WhatsAppCaptureForm.tsx | none directly reported |
| vite | devDependencies | 7.3.2 | DEV ONLY | src/lib/ai/workers-ai-adapter.ts; src/lib/kv-cache.ts; tests/__mocks__/cloudflare-workers.ts; tests/unit/assisted-textarea-tailor-error.test.tsx | high |
| vitest | devDependencies | 4.1.9 | DEV ONLY | src/lib/ai/workers-ai-adapter.ts; src/lib/kv-cache.ts; tests/__mocks__/cloudflare-workers.ts; tests/unit/assisted-textarea-tailor-error.test.tsx | moderate |

## Advisory inventory

| Package | Severity | Direct |
|---|---|---|
| @babel/core | low | False |
| @cloudflare/vite-plugin | moderate | True |
| @humanfs/node | moderate | False |
| @tanstack/react-start | moderate | True |
| @tanstack/react-start-rsc | moderate | False |
| @tanstack/react-start-server | moderate | False |
| @tanstack/start-plugin-core | moderate | False |
| @tanstack/start-server-core | moderate | False |
| @vitest/mocker | moderate | False |
| @vitest/ui | moderate | True |
| @xmldom/xmldom | high | False |
| baseline-browser-mapping | moderate | False |
| brace-expansion | high | False |
| browserslist | high | False |
| esbuild | low | False |
| js-yaml | high | False |
| miniflare | high | False |
| nanoid | high | False |
| postcss | high | False |
| seroval | critical | False |
| sharp | high | False |
| undici | high | False |
| vite | high | True |
| vitest | moderate | True |
| wrangler | moderate | False |
| ws | high | False |
