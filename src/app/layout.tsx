import type { Metadata, Viewport } from "next";
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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
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
        {/* Synchronous Extension Shield: Must execute synchronously in <head> before external extensions */}
        <script
          id="browser-extension-error-shield"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Error filter for extension scripts (share-modal.js, chext, inspector)
                var isIgnored = function(msg, url, stack) {
                  var str = (String(msg || '') + ' ' + String(url || '') + ' ' + String(stack || '')).toLowerCase();
                  return (
                    str.indexOf('share-modal') !== -1 ||
                    str.indexOf('chext_') !== -1 ||
                    str.indexOf('inspector.') !== -1 ||
                    str.indexOf("cannot read properties of null (reading 'addeventlistener')") !== -1 ||
                    str.indexOf("permissions policy violation: unload") !== -1 ||
                    str.indexOf("beforeinstallprompt") !== -1
                  );
                };

                // Suppress window.onerror so browser devtools doesn't log Uncaught TypeError
                var prevOnError = window.onerror;
                window.onerror = function(msg, url, line, col, err) {
                  if (isIgnored(msg, url, err && err.stack)) {
                    return true;
                  }
                  if (typeof prevOnError === 'function') {
                    return prevOnError.apply(this, arguments);
                  }
                  return false;
                };

                // Capture phase error listener
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

                // Unhandled rejection listener
                window.addEventListener('unhandledrejection', function(event) {
                  var reason = event.reason;
                  var msg = (reason && (reason.message || reason.stack)) || String(reason || '');
                  if (isIgnored(msg, '', reason && reason.stack)) {
                    if (event.preventDefault) event.preventDefault();
                    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                  }
                });

                // 2. Safe DOM stub generator for missing extension elements
                function createSafeStub(tag) {
                  var el = document.createElement(tag || 'div');
                  el.style.display = 'none';
                  el.setAttribute('aria-hidden', 'true');
                  return el;
                }

                function shouldStub(query, stack) {
                  var q = String(query || '').toLowerCase();
                  var s = String(stack || '').toLowerCase();
                  return (
                    s.indexOf('share-modal') !== -1 ||
                    s.indexOf('chext_') !== -1 ||
                    s.indexOf('inspector') !== -1 ||
                    s.indexOf('chrome-extension') !== -1 ||
                    s.indexOf('extension') !== -1 ||
                    q.indexOf('share') !== -1 ||
                    q.indexOf('modal') !== -1
                  );
                }

                // Patch Document.prototype to guarantee coverage across all queries
                var origGetElementById = Document.prototype.getElementById;
                Document.prototype.getElementById = function(id) {
                  var el = origGetElementById.apply(this, arguments);
                  if (!el && typeof id === 'string') {
                    var stack = '';
                    try { stack = (new Error().stack) || ''; } catch(e) {}
                    if (shouldStub(id, stack)) {
                      var isBtn = /btn|button|close/i.test(id);
                      var stub = createSafeStub(isBtn ? 'button' : 'div');
                      stub.id = id;
                      return stub;
                    }
                  }
                  return el;
                };

                var origQuerySelector = Document.prototype.querySelector;
                Document.prototype.querySelector = function(sel) {
                  var el = origQuerySelector.apply(this, arguments);
                  if (!el && typeof sel === 'string') {
                    var stack = '';
                    try { stack = (new Error().stack) || ''; } catch(e) {}
                    if (shouldStub(sel, stack)) {
                      var isBtn = /btn|button|close/i.test(sel);
                      return createSafeStub(isBtn ? 'button' : 'div');
                    }
                  }
                  return el;
                };

                var origGetElementsByClassName = Document.prototype.getElementsByClassName;
                Document.prototype.getElementsByClassName = function(className) {
                  var list = origGetElementsByClassName.apply(this, arguments);
                  if ((!list || list.length === 0) && typeof className === 'string') {
                    var stack = '';
                    try { stack = (new Error().stack) || ''; } catch(e) {}
                    if (shouldStub(className, stack)) {
                      return [createSafeStub('div')];
                    }
                  }
                  return list;
                };

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
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen selection:bg-[#5A81FA] selection:text-white">
        {/* Hidden stub elements for external extensions (share-modal.js, chext) */}
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
            <div id="share-modal-content" className="share-modal-content"></div>
            <div id="shareModalContent" className="shareModalContent"></div>
            <div id="share-dialog" className="share-dialog"></div>
            <div id="share-popup" className="share-popup"></div>
            <div id="share-overlay" className="share-overlay"></div>
            <input id="share-link" className="share-link" type="hidden" tabIndex={-1} readOnly defaultValue="" />
            <input id="share-input" className="share-input" type="hidden" tabIndex={-1} readOnly defaultValue="" />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
