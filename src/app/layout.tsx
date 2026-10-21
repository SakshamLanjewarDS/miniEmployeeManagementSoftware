import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
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
        {/* Browser Extension Safety Shield: Prevent external extensions from corrupting DOM before hydration and suppress extension noise */}
        <script
          id="browser-extension-error-shield"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Prevent extensions (autofill, password managers) from mutating DOM elements with fdprocessedid before/during hydration
                try {
                  if (typeof Element !== 'undefined' && Element.prototype && Element.prototype.setAttribute) {
                    var origSetAttribute = Element.prototype.setAttribute;
                    Element.prototype.setAttribute = function(name, value) {
                      if (typeof name === 'string' && name.toLowerCase() === 'fdprocessedid') {
                        return;
                      }
                      return origSetAttribute.apply(this, arguments);
                    };
                  }
                } catch(e) {}

                // 2. Safe element fallback for extension content scripts (share-modal, chext) querying DOM before complete
                try {
                  if (typeof document !== 'undefined') {
                    var dummyTarget = document.createElement('div');
                    dummyTarget.id = 'share-modal-dummy';
                    dummyTarget.addEventListener = function() { return this; };
                    dummyTarget.removeEventListener = function() { return this; };
                    dummyTarget.setAttribute = function() { return this; };
                    dummyTarget.getAttribute = function() { return ''; };
                    dummyTarget.querySelector = function() { return dummyTarget; };
                    dummyTarget.querySelectorAll = function() { return [dummyTarget]; };
                    dummyTarget.getElementsByTagName = function() { return [dummyTarget]; };
                    dummyTarget.getElementsByClassName = function() { return [dummyTarget]; };

                    var isExtensionCall = function(val) {
                      try {
                        var err = new Error();
                        var stack = (err.stack || '').toLowerCase();
                        if (
                          stack.indexOf('share-modal') !== -1 ||
                          stack.indexOf('chext') !== -1 ||
                          stack.indexOf('chrome-extension') !== -1
                        ) {
                          return true;
                        }
                      } catch(e) {}
                      if (typeof val === 'string') {
                        var v = val.toLowerCase();
                        if (v.indexOf('share') !== -1 || v.indexOf('copy') !== -1 || v.indexOf('modal') !== -1) {
                          return true;
                        }
                      }
                      return false;
                    };

                    var origGetById = document.getElementById.bind(document);
                    document.getElementById = function(id) {
                      var el = origGetById(id);
                      if (!el && isExtensionCall(id)) {
                        return dummyTarget;
                      }
                      return el;
                    };

                    var origQuerySel = document.querySelector.bind(document);
                    document.querySelector = function(sel) {
                      var el = origQuerySel(sel);
                      if (!el && isExtensionCall(sel)) {
                        return dummyTarget;
                      }
                      return el;
                    };

                    var origQuerySelAll = document.querySelectorAll.bind(document);
                    document.querySelectorAll = function(sel) {
                      var res = origQuerySelAll(sel);
                      if ((!res || res.length === 0) && isExtensionCall(sel)) {
                        return [dummyTarget];
                      }
                      return res;
                    };

                    var origElemQuerySel = Element.prototype.querySelector;
                    if (origElemQuerySel) {
                      Element.prototype.querySelector = function(sel) {
                        var el = origElemQuerySel.apply(this, arguments);
                        if (!el && isExtensionCall(sel)) {
                          return dummyTarget;
                        }
                        return el;
                      };
                    }

                    var origElemQuerySelAll = Element.prototype.querySelectorAll;
                    if (origElemQuerySelAll) {
                      Element.prototype.querySelectorAll = function(sel) {
                        var res = origElemQuerySelAll.apply(this, arguments);
                        if ((!res || res.length === 0) && isExtensionCall(sel)) {
                          return [dummyTarget];
                        }
                        return res;
                      };
                    }

                    var origGetByClass = document.getElementsByClassName.bind(document);
                    document.getElementsByClassName = function(cls) {
                      var res = origGetByClass(cls);
                      if ((!res || res.length === 0) && isExtensionCall(cls)) {
                        return [dummyTarget];
                      }
                      return res;
                    };

                    // Safely intercept Chrome extension JSON.parse failures (e.g. set-json-global.js)
                    try {
                      var origJSONParse = JSON.parse;
                      JSON.parse = function(text, reviver) {
                        try {
                          return origJSONParse.apply(this, arguments);
                        } catch (err) {
                          if (err instanceof SyntaxError) {
                            try {
                              var stack = (new Error().stack || '') + ' ' + ((err && err.stack) || '');
                              stack = stack.toLowerCase();
                              if (
                                stack.indexOf('set-json-global') !== -1 ||
                                stack.indexOf('bcjindcccaagfpapjjmafapmmgkkhgoa') !== -1 ||
                                stack.indexOf('chrome-extension') !== -1 ||
                                stack.indexOf('json-formatter') !== -1
                              ) {
                                return {};
                              }
                            } catch(e) {}
                          }
                          throw err;
                        }
                      };
                    } catch(e) {}
                  }
                } catch(e) {}

                // 2. Identify and filter known noisy external browser extension errors and hydration false-positives
                var isIgnored = function(msg, url, stack) {
                  var str = (String(msg || '') + ' ' + String(url || '') + ' ' + String(stack || '')).toLowerCase();
                  return (
                    str.indexOf('share-modal') !== -1 ||
                    str.indexOf('share_modal') !== -1 ||
                    str.indexOf('sharemodal') !== -1 ||
                    str.indexOf('chext') !== -1 ||
                    str.indexOf('inspector') !== -1 ||
                    str.indexOf('json formatter') !== -1 ||
                    str.indexOf('set-json-global') !== -1 ||
                    str.indexOf('bcjindcccaagfpapjjmafapmmgkkhgoa') !== -1 ||
                    str.indexOf('chrome-extension') !== -1 ||
                    str.indexOf('unexpected end of json input') !== -1 ||
                    str.indexOf('fdprocessedid') !== -1 ||
                    str.indexOf('permissions policy violation') !== -1 ||
                    str.indexOf('unload is not allowed') !== -1 ||
                    str.indexOf('beforeinstallprompt') !== -1 ||
                    str.indexOf('preloaded using link preload but not used') !== -1 ||
                    str.indexOf('preload but not used within a few seconds') !== -1 ||
                    (str.indexOf('cannot read properties of null') !== -1 && str.indexOf('addeventlistener') !== -1)
                  );
                };

                // Intercept window.onerror to prevent browser DevTools and Next dev overlay popups
                var origOnError = window.onerror;
                window.onerror = function(msg, url, line, col, error) {
                  var stack = (error && error.stack) || '';
                  if (isIgnored(msg, url, stack)) {
                    return true;
                  }
                  if (origOnError) return origOnError.apply(this, arguments);
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

                // Clean up preloaded links on window load to prevent Chromium unused-preload timer warnings
                if (typeof window !== 'undefined') {
                  window.addEventListener('load', function() {
                    setTimeout(function() {
                      try {
                        var preloads = document.querySelectorAll('link[rel="preload"]');
                        preloads.forEach(function(l) {
                          if (l && l.parentNode) {
                            l.parentNode.removeChild(l);
                          }
                        });
                      } catch(e) {}
                    }, 500);
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${dmSans.className} antialiased min-h-screen selection:bg-[#5A81FA] selection:text-white`}>

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
