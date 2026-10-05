"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Check,
  Languages,
  Keyboard,
  Settings2,
  X,
  Volume2,
  HelpCircle,
  Wand2,
} from "lucide-react";
import { correctGrammar } from "@/lib/grammar/grammarEngine";
import { formatSpokenPunctuation } from "@/lib/speech/useSpeechRecognition";

// Supported languages for speech recognition
const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-IN", name: "English (India)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "en-AU", name: "English (Australia)" },
  { code: "hi-IN", name: "Hindi (India)" },
];

/**
 * Safely updates an input or textarea value in a way that React synthetic event
 * listeners (e.g. onChange, react-hook-form) react to immediately.
 */
function updateNativeInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  newValue: string
) {
  const isTextArea = element instanceof HTMLTextAreaElement;
  const proto = isTextArea
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;

  const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

  if (valueSetter) {
    valueSetter.call(element, newValue);
  } else {
    element.value = newValue;
  }

  // Dispatch both 'input' and 'change' events with bubbles: true
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function GlobalInputAssistant() {
  const [activeElement, setActiveElement] = useState<
    HTMLInputElement | HTMLTextAreaElement | null
  >(null);
  const [toolbarPos, setToolbarPos] = useState<{
    top: number;
    left: number;
    isTopPosition: boolean;
  } | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [selectedLang, setSelectedLang] = useState("en-US");
  const [autoCorrectOnSpeechEnd, setAutoCorrectOnSpeechEnd] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Scratchpad for testing in the guide modal
  const [testText, setTestText] = useState(
    "we was working on teh cad drawings and should of submitted r0 revision untill tommorrow ."
  );

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null
  );

  // Sync ref with state
  useEffect(() => {
    activeElementRef.current = activeElement;
  }, [activeElement]);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSupport =
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setIsSupported(hasSupport);
    }
  }, []);

  // Update toolbar position relative to active element using viewport coordinates
  const updatePosition = useCallback(() => {
    const el = activeElementRef.current;
    if (!el || !document.body.contains(el)) {
      setToolbarPos(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setToolbarPos(null);
      return;
    }

    // Viewport-based calculation (used with position: fixed)
    const spaceBelow = window.innerHeight - rect.bottom;
    const isTopPosition = spaceBelow < 46 && rect.top > 46;

    const top = isTopPosition ? Math.max(10, rect.top - 40) : Math.min(window.innerHeight - 50, rect.bottom + 4);
    const left = Math.max(12, Math.min(window.innerWidth - 200, rect.right - 180));

    setToolbarPos({
      top,
      left,
      isTopPosition,
    });
  }, []);

  // Recalculate on scroll (with capture for inside modal scrolls) or window resize
  useEffect(() => {
    if (!activeElement) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [activeElement, updatePosition]);

  // Global focus listener
  useEffect(() => {
    const isEligibleElement = (
      el: HTMLElement | null
    ): el is HTMLInputElement | HTMLTextAreaElement => {
      if (!el) return false;
      if (el.tagName === "TEXTAREA") return !el.hasAttribute("readonly") && !el.hasAttribute("disabled");
      if (el.tagName === "INPUT") {
        const input = el as HTMLInputElement;
        const type = (input.type || "text").toLowerCase();
        const ineligibleTypes = [
          "password",
          "checkbox",
          "radio",
          "file",
          "submit",
          "button",
          "reset",
          "image",
          "range",
          "color",
          "hidden",
        ];
        return (
          !ineligibleTypes.includes(type) &&
          !input.hasAttribute("readonly") &&
          !input.hasAttribute("disabled")
        );
      }
      return false;
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (isEligibleElement(target)) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setActiveElement(target);
        activeElementRef.current = target;
        setTimeout(updatePosition, 10);
      }
    };

    const handleFocusOut = () => {
      // Delay hiding in case user clicked on toolbar itself or is still dictating
      hideTimerRef.current = setTimeout(() => {
        if (!shouldListenRef.current) {
          setActiveElement(null);
          setToolbarPos(null);
          setShowSettings(false);
        }
      }, 400);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [updatePosition]);

  // Show temporary feedback toast
  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Perform Grammar Correction on current field
  const handleAutoCorrect = useCallback(() => {
    const el = activeElementRef.current;
    if (!el) return;

    const currentVal = el.value || "";
    if (!currentVal.trim()) {
      showFeedback("Field is empty");
      return;
    }

    const { correctedText, changesCount } = correctGrammar(currentVal);

    if (changesCount > 0) {
      updateNativeInputValue(el, correctedText);
      showFeedback(`Corrected ${changesCount} issue${changesCount > 1 ? "s" : ""} ✨`);
    } else {
      showFeedback("Grammar & spelling look great! 👍");
    }
  }, []);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setInterimText("");

    // If autoCorrectOnSpeechEnd is true, run grammar correction after user finishes speaking
    if (autoCorrectOnSpeechEnd && activeElementRef.current) {
      setTimeout(() => {
        handleAutoCorrect();
      }, 250);
    }
  }, [autoCorrectOnSpeechEnd, handleAutoCorrect]);

  // Start speech recognition
  const startListening = useCallback(() => {
    const el = activeElementRef.current;
    if (!el) {
      showFeedback("Click an input field first");
      return;
    }

    if (typeof window === "undefined") return;
    const win = window as any;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      showFeedback("Speech not supported in browser");
      return;
    }

    // Stop existing
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = selectedLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        shouldListenRef.current = true;
        showFeedback("Listening... Speak now");
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }

        const formattedFinal = formatSpokenPunctuation(finalChunk);
        const formattedInterim = formatSpokenPunctuation(interimChunk);

        setInterimText(formattedInterim);

        if (formattedFinal && activeElementRef.current) {
          const target = activeElementRef.current;
          const currentText = target.value || "";

          // Add space if needed
          const separator =
            currentText.length > 0 && !/\s$/.test(currentText) ? " " : "";
          const newText = currentText + separator + formattedFinal;

          updateNativeInputValue(target, newText);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          showFeedback("Microphone access denied");
        } else if (event.error !== "no-speech") {
          showFeedback(`Mic error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
            return;
          } catch (e) {}
        }
        setIsListening(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      showFeedback("Failed to activate microphone");
      setIsListening(false);
    }
  }, [selectedLang]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Keyboard Shortcuts: Ctrl+Shift+V (Dictate) and Ctrl+Shift+G (Grammar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user pressed Ctrl+Shift+V or Cmd+Shift+V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (activeElementRef.current) {
          toggleListening();
        }
      }
      // Check if user pressed Ctrl+Shift+G or Cmd+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (activeElementRef.current) {
          handleAutoCorrect();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAutoCorrect]);

  // Clean up recognition
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <>
      {/* 1. Attached Floating Micro-Toolbar on Focused Text Field */}
      {toolbarPos && (
        <div
          onMouseDown={(e) => {
            // Prevent input from losing focus when clicking toolbar buttons
            e.preventDefault();
          }}
          style={{
            top: `${toolbarPos.top}px`,
            left: `${toolbarPos.left}px`,
          }}
          className="fixed z-[100] flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md border border-[#E2E6F0] rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Voice to Text Button */}
          {isSupported && (
            <button
              type="button"
              onClick={toggleListening}
              title={
                isListening
                  ? "Stop listening (Ctrl+Shift+V)"
                  : "Voice to Text dictation (Ctrl+Shift+V)"
              }
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer transition-all ${
                isListening
                  ? "bg-red-500 text-white shadow-sm animate-pulse"
                  : "bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#5A81FA]"
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 animate-bounce" />
                  <span className="text-[11px] pr-0.5">Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Voice</span>
                </>
              )}
            </button>
          )}

          {/* Auto-Correct Grammar Button */}
          <button
            type="button"
            onClick={handleAutoCorrect}
            title="Auto-Correct Grammar, Spelling & Formatting (Ctrl+Shift+G)"
            className="p-1.5 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#1F1F1F] hover:text-[#5A81FA] rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span className="text-[11px] hidden sm:inline">Fix Grammar</span>
          </button>

          {/* Settings / Language Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            title="Voice & Grammar Settings"
            className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FD] rounded-lg cursor-pointer transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Settings Popover */}
          {showSettings && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-white border border-[#E2E6F0] rounded-xl shadow-2xl z-[110] text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2">
                <span className="font-bold text-[#1F1F1F]">Voice & Grammar Settings</span>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-[#696E82] hover:text-[#1F1F1F] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Language Selection */}
              <div>
                <label className="text-[11px] font-semibold text-[#696E82] block mb-1">
                  Dictation Language
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F]"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto Correct After Speaking */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#1F1F1F]">Auto-fix grammar after voice</span>
                <input
                  type="checkbox"
                  checked={autoCorrectOnSpeechEnd}
                  onChange={(e) => setAutoCorrectOnSpeechEnd(e.target.checked)}
                  className="rounded border-[#E2E6F0] text-[#5A81FA] focus:ring-[#5A81FA]"
                />
              </div>

              {/* Shortcuts hint */}
              <div className="pt-2 border-t border-[#E2E6F0] text-[10px] text-[#696E82] space-y-1">
                <div className="flex items-center justify-between">
                  <span>Toggle Voice:</span>
                  <kbd className="px-1.5 py-0.5 bg-[#F2F4FF] rounded text-[#1F1F1F] font-mono">
                    Ctrl+Shift+V
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fix Grammar:</span>
                  <kbd className="px-1.5 py-0.5 bg-[#F2F4FF] rounded text-[#1F1F1F] font-mono">
                    Ctrl+Shift+G
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Floating Live Speech / Feedback Toast */}
      {(feedbackMessage || isListening) && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
          {/* Active Listening Indicator */}
          {isListening && (
            <div className="bg-[#1F1F1F] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto">
              <div className="relative flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              </div>
              <div className="text-xs">
                <p className="font-semibold flex items-center gap-1.5">
                  <span>Dictating live into field</span>
                  <span className="text-[10px] text-white/60 font-mono">
                    ({selectedLang})
                  </span>
                </p>
                {interimText ? (
                  <p className="text-[11px] text-white/80 italic max-w-xs truncate">
                    &quot;{interimText}&quot;
                  </p>
                ) : (
                  <p className="text-[10px] text-white/60">
                    Say &quot;period&quot;, &quot;comma&quot;, &quot;new line&quot; for punctuation...
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="ml-2 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Feedback Message */}
          {feedbackMessage && !isListening && (
            <div className="bg-[#1F1F1F] text-white px-4 py-2 rounded-xl shadow-xl border border-white/10 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Persistent Studio Assistant Button in Bottom-Left */}
      <div className="fixed bottom-5 left-5 z-40 hidden md:block">
        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/90 hover:bg-white border border-[#E2E6F0] hover:border-[#5A81FA] text-[#1F1F1F] rounded-full shadow-md hover:shadow-lg text-xs font-semibold transition-all cursor-pointer group"
          title="Voice to Text & Auto-Correct Grammar Information"
        >
          <div className="flex items-center -space-x-1">
            <span className="w-5 h-5 rounded-full bg-[#5A81FA] text-white flex items-center justify-center shadow-xs">
              <Mic className="w-2.5 h-2.5" />
            </span>
            <span className="w-5 h-5 rounded-full bg-[#EA4335] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-2.5 h-2.5" />
            </span>
          </div>
          <span>Voice & Grammar Active</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F2F4FF] text-[#5A81FA] font-mono group-hover:bg-[#5A81FA] group-hover:text-white transition-colors">
            Ctrl+Shift+V
          </span>
        </button>
      </div>

      {/* 4. Voice & Grammar Guide & Scratchpad Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#5A81FA] text-white flex items-center justify-center shadow-sm">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    Voice-to-Text & Grammar Auto-Correct
                  </h3>
                  <p className="text-xs text-[#696E82]">
                    Built into every text field, textarea, and form across the studio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* How it works */}
            <div className="space-y-3 text-xs text-[#696E82]">
              <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1.5">
                <p className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <span className="text-[#5A81FA]">🎯</span> How It Works on Every Field:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Click into <strong>any text field or textarea</strong> anywhere in the app (Tasks, Projects, Team, Visits, Drawings, Mails, etc.).
                  </li>
                  <li>
                    A sleek floating bar appears instantly with <strong>Voice Dictation</strong> and <strong>Fix Grammar</strong> buttons.
                  </li>
                  <li>
                    Press <kbd className="px-1.5 py-0.5 bg-white border border-[#E2E6F0] rounded font-mono font-bold text-[#1F1F1F]">Ctrl+Shift+V</kbd> to toggle microphone dictation.
                  </li>
                  <li>
                    Press <kbd className="px-1.5 py-0.5 bg-white border border-[#E2E6F0] rounded font-mono font-bold text-[#1F1F1F]">Ctrl+Shift+G</kbd> to fix grammar, typos, capitalization, and architectural acronyms.
                  </li>
                </ul>
              </div>

              {/* Punctuation voice commands */}
              <div className="p-3 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl space-y-1.5">
                <p className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <span className="text-red-500">🎙️</span> Spoken Punctuation Commands:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>Say &quot;period&quot; &rarr; <code>.</code></div>
                  <div>Say &quot;comma&quot; &rarr; <code>,</code></div>
                  <div>Say &quot;question mark&quot; &rarr; <code>?</code></div>
                  <div>Say &quot;exclamation mark&quot; &rarr; <code>!</code></div>
                  <div>Say &quot;new line&quot; &rarr; <code>&crarr;</code></div>
                  <div>Say &quot;colon&quot; &rarr; <code>:</code></div>
                </div>
              </div>

              {/* Interactive Scratchpad */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-[#1F1F1F]">
                  Test Scratchpad (Try it here):
                </label>
                <textarea
                  rows={3}
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Click here and test Voice (Ctrl+Shift+V) or Grammar (Ctrl+Shift+G)..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const { correctedText } = correctGrammar(testText);
                      setTestText(correctedText);
                    }}
                    className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Grammar Fixer</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E6F0] flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
