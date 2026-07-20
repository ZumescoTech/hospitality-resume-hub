import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { initClarity } from "@/lib/clarity";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GetHired — Hospitality CV Builder" },
      { name: "description", content: "Build an ATS-ready hospitality CV in minutes. Designed for cruise lines, hotels, and restaurants. Live preview, 7 editorial templates, PDF export." },
      { name: "author", content: "GetHired" },
      { name: "theme-color", content: "#0d6b5e" },
      // Open Graph
      { property: "og:title", content: "GetHired — Hospitality CV Builder" },
      { property: "og:description", content: "Build an ATS-ready hospitality CV in minutes. Designed for cruise lines, hotels, and restaurants." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gethired.app" }, // TODO: replace before launch
      { property: "og:site_name", content: "GetHired" },
      { property: "og:image", content: "https://gethired.app/images/favicon-512.png" }, // TODO: replace before launch
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      // Twitter / X
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@gethiredcv" },
      { name: "twitter:title", content: "GetHired — Hospitality CV Builder" },
      { name: "twitter:description", content: "Build an ATS-ready hospitality CV in minutes." },
      { name: "twitter:image", content: "https://gethired.app/images/favicon-512.png" }, // TODO: replace before launch
    ],
    links: [
      // Favicons
      { rel: "icon", type: "image/x-icon", href: "/images/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/images/favicon-32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/images/favicon-180.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/images/favicon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/images/favicon-512.png" },
      // PWA manifest
      { rel: "manifest", href: "/manifest.json" },
      // Fonts
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    initClarity();
  }, []);

  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" richColors />
    </>
  );
}
