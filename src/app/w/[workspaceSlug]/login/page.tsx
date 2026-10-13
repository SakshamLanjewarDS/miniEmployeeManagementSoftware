"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Compass,
  Layers,
  MapPin,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

export default function WorkspaceLoginPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studioName = "100% DESIGN Studio";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed. Check your Employee ID and password.");
      } else {
        // Safe deep link check: preserve authorized deep links and reject unsafe redirect destinations
        const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const requestedNext = urlParams?.get("next") || urlParams?.get("redirect");

        let destination = data.redirectUrl || `/w/${workspaceSlug}/dashboard`;
        if (
          requestedNext &&
          requestedNext.startsWith(`/w/${workspaceSlug}`) &&
          !requestedNext.startsWith("//") &&
          !requestedNext.includes("://")
        ) {
          destination = requestedNext;
        }

        // Use full navigation to ensure session cookies and tenant context load seamlessly
        window.location.href = destination;
      }
    } catch {
      setError("Network or server connection failed. The server may be waking up from cold start; please retry in a few seconds.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#F8F9FD] text-[#1F1F1F] flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 overflow-x-hidden selection:bg-[#3562E8] selection:text-white">
      {/* =========================================================================
          1. 3D SCULPTURAL BACKGROUND SCENE (SOFT LIGHTING & GLASS REFRACTIONS)
          ========================================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0" aria-hidden="true">
        {/* Soft Ambient Radiance / Lighting Glows */}
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[#CEDEFF]/40 via-[#F2F4FF]/30 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute top-[35%] -left-[10%] w-[500px] h-[500px] bg-[#E2E8F0]/35 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[650px] h-[500px] bg-[#CEDEFF]/35 rounded-full blur-3xl opacity-70" />

        {/* Large Transparent Ring / Circular Glass Torus behind upper composition */}
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[540px] h-[540px] sm:w-[680px] sm:h-[680px] lg:w-[760px] lg:h-[760px] rounded-full border-[2px] border-white/70 shadow-[0_30px_90px_rgba(44,48,141,0.06),inset_0_1px_25px_rgba(255,255,255,0.7)] bg-gradient-to-tr from-white/20 via-transparent to-white/35 backdrop-blur-[2px] opacity-90" />
        <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[420px] h-[420px] sm:w-[540px] sm:h-[540px] lg:w-[600px] lg:h-[600px] rounded-full border border-white/50 opacity-50" />

        {/* Sculptural Sphere 1 (Bottom Left, Smooth Glass Shader with Contact Shadow) */}
        <div className="absolute bottom-[2%] left-[4%] sm:left-[8%] lg:left-[12%] w-[110px] h-[110px] sm:w-[150px] sm:h-[150px] rounded-full bg-gradient-to-br from-white/95 via-[#E6EDFA]/85 to-[#CBD7F2]/80 border border-white/80 shadow-[0_24px_45px_-12px_rgba(44,48,141,0.18),inset_-6px_-6px_16px_rgba(168,177,206,0.35),inset_6px_6px_14px_rgba(255,255,255,0.9)] opacity-95" />
        {/* Sphere 1 Contact Shadow */}
        <div className="absolute bottom-[0.5%] left-[3%] sm:left-[7%] lg:left-[11%] w-[130px] h-[35px] sm:w-[170px] sm:h-[40px] rounded-full bg-[#111B35]/[0.06] blur-md" />

        {/* Sculptural Sphere 2 (Bottom Right Foreground Glass Orb) */}
        <div className="absolute bottom-[6%] right-[5%] sm:right-[9%] lg:right-[14%] w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] rounded-full bg-gradient-to-br from-white/90 via-[#EDF2FC]/75 to-[#D3E0FA]/70 border border-white/90 shadow-[0_20px_40px_-10px_rgba(44,48,141,0.16),inset_-4px_-4px_12px_rgba(168,177,206,0.3),inset_5px_5px_12px_rgba(255,255,255,0.95)] opacity-90" />
        {/* Sphere 2 Contact Shadow */}
        <div className="absolute bottom-[5%] right-[4%] sm:right-[8%] lg:right-[13%] w-[100px] h-[28px] sm:w-[130px] sm:h-[32px] rounded-full bg-[#111B35]/[0.05] blur-sm" />

        {/* Subtle Architectural Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#A8B1CE_1px,transparent_1px)] [background-size:32px_32px] opacity-25" />
      </div>

      {/* =========================================================================
          2. ASYMMETRIC TWO-COLUMN COMPOSITION (DESKTOP ~1080px-1160px)
          ========================================================================= */}
      <div className="relative z-10 w-full max-w-[1120px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* -----------------------------------------------------------------------
            LEFT COLUMN (Col 1-6 or 1-7): LOGIN CARD + LOWER BRAND CARD
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-5 sm:gap-6">
          {/* A. TRANSLUCENT LOGIN CARD */}
          <div className="relative w-full rounded-[32px] sm:rounded-[36px] bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_-15px_rgba(44,48,141,0.1),0_0_0_1px_rgba(255,255,255,0.8)_inset] p-7 sm:p-9 lg:p-10 transition-all duration-300">
            {/* Top Light-Catching Edge Highlight */}
            <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

            {/* Studio Identity Header */}
            <div className="flex items-center gap-3.5 mb-6 sm:mb-8">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden p-1 bg-[#0B122B] border border-white/60 shadow-[0_8px_20px_rgba(11,18,43,0.18)] shrink-0 flex items-center justify-center">
                <Image
                  src="/icons/icon-192.png"
                  alt="100% DESIGN Studio Logo"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover rounded-xl"
                  priority
                />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#F2F4FF] text-[#3562E8] border border-[#CEDEFF] mb-1">
                  <Sparkles className="w-3 h-3 text-[#3562E8]" />
                  Enterprise Workstation
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1F1F] truncate">
                  {studioName}
                </h1>
              </div>
            </div>

            {/* Greeting & Headline */}
            <div className="mb-6 sm:mb-7">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F1F1F]">
                Log in
              </h2>
              <p className="text-xs sm:text-sm text-[#4B5565] mt-1.5 font-medium leading-relaxed">
                Enter your assigned Employee ID or registered email to access your workspace.
              </p>
            </div>

            {/* Error Banner with Graceful Non-Jumping Layout */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 p-3.5 sm:p-4 bg-red-50/90 border border-red-200 text-red-900 rounded-2xl text-xs flex items-start gap-3 shadow-xs animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5" suppressHydrationWarning>
              {/* Field 1: Employee ID or Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-identifier"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5565] pl-1"
                >
                  Employee ID or Email
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#505869] group-focus-within:text-[#3562E8] transition-colors">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    suppressHydrationWarning
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. EMP-001 or designsaksham1@gmail.com"
                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base bg-white/80 hover:bg-white focus:bg-white border border-[#E2E6F0] focus:border-[#3562E8] rounded-full text-[#1F1F1F] placeholder:text-[#A8B1CE] focus:outline-none focus:ring-4 focus:ring-[#3562E8]/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Password with Show/Hide Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5565]"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-[#505869] font-medium hidden sm:inline">
                    Protected with JWT Session
                  </span>
                </div>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#505869] group-focus-within:text-[#3562E8] transition-colors">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    suppressHydrationWarning
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-12 py-3 sm:py-3.5 text-sm sm:text-base bg-white/80 hover:bg-white focus:bg-white border border-[#E2E6F0] focus:border-[#3562E8] rounded-full text-[#1F1F1F] placeholder:text-[#A8B1CE] focus:outline-none focus:ring-4 focus:ring-[#3562E8]/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#505869] hover:text-[#1F1F1F] focus:outline-none cursor-pointer transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-[#4B5565]" />
                    ) : (
                      <Eye className="w-4 h-4 text-[#4B5565]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button (Pill with Embedded Circular Arrow Motif) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  suppressHydrationWarning
                  className="w-full h-[52px] sm:h-[54px] px-6 rounded-full bg-gradient-to-r from-[#3562E8] via-[#416DE8] to-[#5A81FA] hover:from-[#264FCB] hover:to-[#426EE8] active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-[0_12px_28px_-6px_rgba(53,98,232,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(53,98,232,0.48)] border border-white/20 transition-all flex items-center justify-between cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <span className="font-semibold tracking-wide pl-2">
                    {loading ? "Authenticating..." : "Sign In to Studio OS"}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-white text-[#3562E8] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:translate-x-0.5">
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-[#3562E8] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-[#3562E8]" />
                    )}
                  </div>
                </button>
              </div>
            </form>

            {/* Security Assurance Footer */}
            <div className="mt-6 pt-5 border-t border-[#E2E6F0]/80 flex items-center justify-between text-[11px] text-[#505869] flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3562E8]" />
                <span className="font-medium">Tenant Isolated • 256-bit AES</span>
              </div>
              <span className="text-[10px] text-[#696E82]">Asia/Kolkata (IST)</span>
            </div>
          </div>

          {/* B. LOWER BRAND CARD (DARK SURFACE COMPONENT) */}
          <div className="relative w-full rounded-[28px] sm:rounded-[32px] bg-[#0B122B] text-white border border-white/10 shadow-[0_18px_40px_-12px_rgba(11,18,43,0.35)] p-6 sm:p-7 overflow-hidden">
            {/* Subtle Gradient Glass Sheen */}
            <div className="absolute top-0 right-0 w-[240px] h-[160px] bg-gradient-to-bl from-[#3562E8]/25 via-[#2C308D]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                    <Compass className="w-4 h-4 text-[#CEDEFF]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#CEDEFF]">
                    Studio Blueprint OS
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-white/80 border border-white/10">
                  v3.1.0
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  100% DESIGN STUDIO
                </h3>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Unified architectural workstation integrating drawing revision ledgers, Four-Eyes quality gates, and field GPS verification.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  <Layers className="w-3 h-3 text-[#5A81FA]" />
                  CAD Revision $R_0 \to R_n$
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  Haversine Geofence
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            RIGHT COLUMN (Col 7-12): TALL FROSTED FEATURE PANEL
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between">
          <div className="relative h-full w-full rounded-[32px] sm:rounded-[40px] bg-white/55 backdrop-blur-2xl border border-white/90 shadow-[0_25px_60px_-20px_rgba(44,48,141,0.12),0_0_0_1px_rgba(255,255,255,0.7)_inset] p-7 sm:p-9 lg:p-10 flex flex-col justify-between overflow-hidden min-h-[580px] lg:min-h-full">
            {/* Top Light-Catching Edge Highlight */}
            <div className="absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

            {/* Internal 3D Minimal Geometric Sculptural Form (Architectural Glass Arch / Circle) */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full bg-gradient-to-br from-[#CEDEFF]/50 via-[#5A81FA]/20 to-transparent border-[2.5px] border-white/80 shadow-[inset_0_0_40px_rgba(255,255,255,0.8),0_20px_50px_rgba(53,98,232,0.1)] blur-[0.5px]" />
            <div className="pointer-events-none absolute top-12 right-12 w-[220px] h-[220px] rounded-full border border-white/60 opacity-60" />

            {/* Panel Top Content */}
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/80 text-[#2C308D] border border-white shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#3562E8] animate-pulse" />
                  Studio Operational Architecture
                </span>
                <span className="text-[11px] font-medium text-[#505869] hidden sm:inline">
                  Architectural Practice Standard
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight text-[#1F1F1F] leading-tight">
                  Precision in Every Line. <br />
                  <span className="text-[#3562E8]">Governance on Every Site.</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5565] leading-relaxed max-w-md pt-1">
                  Engineered specifically for architectural practices, structural engineers, and interior design studios demanding immutable records and field integrity.
                </p>
              </div>

              {/* Architectural Feature Cards (Layered Translucent Surfaces) */}
              <div className="space-y-3 pt-3">
                <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-[0_8px_20px_-6px_rgba(44,48,141,0.06)] flex items-start gap-3.5 transition-all hover:bg-white">
                  <div className="w-9 h-9 rounded-xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#3562E8] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-[#3562E8]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1F1F1F]">
                      Governed Deliverable Lifecycles
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#505869] mt-0.5 leading-relaxed">
                      8-stage task progression with configurable employee self-completion access and automated checklist dependency checks.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-[0_8px_20px_-6px_rgba(44,48,141,0.06)] flex items-start gap-3.5 transition-all hover:bg-white">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1F1F1F]">
                      Four-Eyes Quality Assurance Gates
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#505869] mt-0.5 leading-relaxed">
                      Submitters cannot self-approve drawings, scopes, or official employment records. Reviewer $\neq$ Submitter.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-[0_8px_20px_-6px_rgba(44,48,141,0.06)] flex items-start gap-3.5 transition-all hover:bg-white">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1F1F1F]">
                      Field Geolocation & Snag Registers
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#505869] mt-0.5 leading-relaxed">
                      Tamper-evident Haversine radius evaluation with hands-free voice observation dictation and print-ready audit transmittals.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Bottom: Dedicated PWA Install Dock */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/80">
              <PwaInstallButton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
