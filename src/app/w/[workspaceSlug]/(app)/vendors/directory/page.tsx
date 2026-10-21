"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Briefcase,
  Search,
  Filter,
  Phone,
  Mail,
  Globe,
  Building,
  User,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default function EmployeeVendorDirectoryPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [contactFilter, setContactFilter] = useState<string>("ALL");
  const [vendorSortBy, setVendorSortBy] = useState<string>("NEWEST");

  const fetchDirectory = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(industryFilter ? { industryType: industryFilter } : {}),
      });

      const res = await fetch(`/api/vendors/directory?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load directory");

      setVendors(data.vendors || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [workspaceSlug, industryFilter]);

  const filteredVendors = React.useMemo(() => {
    let list = vendors.filter((v) => {
      if (contactFilter === "HAS_PHONE") {
        if (!v.phoneNumber || v.phoneNumber.trim() === "") return false;
      } else if (contactFilter === "HAS_WEBSITE") {
        if (!v.websiteUrl || v.websiteUrl.trim() === "") return false;
      } else if (contactFilter === "HAS_EMAIL") {
        if (!v.email || v.email.trim() === "") return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      switch (vendorSortBy) {
        case "COMPANY_ASC":
          return (a.companyName || a.name || "").localeCompare(b.companyName || b.name || "");
        case "NAME_ASC":
          return (a.name || "").localeCompare(b.name || "");
        case "NEWEST":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  }, [vendors, contactFilter, vendorSortBy]);

  const isFiltered = industryFilter !== "" || contactFilter !== "ALL" || searchQuery.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <span>Staff Portal</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Studio Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">Approved Vendor Contacts</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Verified suppliers, subcontractors, and material representatives for architectural procurement
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F4FF] rounded-xl border border-[#CEDEFF] text-[11px] font-semibold text-[#2C308D]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5A81FA]" />
          <span>Staff Business Contacts Directory</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#696E82]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchDirectory()}
              placeholder="Search by company, contact person, or material category..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA] text-[#1F1F1F]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              aria-label="Filter by industry category"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Categories</option>
              <option value="Marble & Granite">Marble & Granite</option>
              <option value="Carpentry & Joinery">Carpentry & Joinery</option>
              <option value="Glass & Aluminium">Glass & Aluminium</option>
              <option value="Architectural Lighting">Architectural Lighting</option>
              <option value="HVAC & Automation">HVAC & Automation</option>
              <option value="Sanitaryware & Tiles">Sanitaryware & Tiles</option>
            </select>

            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              aria-label="Filter by contact channel"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="ALL">All Contacts</option>
              <option value="HAS_PHONE">Has Phone</option>
              <option value="HAS_WEBSITE">Has Website</option>
              <option value="HAS_EMAIL">Has Email</option>
            </select>

            <select
              value={vendorSortBy}
              onChange={(e) => setVendorSortBy(e.target.value)}
              aria-label="Sort vendors by"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-semibold focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="NEWEST">Date Added (Newest)</option>
              <option value="COMPANY_ASC">Company Name (A → Z)</option>
              <option value="NAME_ASC">Contact Name (A → Z)</option>
            </select>

            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setIndustryFilter("");
                  setContactFilter("ALL");
                  setVendorSortBy("NEWEST");
                  setSearchQuery("");
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {isFiltered && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E2E6F0] text-xs">
            <span className="text-[#696E82] text-[11px] font-medium mr-1">Active:</span>
            {industryFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2F4FF] text-[#2C308D] border border-[#CEDEFF] text-[11px] font-semibold">
                Category: {industryFilter}
              </span>
            )}
            {contactFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
                Channel: {contactFilter.replace("HAS_", "")}
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold">
                "{searchQuery}"
              </span>
            )}
            <span className="ml-auto text-[#696E82] text-[11px]">
              Showing <strong>{filteredVendors.length}</strong> of {vendors.length}
            </span>
          </div>
        )}
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
          Loading approved vendor directory...
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="p-16 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
          No approved vendor contacts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs hover:border-[#5A81FA]/40 transition-all space-y-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[#1F1F1F] text-sm">{v.companyName || v.name}</h3>
                  <div className="text-[11px] text-[#696E82] flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-[#1F1F1F]">{v.name}</span>
                    {v.designation && <span>({v.designation})</span>}
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {v.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#F2F4FF] text-[#2C308D]">
                  {v.industryType || "General"}
                </span>
                {(v.visitHistoryJson?.formFilledAt || v.createdAt) && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>
                      Form Filled:{" "}
                      {v.visitHistoryJson?.formFilledAt ||
                        new Date(v.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                    </span>
                  </span>
                )}
              </div>

              {/* Public-to-staff business contact channels */}
              <div className="space-y-1.5 text-[11px] text-[#696E82] pt-2 border-t border-[#E2E6F0]">
                {v.phoneNumber && (
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <a href={`tel:${v.phoneNumber}`} className="text-[#1F1F1F] hover:text-[#5A81FA]">
                      {v.phoneNumber}
                    </a>
                  </div>
                )}
                {v.email && (
                  <div className="flex items-center gap-2 font-mono">
                    <Mail className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <a href={`mailto:${v.email}`} className="text-[#1F1F1F] hover:text-[#5A81FA] truncate">
                      {v.email}
                    </a>
                  </div>
                )}
                {v.websiteUrl && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <a
                      href={v.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#5A81FA] hover:underline truncate"
                    >
                      {v.websiteUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
