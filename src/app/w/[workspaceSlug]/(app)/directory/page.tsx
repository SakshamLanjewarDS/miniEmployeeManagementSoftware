import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { Building, Phone, Mail, MapPin, Wrench, Briefcase } from "lucide-react";

interface DirectoryPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function DirectoryPage({ params }: DirectoryPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const [clients, consultants, contractors] = await Promise.all([
    prisma.client.findMany({ where: { tenantId: ctx.tenantId }, include: { projects: true } }),
    prisma.consultant.findMany({ where: { tenantId: ctx.tenantId } }),
    prisma.contractor.findMany({ where: { tenantId: ctx.tenantId } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E2E6F0] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
          <span>Studio Network & External Parties</span>
          <span>•</span>
          <span>Contact Records</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F] mt-1">Clients, Consultants & Contractors</h1>
        <p className="text-xs text-[#696E82] mt-0.5">
          External parties are contact records, not user accounts. Associated with projects via scopes and quotations.
        </p>
      </div>

      {/* 1. Clients */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-2">
          <Building className="w-4 h-4 text-[#5A81FA]" />
          <span>Clients ({clients.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">{c.name}</h3>
                  <div className="text-xs text-[#5A81FA] font-medium">{c.company || "Private Individual"}</div>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Active</span>
              </div>
              <p className="text-xs text-[#696E82]">{c.notes}</p>
              <div className="pt-2 border-t border-[#E2E6F0] grid grid-cols-2 gap-2 text-[11px] text-[#696E82]">
                <div>Email: {c.email || "N/A"}</div>
                <div>Phone: {c.contact || "N/A"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Consultants */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#5A81FA]" />
          <span>Engineering & Specialist Consultants ({consultants.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consultants.map((con) => (
            <div key={con.id} className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">{con.name}</h3>
                  <div className="text-xs text-[#696E82]">{con.firmName}</div>
                </div>
                <span className="text-[10px] font-semibold bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] px-2 py-0.5 rounded">
                  {con.discipline}
                </span>
              </div>
              <p className="text-xs text-[#696E82]">{con.notes}</p>
              <div className="pt-2 border-t border-[#E2E6F0] text-[11px] text-[#696E82]">
                Contact: {con.contact} • {con.email}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Contractors */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#5A81FA]" />
          <span>Trade Contractors ({contractors.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contractors.map((cont) => (
            <div key={cont.id} className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">{cont.firmName}</h3>
                  <div className="text-xs text-[#696E82]">Contact: {cont.name}</div>
                </div>
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                  {cont.trade}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E2E6F0] text-[11px] text-[#696E82]">
                Phone: {cont.contact} • Address: {cont.address}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
