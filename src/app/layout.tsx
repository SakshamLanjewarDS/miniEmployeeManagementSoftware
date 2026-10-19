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
                var EXT_QUERY_RE = /share|modal|chext|chrome-extension|inspector|copy/i;

                function createSafeStub(tag, hint) {
                  var isBtn = /btn|button|close|trigger|copy|submit/i.test(hint || tag || '');
                  var isInput = /input|link|url|text/i.test(hint || tag || '');
                  var el = document.createElement(isBtn ? 'button' : (isInput ? 'input' : (tag || 'div')));
                  el.style.display = 'none';
                  el.setAttribute('aria-hidden', 'true');
                  el.setAttribute('tabindex', '-1');
                  if (isInput) el.value = '';
                  return el;
                }

                function isExtensionCaller(query) {
                  if (typeof query === 'string' && EXT_QUERY_RE.test(query)) return true;
                  try {
                    var stack = (new Error().stack || '').toLowerCase();
                    return (
                      stack.indexOf('share-modal') !== -1 ||
                      stack.indexOf('chext') !== -1 ||
                      stack.indexOf('chrome-extension') !== -1 ||
                      stack.indexOf('inspector') !== -1
                    );
                  } catch (e) {
                    return false;
                  }
                }

                // Patch Document prototype methods
                var origDocGetElementById = Document.prototype.getElementById;
                Document.prototype.getElementById = function(id) {
                  var el = origDocGetElementById.apply(this, arguments);
                  if (!el && isExtensionCaller(id)) {
                    var stub = createSafeStub('div', id);
                    stub.id = id;
                    return stub;
                  }
                  return el;
                };

                var origDocQuerySelector = Document.prototype.querySelector;
                Document.prototype.querySelector = function(sel) {
                  var el = origDocQuerySelector.apply(this, arguments);
                  if (!el && isExtensionCaller(sel)) {
                    return createSafeStub('div', sel);
                  }
                  return el;
                };

                var origDocQuerySelectorAll = Document.prototype.querySelectorAll;
                Document.prototype.querySelectorAll = function(sel) {
                  var list = origDocQuerySelectorAll.apply(this, arguments);
                  if ((!list || list.length === 0) && isExtensionCaller(sel)) {
                    return [createSafeStub('div', sel)];
                  }
                  return list;
                };

                var origDocGetElementsByClassName = Document.prototype.getElementsByClassName;
                Document.prototype.getElementsByClassName = function(className) {
                  var list = origDocGetElementsByClassName.apply(this, arguments);
                  if ((!list || list.length === 0) && isExtensionCaller(className)) {
                    return [createSafeStub('div', className)];
                  }
                  return list;
                };

                // Patch Element prototype methods (crucial: extensions query child elements)
                if (typeof Element !== 'undefined' && Element.prototype) {
                  var origElemQuerySelector = Element.prototype.querySelector;
                  Element.prototype.querySelector = function(sel) {
                    var el = origElemQuerySelector.apply(this, arguments);
                    if (!el && isExtensionCaller(sel)) {
                      return createSafeStub('div', sel);
                    }
                    return el;
                  };

                  var origElemQuerySelectorAll = Element.prototype.querySelectorAll;
                  Element.prototype.querySelectorAll = function(sel) {
                    var list = origElemQuerySelectorAll.apply(this, arguments);
                    if ((!list || list.length === 0) && isExtensionCaller(sel)) {
                      return [createSafeStub('div', sel)];
                    }
                    return list;
                  };

                  var origElemGetElementsByClassName = Element.prototype.getElementsByClassName;
                  Element.prototype.getElementsByClassName = function(className) {
                    var list = origElemGetElementsByClassName.apply(this, arguments);
                    if ((!list || list.length === 0) && isExtensionCaller(className)) {
                      return [createSafeStub('div', className)];
                    }
                    return list;
                  };
                }

                // 3. Resolve CSS preload consumption warning
                function satisfyPreload(linkEl) {
                  try {
                    var href = linkEl && linkEl.getAttribute('href');
                    if (!href) return;
                    var cleanHref = href.split('?')[0];
                    var exists = document.querySelector('link[rel="stylesheet"][href*="' + cleanHref + '"]');
                    if (!exists) {
                      var link = document.createElement('link');
                      link.rel = 'stylesheet';
                      link.href = href;
                      document.head.appendChild(link);
                    }
                  } catch (e) {}
                }

                function satisfyPreloadStylesheets() {
                  try {
                    var preloads = document.querySelectorAll('link[rel="preload"][as="style"]');
                    for (var i = 0; i < preloads.length; i++) {
                      satisfyPreload(preloads[i]);
                    }
                  } catch (e) {}
                }

                // Run immediately and observe additions
                satisfyPreloadStylesheets();

                if (typeof MutationObserver !== 'undefined' && document.head) {
                  try {
                    var observer = new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var added = mutations[i].addedNodes;
                        for (var j = 0; j < added.length; j++) {
                          var node = added[j];
                          if (node && node.nodeType === 1 && node.tagName === 'LINK' && node.getAttribute('rel') === 'preload' && node.getAttribute('as') === 'style') {
                            satisfyPreload(node);
                          }
                        }
                      }
                    });
                    observer.observe(document.head, { childList: true });
                  } catch (e) {}
                }

                if (document.readyState === 'complete') {
                  satisfyPreloadStylesheets();
                } else {
                  window.addEventListener('DOMContentLoaded', satisfyPreloadStylesheets);
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
