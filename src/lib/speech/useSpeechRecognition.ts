"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Extend Window interface for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * Format spoken punctuation commands to real punctuation symbols.
 */
export function formatSpokenPunctuation(text: string): string {
  if (!text) return "";

  return text
    .replace(/\b(full stop|period)\b/gi, ".")
    .replace(/\bcomma\b/gi, ",")
    .replace(/\bquestion mark\b/gi, "?")
    .replace(/\b(exclamation mark|exclamation point)\b/gi, "!")
    .replace(/\b(new line|next line)\b/gi, "\n")
    .replace(/\bcolon\b/gi, ":")
    .replace(/\bsemicolon\b/gi, ";")
    .replace(/\bhyphen\b/gi, "-")
    .replace(/\bopen parenthesis\b/gi, "(")
    .replace(/\bclose parenthesis\b/gi, ")");
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    lang = "en-US",
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as IWindow;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionClass);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop on inactive
      }
    }
    setIsListening(false);
    setInterimTranscript("");
    if (onEnd) onEnd();
  }, [onEnd]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const msg = "Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.";
      setError(msg);
      if (onError) onError(msg);
      return;
    }

    // Stop existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    setError(null);
    setTranscript("");
    setInterimTranscript("");

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        shouldListenRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || "";
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }

        const formattedFinal = formatSpokenPunctuation(finalChunk);
        const formattedInterim = formatSpokenPunctuation(interimChunk);

        if (formattedFinal) {
          setTranscript((prev) => (prev ? `${prev} ${formattedFinal}` : formattedFinal));
          if (onResult) onResult(formattedFinal, true);
        }

        setInterimTranscript(formattedInterim);
        if (formattedInterim && onResult) {
          onResult(formattedInterim, false);
        }
      };

      recognition.onerror = (event: any) => {
        let errorMessage = "Speech recognition error";
        if (event.error === "not-allowed") {
          errorMessage = "Microphone access was denied. Please allow microphone permission in your browser.";
        } else if (event.error === "no-speech") {
          errorMessage = "No speech was detected. Please try speaking again.";
        } else if (event.error === "network") {
          errorMessage = "Network error during speech recognition.";
        } else if (event.error) {
          errorMessage = `Speech error: ${event.error}`;
        }

        // 'no-speech' is non-fatal in continuous mode
        if (event.error !== "no-speech") {
          setError(errorMessage);
          if (onError) onError(errorMessage);
        }
      };

      recognition.onend = () => {
        // If we should still be listening (continuous), auto-restart
        if (shouldListenRef.current) {
          try {
            recognition.start();
            return;
          } catch (e) {
            // Can fail if rapid stop
          }
        }
        setIsListening(false);
        setInterimTranscript("");
        if (onEnd) onEnd();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setError(err?.message || "Failed to start speech recognition");
      setIsListening(false);
      if (onError) onError(err?.message || "Failed to start speech recognition");
    }
  }, [lang, continuous, interimResults, onResult, onError, onEnd]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount
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

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
