import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

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
    <html lang="en" className={dmSans.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/dmsans-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning className={`${dmSans.className} antialiased min-h-screen selection:bg-[#5A81FA] selection:text-white`}>
        {/* Browser Extension Safety Shield: Clean event suppression without DOM or prototype mutation */}
        <script
          id="browser-extension-error-shield"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                var isIgnored = function(msg, url, stack) {
                  var str = (String(msg || '') + ' ' + String(url || '') + ' ' + String(stack || '')).toLowerCase();
                  return (
                    str.indexOf('share-modal') !== -1 ||
                    str.indexOf('chext') !== -1 ||
                    str.indexOf('inspector') !== -1 ||
                    str.indexOf('json formatter') !== -1 ||
                    str.indexOf('set-json-global') !== -1 ||
                    str.indexOf('cannot read properties of null (reading \\'addeventlistener\\')') !== -1 ||
                    str.indexOf('permissions policy violation: unload') !== -1 ||
                    str.indexOf('beforeinstallprompt') !== -1
                  );
                };

                // Suppress noisy logs from external extensions in dev console
                if (typeof console !== 'undefined') {
                  var origError = console.error;
                  if (origError) {
                    console.error = function() {
                      var argsStr = '';
                      for (var i = 0; i < arguments.length; i++) {
                        var a = arguments[i];
                        argsStr += ' ' + ((a && a.stack) ? a.stack : String(a || ''));
                      }
                      if (isIgnored(argsStr)) return;
                      return origError.apply(console, arguments);
                    };
                  }

                  var origWarn = console.warn;
                  if (origWarn) {
                    console.warn = function() {
                      var argsStr = '';
                      for (var j = 0; j < arguments.length; j++) {
                        var b = arguments[j];
                        argsStr += ' ' + ((b && b.stack) ? b.stack : String(b || ''));
                      }
                      if (isIgnored(argsStr)) return;
                      return origWarn.apply(console, arguments);
                    };
                  }
                }

                // Suppress unhandled extension errors from triggering Next.js dev overlay
                window.addEventListener('error', function(event) {
                  var msg = (event && event.message) || '';
                  var url = (event && event.filename) || '';
                  var stack = (event && event.error && event.error.stack) || '';
                  if (isIgnored(msg, url, stack)) {
                    if (event.preventDefault) event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(event) {
                  var reason = event.reason;
                  var msg = (reason && (reason.message || reason.stack)) || String(reason || '');
                  if (isIgnored(msg, '', reason && reason.stack)) {
                    if (event.preventDefault) event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                  }
                });
              })();
            `,
          }}
        />

        {/* Hidden static elements for browser extensions that expect standard share buttons on page */}
        <div id="share-modal-container" className="share-modal-container" style={{ display: "none" }} aria-hidden="true">
          <div id="share-modal" className="share-modal">
            <button id="share-btn" className="share-btn share-button" type="button" tabIndex={-1}></button>
            <button id="share-button" className="share-button" type="button" tabIndex={-1}></button>
            <button id="shareBtn" className="shareBtn" type="button" tabIndex={-1}></button>
            <button id="shareModal" className="shareModal" type="button" tabIndex={-1}></button>
            <button id="share" className="share" type="button" tabIndex={-1}></button>
            <button id="share-modal-close" className="share-modal-close share-close" type="button" tabIndex={-1}></button>
            <button id="share-close" className="share-close" type="button" tabIndex={-1}></button>
            <button id="share-close-btn" className="share-close-btn" type="button" tabIndex={-1}></button>
            <button id="shareModalClose" className="shareModalClose" type="button" tabIndex={-1}></button>
            <button id="close-share-modal" className="close-share-modal" type="button" tabIndex={-1}></button>
            <button id="modal-close" className="modal-close" type="button" tabIndex={-1}></button>
            <button id="share-modal-trigger" className="share-modal-trigger" type="button" tabIndex={-1}></button>
            <button id="copy-btn" className="copy-btn copy-button" type="button" tabIndex={-1}></button>
            <button id="copy-button" className="copy-button" type="button" tabIndex={-1}></button>
            <button id="copyBtn" className="copyBtn" type="button" tabIndex={-1}></button>
            <button id="copy" className="copy" type="button" tabIndex={-1}></button>
            <button id="copyLink" className="copyLink" type="button" tabIndex={-1}></button>
            <button id="copy-link" className="copy-link" type="button" tabIndex={-1}></button>
            <button id="copyUrl" className="copyUrl" type="button" tabIndex={-1}></button>
            <button id="copy-url" className="copy-url" type="button" tabIndex={-1}></button>
            <div id="share-modal-content" className="share-modal-content"></div>
            <div id="shareModalContent" className="shareModalContent"></div>
            <div id="share-dialog" className="share-dialog"></div>
            <div id="share-popup" className="share-popup"></div>
            <div id="share-overlay" className="share-overlay"></div>
            <input id="share-link" className="share-link" type="hidden" tabIndex={-1} readOnly defaultValue="" />
            <input id="share-input" className="share-input" type="hidden" tabIndex={-1} readOnly defaultValue="" />
            <input id="share-url" className="share-url" type="hidden" tabIndex={-1} readOnly defaultValue="" />
            <input id="shareUrl" className="shareUrl" type="hidden" tabIndex={-1} readOnly defaultValue="" />
            <input id="copy-input" className="copy-input" type="hidden" tabIndex={-1} readOnly defaultValue="" />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
