"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Smartphone, Monitor, Check, X, Share2, PlusSquare, ArrowRight, Laptop } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallButtonProps {
  variant?: "full" | "compact";
  className?: string;
}

export function PwaInstallButton({ variant = "full", className = "" }: PwaInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker for PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.debug("PWA service worker registration skipped:", err);
      });
    }

    // 2. Check if already running as standalone PWA
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 3. Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      setGuidePlatform("ios");
    } else if (isAndroidDevice) {
      setGuidePlatform("android");
    } else {
      setGuidePlatform("desktop");
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowGuide(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  if (isStandalone || installed) {
    if (variant === "compact") {
      return (
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>App Installed</span>
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span>Installed as App</span>
      </div>
    );
  }

  return (
    <>
      {variant === "compact" ? (
        <button
          type="button"
          suppressHydrationWarning
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B122B] hover:bg-[#162244] text-amber-300 text-xs font-semibold border border-amber-400/30 transition-all cursor-pointer shadow-xs group ${className}`}
          title="Install 100% DESIGN Studio App on your phone or laptop"
        >
          <Download className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
          <span className="text-[11px]">Install App</span>
        </button>
      ) : (
        <button
          type="button"
          suppressHydrationWarning
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#0B122B] to-[#1A254B] hover:from-[#131D42] hover:to-[#223163] text-white text-xs font-semibold border border-[#2A3B72] transition-all cursor-pointer shadow-sm group ${className}`}
          title="Install as native Desktop or Mobile app with home screen icon"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400 text-[#0B122B] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-white text-xs font-semibold flex items-center gap-1">
                Install Studio App
              </div>
              <div className="text-[10px] text-amber-300 font-medium">Add icon to home / desktop</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#A8B1CE] font-medium bg-white/10 px-1.5 py-0.5 rounded-md">
            <Monitor className="w-3 h-3 text-amber-300" />
            <span>/</span>
            <Smartphone className="w-3 h-3 text-amber-300" />
          </div>
        </button>
      )}

      {/* Cross-Platform Installation Instruction Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E2E6F0] space-y-4 animate-in slide-in-from-bottom-5 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0 bg-[#0B122B] p-1 border border-amber-400/30">
                  <Image
                    src="/icons/icon-192.png"
                    alt="100% DESIGN Studio Logo"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F1F1F]">Install 100% DESIGN Studio</h3>
                  <p className="text-xs text-[#696E82]">Get the native app icon on your device</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex rounded-lg bg-[#F2F4FF] p-1 text-xs font-semibold text-[#696E82]">
              <button
                type="button"
                onClick={() => setGuidePlatform("desktop")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                  guidePlatform === "desktop"
                    ? "bg-white text-[#0B122B] shadow-xs font-bold"
                    : "hover:text-[#1F1F1F]"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Laptop / PC</span>
              </button>
              <button
                type="button"
                onClick={() => setGuidePlatform("android")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                  guidePlatform === "android"
                    ? "bg-white text-[#0B122B] shadow-xs font-bold"
                    : "hover:text-[#1F1F1F]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setGuidePlatform("ios")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                  guidePlatform === "ios"
                    ? "bg-white text-[#0B122B] shadow-xs font-bold"
                    : "hover:text-[#1F1F1F]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
            </div>

            {/* Platform Specific Steps */}
            {guidePlatform === "desktop" && (
              <div className="space-y-3 text-xs bg-[#F8F9FD] p-4 rounded-xl border border-[#E2E6F0]">
                <div className="font-semibold text-[#1F1F1F]">How to install on Chrome or Edge (Windows / Mac):</div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Look at the <strong>right side of your browser URL address bar</strong> at the top.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Click the <strong className="text-[#0B122B] bg-white px-1.5 py-0.5 rounded border border-[#CEDEFF] inline-flex items-center gap-1"><Download className="w-3 h-3 text-[#5A81FA]" /> Install app</strong> icon.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Click <strong>&quot;Install&quot;</strong>. The app icon will appear directly on your <strong>Desktop &amp; Taskbar / Dock</strong>!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {guidePlatform === "android" && (
              <div className="space-y-3 text-xs bg-[#F8F9FD] p-4 rounded-xl border border-[#E2E6F0]">
                <div className="font-semibold text-[#1F1F1F]">How to install on Android (Chrome / Samsung Internet):</div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Tap the <strong>browser menu (⋮ or three dots)</strong> in the top-right corner.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Confirm <strong>&quot;Install&quot;</strong>. The gold &amp; navy Studio OS icon will be placed on your home screen launcher!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {guidePlatform === "ios" && (
              <div className="space-y-3 text-xs bg-[#F8F9FD] p-4 rounded-xl border border-[#E2E6F0]">
                <div className="font-semibold text-[#1F1F1F]">How to install on iPhone &amp; iPad (Safari):</div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Tap the <strong className="inline-flex items-center gap-1 text-[#0B122B]"><Share2 className="w-3.5 h-3.5 text-[#5A81FA] inline" /> Share</strong> button at the bottom of Safari.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Scroll down and tap <strong className="inline-flex items-center gap-1 text-[#0B122B]"><PlusSquare className="w-3.5 h-3.5 text-[#5A81FA] inline" /> &quot;Add to Home Screen&quot;</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B122B] text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Tap <strong>Add</strong> in the top-right corner. The app opens fullscreen with its own app icon!
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 bg-[#0B122B] hover:bg-[#162244] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Understood, Close</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
