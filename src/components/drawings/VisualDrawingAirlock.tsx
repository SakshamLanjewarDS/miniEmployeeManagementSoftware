"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Columns,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  Eye,
  Info,
  Sparkles,
  Compass,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export type AirlockComparisonMode = "SLIDER" | "SPLIT" | "OVERLAY" | "NEW_ONLY";

export interface DrawingAirlockData {
  documentId?: string;
  drawingCode: string;
  drawingTitle: string;
  projectCode: string;
  projectName: string;
  discipline: "ARCHITECTURAL" | "STRUCTURAL" | "MEP" | "INTERIOR_DETAIL" | "LANDSCAPE";
  revisionA: {
    code: string;
    label: string;
    date: string;
    author: string;
    status: string;
  };
  revisionB: {
    code: string;
    label: string;
    date: string;
    author: string;
    status: string;
    changeSummary: string;
  };
}

interface VisualDrawingAirlockProps {
  data?: Partial<DrawingAirlockData>;
  onApprove?: (notes?: string) => void;
  onRequestChanges?: (notes: string) => void;
  onReject?: (notes: string) => void;
  isSubmitting?: boolean;
  className?: string;
}

export function VisualDrawingAirlock({
  data,
  onApprove,
  onRequestChanges,
  onReject,
  isSubmitting = false,
  className = "",
}: VisualDrawingAirlockProps) {
  const [mode, setMode] = useState<AirlockComparisonMode>("SLIDER");
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMarkupClouds, setShowMarkupClouds] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showMepOverlay, setShowMepOverlay] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [intendedAction, setIntendedAction] = useState<"APPROVE" | "CHANGES" | "REJECT">("APPROVE");

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSliderRef = useRef(false);

  // Default drawing data if not provided
  const drawing: DrawingAirlockData = {
    drawingCode: data?.drawingCode || "100D-ARC-GFC-302",
    drawingTitle: data?.drawingTitle || "Penthouse Master Suite & En-Suite Detail",
    projectCode: data?.projectCode || "PRJ-VIL",
    projectName: data?.projectName || "Villa Riviera Luxury Residence",
    discipline: data?.discipline || "ARCHITECTURAL",
    revisionA: {
      code: "Rev 02",
      label: "Approved for Coordination",
      date: "Oct 02, 2026",
      author: "Vikram R. (Sr. Architect)",
      status: "APPROVED_PREVIOUS",
      ...data?.revisionA,
    },
    revisionB: {
      code: "Rev 03",
      label: "GFC Submission (Plumbing Riser Shift)",
      date: "Today, 11:20 AM",
      author: "Ar. Priya Sharma",
      status: "PENDING_APPROVAL",
      changeSummary:
        "Shifted master en-suite plumbing core 450mm south. Expanded walk-in wardrobe depth to 2400mm and added pocket sliding door. Structural column clearance confirmed.",
      ...data?.revisionB,
    },
  };

  // Slider dragging handlers
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSliderRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSliderRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = Math.round((offsetX / rect.width) * 100);
        setSliderPosition(percentage);
      }
    };

    const handleMouseUp = () => {
      isDraggingSliderRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Pan handlers
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (isDraggingSliderRef.current) return;
    setIsDraggingPan(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePanMouseUp = () => {
    setIsDraggingPan(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliderPosition(50);
  };

  // Vector Blueprint SVG content renderer
  const renderVectorBlueprint = (isRevB: boolean, isOverlay: boolean = false) => {
    return (
      <svg
        viewBox="0 0 800 500"
        className="w-full h-full select-none"
        style={{
          backgroundColor: isOverlay ? "transparent" : "#0A1128",
        }}
      >
        <defs>
          {/* Architectural hatching pattern */}
          <pattern id="concreteHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke={isOverlay ? "#60A5FA" : "#3B82F6"} strokeWidth="1" strokeOpacity="0.4" />
          </pattern>
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.7" strokeDasharray="2,2" />
          </pattern>
          {/* Redline cloud filter */}
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#EF4444" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* 1. ARCHITECTURAL GRID */}
        {showGrid && (
          <rect width="800" height="500" fill="url(#gridPattern)" />
        )}

        {/* Grid Axis Markers */}
        <g stroke="#334155" strokeWidth="1" strokeDasharray="4,4">
          <line x1="80" y1="20" x2="80" y2="480" />
          <line x1="420" y1="20" x2="420" y2="480" />
          <line x1="720" y1="20" x2="720" y2="480" />
          <line x1="40" y1="80" x2="760" y2="80" />
          <line x1="40" y1="260" x2="760" y2="260" />
          <line x1="40" y1="440" x2="760" y2="440" />
        </g>

        {/* Grid Bubble Tags */}
        <g fontSize="10" fontFamily="monospace" fill="#64748B" textAnchor="middle" dominantBaseline="middle">
          <circle cx="80" cy="35" r="11" fill="#0F172A" stroke="#334155" />
          <text x="80" y="36">A</text>
          <circle cx="420" cy="35" r="11" fill="#0F172A" stroke="#334155" />
          <text x="420" y="36">B</text>
          <circle cx="720" cy="35" r="11" fill="#0F172A" stroke="#334155" />
          <text x="720" y="36">C</text>
          <circle cx="50" cy="80" r="11" fill="#0F172A" stroke="#334155" />
          <text x="50" y="81">1</text>
          <circle cx="50" cy="260" r="11" fill="#0F172A" stroke="#334155" />
          <text x="50" y="261">2</text>
          <circle cx="50" cy="440" r="11" fill="#0F172A" stroke="#334155" />
          <text x="50" y="441">3</text>
        </g>

        {/* 2. STRUCTURAL COLUMNS (Unchanged between revs) */}
        <g fill="url(#concreteHatch)" stroke="#38BDF8" strokeWidth="1.5">
          <rect x="70" y="70" width="22" height="22" />
          <rect x="410" y="70" width="22" height="22" />
          <rect x="710" y="70" width="22" height="22" />
          <rect x="70" y="430" width="22" height="22" />
          <rect x="410" y="430" width="22" height="22" />
          <rect x="710" y="430" width="22" height="22" />
        </g>

        {/* 3. EXTERIOR MASONRY ENCLOSURE (230mm Wall) */}
        <path
          d="M 80 80 L 720 80 L 720 440 L 80 440 Z"
          fill="none"
          stroke={isOverlay && isRevB ? "#38BDF8" : "#94A3B8"}
          strokeWidth="6"
        />

        {/* Balcony Glazing Sliding Panel */}
        <g stroke="#38BDF8" strokeWidth="2" fill="none">
          <line x1="160" y1="80" x2="340" y2="80" stroke="#38BDF8" strokeWidth="4" />
          <line x1="160" y1="76" x2="250" y2="76" />
          <line x1="240" y1="84" x2="340" y2="84" />
        </g>

        {/* 4. INTERIOR PARTITION WALLS & REVISION CHANGES */}
        {!isRevB ? (
          // ==================== REVISION A (OLD) ====================
          <g>
            {/* Old En-Suite Partition Wall at x=460 */}
            <line x1="460" y1="80" x2="460" y2="280" stroke="#E2E8F0" strokeWidth="4" />
            <line x1="460" y1="280" x2="720" y2="280" stroke="#E2E8F0" strokeWidth="4" />

            {/* Old Standard Swing Door into Bathroom */}
            <g stroke="#E2E8F0" strokeWidth="1.5" fill="none">
              <line x1="460" y1="230" x2="505" y2="230" />
              <path d="M 460 230 A 45 45 0 0 1 505 275" strokeDasharray="2,2" stroke="#64748B" />
              <line x1="460" y1="230" x2="460" y2="275" stroke="#E2E8F0" strokeWidth="2" />
            </g>

            {/* Old Single Vanity Sink */}
            <rect x="490" y="85" width="100" height="40" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" rx="3" />
            <circle cx="540" cy="105" r="12" fill="none" stroke="#94A3B8" strokeWidth="1.5" />

            {/* Old Plumbing Core Riser (Original Position at x=660, y=90) */}
            <rect x="660" y="85" width="45" height="45" fill="#334155" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="660" y1="85" x2="705" y2="130" stroke="#94A3B8" />
            <line x1="705" y1="85" x2="660" y2="130" stroke="#94A3B8" />
            <text x="682" y="145" fontSize="8" fill="#94A3B8" textAnchor="middle" fontFamily="monospace">MEP SHAFT</text>

            {/* Old Compact Wardrobe Depth (1800mm) */}
            <rect x="85" y="320" width="140" height="115" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x="155" y="380" fontSize="10" fill="#94A3B8" textAnchor="middle" fontFamily="sans-serif">WARDROBE (1800)</text>
          </g>
        ) : (
          // ==================== REVISION B (NEW PROPOSED GFC) ====================
          <g>
            {/* New Extended En-Suite Partition Wall shifted for spacious layout */}
            <line
              x1="430"
              y1="80"
              x2="430"
              y2="295"
              stroke={isOverlay ? "#F59E0B" : "#F8FAFC"}
              strokeWidth="4"
            />
            <line
              x1="430"
              y1="295"
              x2="720"
              y2="295"
              stroke={isOverlay ? "#F59E0B" : "#F8FAFC"}
              strokeWidth="4"
            />

            {/* New Modern Pocket Sliding Door */}
            <g stroke={isOverlay ? "#F59E0B" : "#38BDF8"} strokeWidth="2" fill="none">
              <rect x="426" y="225" width="8" height="60" fill="#0F172A" stroke="#38BDF8" />
              <line x1="430" y1="210" x2="430" y2="285" strokeDasharray="3,3" stroke="#F59E0B" />
              <path d="M 438 255 L 448 255 M 445 251 L 449 255 L 445 259" stroke="#F59E0B" strokeWidth="1.5" />
            </g>

            {/* Upgraded Luxury Double Vanity Sinks */}
            <rect x="460" y="85" width="170" height="42" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" rx="3" />
            <ellipse cx="505" cy="106" rx="16" ry="12" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
            <ellipse cx="585" cy="106" rx="16" ry="12" fill="none" stroke="#38BDF8" strokeWidth="1.5" />

            {/* Relocated Plumbing Core Riser (Shifted 450mm South at x=660, y=190) */}
            <g>
              <rect x="660" y="185" width="48" height="48" fill="#1E1B4B" stroke="#EF4444" strokeWidth="2" />
              <line x1="660" y1="185" x2="708" y2="233" stroke="#EF4444" strokeWidth="1.5" />
              <line x1="708" y1="185" x2="660" y2="233" stroke="#EF4444" strokeWidth="1.5" />
              <text x="684" y="246" fontSize="9" fill="#EF4444" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                MEP SHAFT (NEW)
              </text>
            </g>

            {/* Expanded Walk-In Closet / Wardrobe (2400mm depth) */}
            <rect
              x="85"
              y="290"
              width="170"
              height="145"
              fill={isOverlay ? "rgba(245, 158, 11, 0.15)" : "#1E293B"}
              stroke={isOverlay ? "#F59E0B" : "#38BDF8"}
              strokeWidth="2"
            />
            <text x="170" y="370" fontSize="11" fill="#38BDF8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              WALK-IN CLOSET (2400mm)
            </text>

            {/* REDLINE REVISION CLOUD AROUND CHANGES */}
            {showMarkupClouds && (
              <g filter="url(#glowRed)">
                {/* Cloud around relocated plumbing riser */}
                <path
                  d="M 645 175 Q 655 160 675 165 Q 695 160 715 175 Q 730 195 725 215 Q 730 240 715 255 Q 695 265 675 260 Q 650 265 640 245 Q 630 220 635 195 Z"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2.5"
                  strokeDasharray="5,2"
                />
                {/* Revision Cloud Tag */}
                <rect x="650" y="145" width="55" height="18" rx="4" fill="#EF4444" />
                <text x="677" y="157" fontSize="10" fill="#FFFFFF" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Δ R-03
                </text>
              </g>
            )}

            {/* MEP Overlay Visualization if toggled */}
            {showMepOverlay && (
              <g stroke="#10B981" strokeWidth="2" strokeDasharray="3,3">
                <path d="M 684 185 L 684 106 L 585 106" fill="none" />
                <circle cx="585" cy="106" r="4" fill="#10B981" />
                <path d="M 684 185 L 684 106 L 505 106" fill="none" />
                <circle cx="505" cy="106" r="4" fill="#10B981" />
                <text x="610" y="75" fill="#10B981" fontSize="9" fontFamily="monospace">HOT/COLD POTABLE SUPPLY</text>
              </g>
            )}
          </g>
        )}

        {/* Master Bed King Size (Reference) */}
        <g stroke="#64748B" strokeWidth="1.5" fill="#0F172A">
          <rect x="230" y="170" width="160" height="180" rx="6" />
          {/* Pillows */}
          <rect x="245" y="180" width="55" height="35" rx="4" fill="#1E293B" stroke="#475569" />
          <rect x="320" y="180" width="55" height="35" rx="4" fill="#1E293B" stroke="#475569" />
          {/* Duvet fold */}
          <line x1="230" y1="240" x2="390" y2="240" stroke="#475569" strokeDasharray="4,2" />
          <text x="310" y="280" fontSize="11" fill="#94A3B8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            MASTER BEDROOM
          </text>
          <text x="310" y="296" fontSize="9" fill="#64748B" textAnchor="middle" fontFamily="monospace">
            FL: +14.250M LVL
          </text>
        </g>

        {/* 5. DIMENSION LINES & TICK MARKS */}
        {showDimensions && (
          <g stroke="#64748B" strokeWidth="1" fill="#94A3B8" fontSize="9" fontFamily="monospace">
            {/* Horizontal dimension top */}
            <line x1="80" y1="55" x2="720" y2="55" />
            <line x1="80" y1="50" x2="80" y2="60" />
            <line x1="720" y1="50" x2="720" y2="60" />
            <text x="400" y="50" textAnchor="middle">10,800 mm [35&apos;-5&quot;]</text>

            {/* Vertical dimension left */}
            <line x1="60" y1="80" x2="60" y2="440" />
            <line x1="55" y1="80" x2="65" y2="80" />
            <line x1="55" y1="440" x2="65" y2="440" />
            <text x="35" y="260" textAnchor="middle" transform="rotate(-90 35 260)">6,200 mm [20&apos;-4&quot;]</text>
          </g>
        )}
      </svg>
    );
  };

  const handleActionClick = (action: "APPROVE" | "CHANGES" | "REJECT") => {
    setIntendedAction(action);
    if (action === "APPROVE") {
      if (onApprove) onApprove(decisionNotes);
    } else {
      setShowNotesInput(true);
    }
  };

  const handleConfirmWithNotes = () => {
    if (intendedAction === "APPROVE" && onApprove) onApprove(decisionNotes);
    if (intendedAction === "CHANGES" && onRequestChanges) onRequestChanges(decisionNotes);
    if (intendedAction === "REJECT" && onReject) onReject(decisionNotes);
    setShowNotesInput(false);
  };

  return (
    <div
      className={`bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden ${
        isFullscreen ? "fixed inset-2 z-50 rounded-2xl" : "relative w-full"
      } ${className}`}
    >
      {/* ============================================================== */}
      {/* 1. AIRLOCK TOP CONTROL HEADER                                  */}
      {/* ============================================================== */}
      <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                {drawing.drawingCode}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                {drawing.discipline}
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate mt-0.5">
              {drawing.drawingTitle}
            </h3>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode("SLIDER")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === "SLIDER"
                ? "bg-[#3562E8] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Interactive Swipe Curtain"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Swipe Diff</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("SPLIT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === "SPLIT"
                ? "bg-[#3562E8] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Side-by-side Dual Viewport"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Side-by-Side</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("OVERLAY")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === "OVERLAY"
                ? "bg-[#3562E8] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Color-Coded Redline Delta"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overlay Delta</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("NEW_ONLY")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === "NEW_ONLY"
                ? "bg-[#3562E8] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Inspect Proposed Revision B"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rev B Solo</span>
          </button>
        </div>

        {/* Viewport Tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(prev + 0.25, 3))}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.75))}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SECONDARY LAYER TOGGLE STRIP                                */}
      {/* ============================================================== */}
      <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showMarkupClouds}
              onChange={(e) => setShowMarkupClouds(e.target.checked)}
              className="rounded accent-red-500 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Redline Clouds (Δ R-03)</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={(e) => setShowDimensions(e.target.checked)}
              className="rounded accent-blue-500 w-3.5 h-3.5"
            />
            <span>Dimensions & Ticks</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showMepOverlay}
              onChange={(e) => setShowMepOverlay(e.target.checked)}
              className="rounded accent-emerald-500 w-3.5 h-3.5"
            />
            <span>MEP Coordination Layer</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded accent-slate-400 w-3.5 h-3.5"
            />
            <span>Structural Grid</span>
          </label>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-slate-500">Zoom: {Math.round(zoom * 100)}%</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">
            Comparing: <strong className="text-slate-400">{drawing.revisionA.code}</strong> ➔{" "}
            <strong className="text-blue-400">{drawing.revisionB.code}</strong>
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN INTERACTIVE VECTOR CANVAS VIEWPORT                     */}
      {/* ============================================================== */}
      <div
        ref={containerRef}
        onMouseDown={handlePanMouseDown}
        onMouseMove={handlePanMouseMove}
        onMouseUp={handlePanMouseUp}
        className="relative flex-1 min-h-[380px] sm:min-h-[460px] bg-[#070D1F] overflow-hidden cursor-grab active:cursor-grabbing select-none"
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* A. SWIPE SLIDER MODE */}
          {mode === "SLIDER" && (
            <div className="relative w-[800px] h-[500px] max-w-full shadow-2xl rounded-xl overflow-hidden border border-slate-800">
              {/* Underlayer: Revision A (Previous Approved) */}
              <div className="absolute inset-0">
                {renderVectorBlueprint(false)}
                <div className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-[11px] font-mono text-slate-300 font-bold">
                  {drawing.revisionA.code} • {drawing.revisionA.label}
                </div>
              </div>

              {/* Overlayer: Revision B (Masked by slider position) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
                }}
              >
                {renderVectorBlueprint(true)}
                <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-md bg-blue-950/90 border border-blue-500/80 text-[11px] font-mono text-blue-300 font-bold shadow-lg">
                  {drawing.revisionB.code} • {drawing.revisionB.label}
                </div>
              </div>

              {/* Vertical Draggable Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-30 shadow-[0_0_12px_rgba(59,130,246,0.8)] cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleSliderMouseDown}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                  <Sliders className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>
            </div>
          )}

          {/* B. SPLIT-SCREEN SIDE-BY-SIDE MODE */}
          {mode === "SPLIT" && (
            <div className="flex items-center gap-4 w-[1100px] max-w-full p-2">
              <div className="flex-1 relative aspect-[16/10] bg-[#0A1128] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="absolute top-3 left-3 z-10 px-2 py-0.5 bg-slate-900/90 border border-slate-700 rounded text-[10px] font-mono text-slate-300">
                  {drawing.revisionA.code} (Previous Approved)
                </div>
                {renderVectorBlueprint(false)}
              </div>
              <div className="flex-1 relative aspect-[16/10] bg-[#0A1128] rounded-xl border border-blue-600/60 overflow-hidden shadow-xl">
                <div className="absolute top-3 left-3 z-10 px-2 py-0.5 bg-blue-950/90 border border-blue-500 rounded text-[10px] font-mono text-blue-300 font-bold">
                  {drawing.revisionB.code} (Current Proposed Revision)
                </div>
                {renderVectorBlueprint(true)}
              </div>
            </div>
          )}

          {/* C. OVERLAY REDLINE DELTA MODE */}
          {mode === "OVERLAY" && (
            <div className="relative w-[800px] h-[500px] max-w-full shadow-2xl rounded-xl overflow-hidden border border-blue-900/50">
              <div className="absolute inset-0 opacity-40">
                {renderVectorBlueprint(false, false)}
              </div>
              <div className="absolute inset-0">
                {renderVectorBlueprint(true, true)}
              </div>
              <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-slate-950/90 border border-amber-500/60 rounded-lg text-xs font-mono text-amber-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Delta Diff: Yellow & Red highlights indicate geometry shift</span>
              </div>
            </div>
          )}

          {/* D. NEW REVISION SOLO MODE */}
          {mode === "NEW_ONLY" && (
            <div className="relative w-[800px] h-[500px] max-w-full shadow-2xl rounded-xl overflow-hidden border border-blue-600">
              {renderVectorBlueprint(true)}
              <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-blue-950/90 border border-blue-500 rounded-lg text-xs font-mono text-blue-200 font-bold">
                {drawing.revisionB.code} • {drawing.revisionB.label}
              </div>
            </div>
          )}
        </div>

        {/* Ambient bottom HUD instructions */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none text-[11px] text-slate-500 font-mono bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
          Click & drag to pan • Scroll/zoom tools above • Drag slider to compare
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. REVISION METADATA & REASONING SUMMARY                       */}
      {/* ============================================================== */}
      <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 space-y-3 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SUBMITTED REVISION NARRATIVE & SITE REASONING
            </span>
            <p className="text-slate-200 leading-relaxed font-normal">
              {drawing.revisionB.changeSummary}
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 shrink-0 font-mono">
            <div>
              <span className="text-slate-500">Author:</span>{" "}
              <strong className="text-slate-200">{drawing.revisionB.author}</strong>
            </div>
            <div>
              <span className="text-slate-500">Submitted:</span>{" "}
              <span className="text-slate-300">{drawing.revisionB.date}</span>
            </div>
          </div>
        </div>

        {/* Optional Decision Feedback Input Modal/Drawer Expansion */}
        {showNotesInput && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 animate-in fade-in duration-150">
            <label className="text-xs font-semibold text-slate-300 block">
              {intendedAction === "APPROVE"
                ? "Approval Seal Endorsement / Construction Directives"
                : intendedAction === "CHANGES"
                ? "Required Redline Corrections (Transmitted directly to architect)"
                : "Rejection Reason & Previous Revision Reversion Note"}
            </label>
            <textarea
              rows={2}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Enter architectural directives, contractor notes, or structural clearance references..."
              className="w-full p-2 text-xs text-slate-100 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNotesInput(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWithNotes}
                disabled={isSubmitting}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                  intendedAction === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : intendedAction === "CHANGES"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                Confirm {intendedAction}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. 1-CLICK EXECUTIVE ACTION BAR                                */}
        {/* ============================================================== */}
        {!showNotesInput && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Studio Cryptographic Drawing Seal & Audit Trace Active</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleActionClick("REJECT")}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition cursor-pointer"
              >
                Reject Revision
              </button>

              <button
                type="button"
                onClick={() => handleActionClick("CHANGES")}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 rounded-xl transition cursor-pointer"
              >
                Request Redlines
              </button>

              <button
                type="button"
                onClick={() => handleActionClick("APPROVE")}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#3562E8] hover:bg-blue-500 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Approve & Stamp GFC</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
