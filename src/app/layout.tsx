import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0B122B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "100% DESIGN Studio — Project & Employee Management OS",
  description: "Enterprise architectural employee, project, drawings, and site visit management platform",
  applicationName: "100% DESIGN Studio OS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Studio OS",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Studio OS",
    "msapplication-TileColor": "#0B122B",
    "msapplication-TileImage": "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Studio OS" />
        <meta name="msapplication-TileColor" content="#0B122B" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        <Script
          id="browser-extension-error-shield"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // 1. Guard against extension scripts (share-modal.js, chext) referencing non-existent DOM elements
                  var origGetElementById = document.getElementById;
                  document.getElementById = function(id) {
                    var el = origGetElementById.apply(this, arguments);
                    if (!el && new Error().stack && (new Error().stack.includes('share-modal') || new Error().stack.includes('chext_'))) {
                      return document.createElement('div');
                    }
                    return el;
                  };

                  var origQuerySelector = document.querySelector;
                  document.querySelector = function(selector) {
                    var el = origQuerySelector.apply(this, arguments);
                    if (!el && new Error().stack && (new Error().stack.includes('share-modal') || new Error().stack.includes('chext_'))) {
                      return document.createElement('div');
                    }
                    return el;
                  };

                  // 2. Window error shields for uncaught browser extension exceptions
                  window.addEventListener('error', function(event) {
                    var fn = (event && event.filename) || '';
                    var msg = (event && event.message) || '';
                    if (
                      fn.includes('share-modal') ||
                      fn.includes('chext_') ||
                      fn.includes('inspector.') ||
                      msg.includes("Cannot read properties of null (reading 'addEventListener')")
                    ) {
                      if (event.preventDefault) event.preventDefault();
                      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                      return true;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(event) {
                    var r = (event && event.reason && (event.reason.message || event.reason.stack || '')) || '';
                    if (r.includes('share-modal') || r.includes('chext_')) {
                      if (event.preventDefault) event.preventDefault();
                      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    }
                  });

                  // 3. Resolve CSS preload consumption warning
                  function satisfyPreloadStylesheets() {
                    try {
                      var preloads = document.querySelectorAll('link[rel="preload"][as="style"]');
                      preloads.forEach(function(p) {
                        var href = p.getAttribute('href');
                        if (href && !document.querySelector('link[rel="stylesheet"][href="' + href + '"]')) {
                          var link = document.createElement('link');
                          link.rel = 'stylesheet';
                          link.href = href;
                          document.head.appendChild(link);
                        }
                      });
                    } catch (e) {}
                  }

                  if (document.readyState === 'complete') {
                    satisfyPreloadStylesheets();
                  } else {
                    window.addEventListener('load', satisfyPreloadStylesheets);
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen selection:bg-[#5A81FA] selection:text-white">
        {/* Hidden stub elements for external extensions (share-modal.js) */}
        <div id="share-modal-container" style={{ display: "none" }} aria-hidden="true">
          <div id="share-modal" className="share-modal">
            <button id="share-btn" className="share-btn share-button" type="button" tabIndex={-1}></button>
            <button id="share-modal-close" className="share-modal-close" type="button" tabIndex={-1}></button>
            <div id="share-modal-content" className="share-modal-content"></div>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
