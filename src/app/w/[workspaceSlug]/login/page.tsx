"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

export default function WorkspaceLoginPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is100Design = workspaceSlug === "100percentdesign";
  const studioName = is100Design ? "100% DESIGN Studio" : "Apex Architecture Studio";

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
        // Use full navigation to ensure session cookies and tenant context load seamlessly
        window.location.href = data.redirectUrl || `/w/${workspaceSlug}/tasks`;
      }
    } catch {
      setError("Network or server connection failed. The server may be waking up from cold start; please retry in a few seconds.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (empId: string, pwd: string) => {
    setIdentifier(empId);
    setPassword(pwd);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col justify-center items-center p-4 selection:bg-[#5A81FA] selection:text-white">
      {/* Brand Header */}
      <div className="w-full max-w-md mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-lg mb-3 border border-amber-400/30 bg-[#0B122B] p-1">
          <Image
            src="/icons/icon-192.png"
            alt="100% DESIGN Studio Logo"
            width={64}
            height={64}
            className="w-full h-full object-cover rounded-xl"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F]">{studioName}</h1>
        <p className="text-sm text-[#696E82] mt-1">
          Workspace:{" "}
          <span className="font-mono bg-[#CEDEFF] px-2 py-0.5 rounded text-xs text-[#2C308D] font-semibold border border-[#A8B1CE]/40">
            {workspaceSlug}
          </span>
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-[#E2E6F0] rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#1F1F1F]">Sign in to your account</h2>
          <p className="text-xs text-[#696E82] mt-0.5">
            Enter your assigned Employee ID or registered email to sign in
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#696E82] mb-1.5">
              Employee ID or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#696E82]">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                autoFocus
                suppressHydrationWarning
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. EMP-001 or designsaksham1@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] placeholder:text-[#A8B1CE] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#696E82] mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#696E82]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] placeholder:text-[#A8B1CE] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className="w-full mt-2 py-2.5 px-4 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-medium text-sm rounded-xl shadow-md shadow-[#5A81FA]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Studio OS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Credentials Autofill */}
          <div className="pt-2">
            <div className="text-[11px] font-medium text-[#696E82] mb-1.5 flex items-center justify-between">
              <span>Quick Demo Credentials:</span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                1-Click Autofill
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo("EMP-001", "Password@123")}
                className="p-2 rounded-lg bg-[#F2F4FF] hover:bg-[#E5E9FF] text-[#2C308D] text-left text-xs transition-colors border border-[#CEDEFF] cursor-pointer"
              >
                <div className="font-bold text-[11px]">Principal Admin</div>
                <div className="font-mono text-[10px] text-[#696E82]">EMP-001 • Tap to fill</div>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("EMP-002", "Password@123")}
                className="p-2 rounded-lg bg-[#F8F9FD] hover:bg-[#EBEFF8] text-[#1F1F1F] text-left text-xs transition-colors border border-[#E2E6F0] cursor-pointer"
              >
                <div className="font-bold text-[11px]">Project Manager</div>
                <div className="font-mono text-[10px] text-[#696E82]">EMP-002 • Tap to fill</div>
              </button>
            </div>
          </div>
        </form>

        {/* Switch tenant link */}
        <div className="mt-8 pt-5 border-t border-[#E2E6F0] flex justify-between items-center text-xs text-[#696E82]">
          <span>Need alternate practice?</span>
          {is100Design ? (
            <a
              href="/w/apex-studio/login"
              className="text-[#5A81FA] hover:underline font-semibold flex items-center gap-1"
            >
              <span>Apex Architecture Studio</span>
              <span>→</span>
            </a>
          ) : (
            <a
              href="/w/100percentdesign/login"
              className="text-[#5A81FA] hover:underline font-semibold flex items-center gap-1"
            >
              <span>100% DESIGN Studio</span>
              <span>→</span>
            </a>
          )}
        </div>
      </div>

      <div className="w-full max-w-md mt-3">
        <PwaInstallButton />
      </div>

      <div className="mt-4 text-center text-xs text-[#696E82] flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#5A81FA]" />
        <span>Enterprise Encrypted • Revocable Server Sessions • Asia/Kolkata</span>
      </div>
    </div>
  );
}
