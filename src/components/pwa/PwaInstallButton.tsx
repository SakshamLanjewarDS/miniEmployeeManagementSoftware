"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, Check, X, Share2, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone PWA
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
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
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Desktop or Android where prompt wasn't fired yet
      alert(
        "To install 100% DESIGN Studio OS:\n\n• On Chrome/Edge (PC): Click the 'Install app' icon in your browser URL address bar (top right).\n• On Android: Tap Chrome's menu (⋮) and select 'Install app' or 'Add to Home screen'."
      );
    }
  };

  if (isStandalone || installed) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span>Installed as App</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        suppressHydrationWarning
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#5A81FA]/10 to-[#CEDEFF]/40 hover:from-[#5A81FA]/20 hover:to-[#CEDEFF]/70 text-[#2C308D] text-xs font-semibold border border-[#CEDEFF] transition-all cursor-pointer shadow-2xs group"
        title="Install as native Desktop or Mobile app with home screen icon"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#5A81FA] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
            <Download className="w-3 h-3" />
          </div>
          <span>Install Studio App</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#5A81FA] font-medium">
          <Monitor className="w-3 h-3" />
          <span>/</span>
          <Smartphone className="w-3 h-3" />
        </div>
      </button>

      {/* iOS Safari Installation Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E2E6F0] space-y-4 animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-[#1F1F1F]">
                <Smartphone className="w-4 h-4 text-[#5A81FA]" />
                <span>Install on iPhone / iPad</span>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-lg text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#696E82]">
              Apple iOS requires adding web apps from Safari. Follow these 2 simple steps:
            </p>

            <div className="space-y-3 text-xs bg-[#F8F9FD] p-3.5 rounded-xl border border-[#E2E6F0]">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#5A81FA] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span>Tap the </span>
                  <span className="font-semibold text-[#1F1F1F] inline-flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-[#5A81FA] inline" /> Share button
                  </span>
                  <span> at the bottom of your Safari browser bar.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#5A81FA] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span>Scroll down and tap </span>
                  <span className="font-semibold text-[#1F1F1F] inline-flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 text-[#5A81FA] inline" /> &quot;Add to Home Screen&quot;
                  </span>
                  <span>, then tap <strong>Add</strong> in the top-right corner.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 bg-[#5A81FA] text-white rounded-xl text-xs font-semibold hover:bg-[#426EE8] transition-colors"
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
