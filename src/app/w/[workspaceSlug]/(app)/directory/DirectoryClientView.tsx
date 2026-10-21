"use client";

import React, { useState, useMemo } from "react";
import {
  Building,
  Briefcase,
  Wrench,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Copy,
  Check,
  ExternalLink,
  Users,
} from "lucide-react";

export interface DirectoryClientViewProps {
  initialClients: Array<{
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    contact: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
    createdAt?: string | Date;
    projects?: Array<{ id: string; code: string; name: string }>;
  }>;
  initialConsultants: Array<{
    id: string;
    name: string;
    email: string | null;
    contact: string | null;
    firmName: string | null;
    firmAddress: string | null;
    discipline: string;
    notes: string | null;
    isActive: boolean;
    createdAt?: string | Date;
  }>;
  initialContractors: Array<{
    id: string;
    name: string;
    contact: string | null;
    email: string | null;
    firmName: string | null;
    trade: string;
    address: string | null;
    isActive: boolean;
    createdAt?: string | Date;
  }>;
  workspaceSlug: string;
}

type CategoryTab = "ALL" | "CLIENT" | "CONSULTANT" | "CONTRACTOR";

export default function DirectoryClientView({
  initialClients,
  initialConsultants,
  initialContractors,
  workspaceSlug,
}: DirectoryClientViewProps) {
  const [activeTab, setActiveTab] = useState<CategoryTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDisciplineTrade, setSelectedDisciplineTrade] = useState("ALL");
  const [clientTypeFilter, setClientTypeFilter] = useState<"ALL" | "CORPORATE" | "INDIVIDUAL">("ALL");
  const [contactChannelFilter, setContactChannelFilter] = useState<"ALL" | "HAS_PHONE" | "HAS_EMAIL">("ALL");
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "NAME_DESC" | "COMPANY_ASC" | "NEWEST">("NAME_ASC");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique disciplines and trades for dropdown
  const allDisciplinesAndTrades = useMemo(() => {
    const set = new Set<string>();
    initialConsultants.forEach((c) => c.discipline && set.add(c.discipline));
    initialContractors.forEach((c) => c.trade && set.add(c.trade));
    return Array.from(set).sort();
  }, [initialConsultants, initialContractors]);

  // Copy helper
  const handleCopyContact = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    if (activeTab === "CONSULTANT" || activeTab === "CONTRACTOR") return [];
    return initialClients.filter((c) => {
      // Client type filter
      if (clientTypeFilter === "CORPORATE" && (!c.company || c.company.trim() === "")) return false;
      if (clientTypeFilter === "INDIVIDUAL" && c.company && c.company.trim() !== "") return false;

      // Contact channel filter
      if (contactChannelFilter === "HAS_PHONE" && !c.contact) return false;
      if (contactChannelFilter === "HAS_EMAIL" && !c.email) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesCompany = c.company?.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        const matchesContact = c.contact?.toLowerCase().includes(q);
        const matchesNotes = c.notes?.toLowerCase().includes(q);
        const matchesProjects = c.projects?.some((p) =>
          p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesCompany && !matchesEmail && !matchesContact && !matchesNotes && !matchesProjects) {
          return false;
        }
      }

      // If user selected a specific trade/discipline, clients don't have trades
      if (selectedDisciplineTrade !== "ALL") return false;

      return true;
    });
  }, [initialClients, activeTab, clientTypeFilter, contactChannelFilter, searchQuery, selectedDisciplineTrade]);

  // Filter consultants
  const filteredConsultants = useMemo(() => {
    if (activeTab === "CLIENT" || activeTab === "CONTRACTOR") return [];
    return initialConsultants.filter((con) => {
      // Discipline filter
      if (selectedDisciplineTrade !== "ALL" && con.discipline !== selectedDisciplineTrade) {
        return false;
      }

      // Contact channel filter
      if (contactChannelFilter === "HAS_PHONE" && !con.contact) return false;
      if (contactChannelFilter === "HAS_EMAIL" && !con.email) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = con.name?.toLowerCase().includes(q);
        const matchesFirm = con.firmName?.toLowerCase().includes(q);
        const matchesEmail = con.email?.toLowerCase().includes(q);
        const matchesContact = con.contact?.toLowerCase().includes(q);
        const matchesDiscipline = con.discipline?.toLowerCase().includes(q);
        const matchesNotes = con.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesFirm && !matchesEmail && !matchesContact && !matchesDiscipline && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [initialConsultants, activeTab, selectedDisciplineTrade, contactChannelFilter, searchQuery]);

  // Filter contractors
  const filteredContractors = useMemo(() => {
    if (activeTab === "CLIENT" || activeTab === "CONSULTANT") return [];
    return initialContractors.filter((cont) => {
      // Trade filter
      if (selectedDisciplineTrade !== "ALL" && cont.trade !== selectedDisciplineTrade) {
        return false;
      }

      // Contact channel filter
      if (contactChannelFilter === "HAS_PHONE" && !cont.contact) return false;
      if (contactChannelFilter === "HAS_EMAIL" && !cont.email) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = cont.name?.toLowerCase().includes(q);
        const matchesFirm = cont.firmName?.toLowerCase().includes(q);
        const matchesEmail = cont.email?.toLowerCase().includes(q);
        const matchesContact = cont.contact?.toLowerCase().includes(q);
        const matchesTrade = cont.trade?.toLowerCase().includes(q);
        const matchesAddress = cont.address?.toLowerCase().includes(q);
        if (!matchesName && !matchesFirm && !matchesEmail && !matchesContact && !matchesTrade && !matchesAddress) {
          return false;
        }
      }

      return true;
    });
  }, [initialContractors, activeTab, selectedDisciplineTrade, contactChannelFilter, searchQuery]);

  // Combined sort helper
  const sortEntities = <T extends { name: string; company?: string | null; firmName?: string | null; createdAt?: any }>(
    list: T[]
  ): T[] => {
    return [...list].sort((a, b) => {
      if (sortBy === "NAME_ASC") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "NAME_DESC") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "COMPANY_ASC") {
        const compA = a.company || a.firmName || a.name || "";
        const compB = b.company || b.firmName || b.name || "";
        return compA.localeCompare(compB);
      }
      if (sortBy === "NEWEST") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });
  };

  const sortedClients = useMemo(() => sortEntities(filteredClients), [filteredClients, sortBy]);
  const sortedConsultants = useMemo(() => sortEntities(filteredConsultants), [filteredConsultants, sortBy]);
  const sortedContractors = useMemo(() => sortEntities(filteredContractors), [filteredContractors, sortBy]);

  const totalMatches = sortedClients.length + sortedConsultants.length + sortedContractors.length;
  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedDisciplineTrade !== "ALL" ||
    clientTypeFilter !== "ALL" ||
    contactChannelFilter !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDisciplineTrade("ALL");
    setClientTypeFilter("ALL");
    setContactChannelFilter("ALL");
    setSortBy("NAME_ASC");
  };

  return (
    <div className="space-y-6">
      {/* Advance Filtering Panel */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Top Row: Search Box & Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, firm, discipline, trade, email, phone, or project..."
              className="w-full pl-10 pr-9 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F] p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#696E82]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5A81FA]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort Directory by"
                className="bg-transparent border-none text-[#1F1F1F] font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="NAME_ASC">Name (A → Z)</option>
                <option value="NAME_DESC">Name (Z → A)</option>
                <option value="COMPANY_ASC">Company / Firm (A → Z)</option>
                <option value="NEWEST">Date Added (Newest)</option>
              </select>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters Group */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E6F0]">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Discipline / Trade Filter */}
            <select
              value={selectedDisciplineTrade}
              onChange={(e) => setSelectedDisciplineTrade(e.target.value)}
              aria-label="Filter by Trade or Discipline"
              className="px-2.5 py-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium text-xs focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="ALL">All Trades & Disciplines</option>
              {allDisciplinesAndTrades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {/* Client Type Filter */}
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value as any)}
              aria-label="Filter Client Entity Type"
              className="px-2.5 py-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium text-xs focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="ALL">All Client Types</option>
              <option value="CORPORATE">Corporate / Firms Only</option>
              <option value="INDIVIDUAL">Private Individuals</option>
            </select>

            {/* Contact Channel Filter */}
            <select
              value={contactChannelFilter}
              onChange={(e) => setContactChannelFilter(e.target.value as any)}
              aria-label="Filter by Contact Channel"
              className="px-2.5 py-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium text-xs focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="ALL">All Contacts</option>
              <option value="HAS_PHONE">Has Phone Number</option>
              <option value="HAS_EMAIL">Has Email Address</option>
            </select>
          </div>

          <div className="text-xs text-[#696E82] font-medium">
            Showing <span className="font-semibold text-[#1F1F1F]">{totalMatches}</span> directory contacts
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {isFiltered && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[#696E82] text-[11px] font-medium mr-1">Active Filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold">
                Search: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery("")} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedDisciplineTrade !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
                Trade: {selectedDisciplineTrade}
                <button
                  type="button"
                  onClick={() => setSelectedDisciplineTrade("ALL")}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {clientTypeFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                Type: {clientTypeFilter === "CORPORATE" ? "Corporate Only" : "Individual"}
                <button
                  type="button"
                  onClick={() => setClientTypeFilter("ALL")}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {contactChannelFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                Channel: {contactChannelFilter === "HAS_PHONE" ? "Has Phone" : "Has Email"}
                <button
                  type="button"
                  onClick={() => setContactChannelFilter("ALL")}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <span className="ml-auto text-[#696E82] text-[11px] font-medium">
              Showing <strong className="text-[#1F1F1F]">{totalMatches}</strong> matching records
            </span>
          </div>
        )}
      </div>

      {/* Zero Results State */}
      {totalMatches === 0 && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#1F1F1F]">No matching contacts found</h3>
          <p className="text-xs text-[#696E82] max-w-sm mx-auto">
            No clients, consultants, or contractors matched your current search criteria and filters. Try adjusting your search query or clear active filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-[#5A81FA] text-white text-xs font-semibold rounded-xl hover:bg-[#4870EB] transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* 1. Clients Section */}
      {sortedClients.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="type-section-title text-[#1F1F1F] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#5A81FA]" />
              <span>Clients ({sortedClients.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedClients.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="type-card-title text-[#1F1F1F] font-bold">{c.name}</h3>
                    <div className="text-xs text-[#5A81FA] font-semibold mt-0.5">
                      {c.company || "Private Individual"}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Active Client
                  </span>
                </div>

                {c.notes && <p className="text-xs text-[#696E82] line-clamp-2">{c.notes}</p>}

                {c.projects && c.projects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-[#696E82] font-semibold uppercase">Projects:</span>
                    {c.projects.map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        {p.code} - {p.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2.5 border-t border-[#E2E6F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#696E82]">
                  <div className="flex items-center gap-3">
                    {c.contact && (
                      <a
                        href={`tel:${c.contact}`}
                        className="inline-flex items-center gap-1 text-[#5A81FA] hover:underline font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{c.contact}</span>
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1 text-[#5A81FA] hover:underline font-medium"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{c.email}</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyContact(c.id, `${c.name} (${c.company || "Client"})\nPhone: ${c.contact || "N/A"}\nEmail: ${c.email || "N/A"}`)}
                    className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-50 cursor-pointer"
                    title="Copy Contact Details"
                  >
                    {copiedId === c.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === c.id ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Consultants Section */}
      {sortedConsultants.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="type-section-title text-[#1F1F1F] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              <span>Engineering & Specialist Consultants ({sortedConsultants.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedConsultants.map((con) => (
              <div
                key={con.id}
                className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="type-card-title text-[#1F1F1F] font-bold">{con.name}</h3>
                    <div className="text-xs text-[#696E82] font-medium mt-0.5">{con.firmName || "Independent"}</div>
                  </div>
                  <span className="text-[10px] font-semibold bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] px-2 py-0.5 rounded-full shrink-0">
                    {con.discipline}
                  </span>
                </div>

                {con.notes && <p className="text-xs text-[#696E82] line-clamp-2">{con.notes}</p>}

                {con.firmAddress && (
                  <div className="flex items-start gap-1.5 text-[11px] text-[#696E82]">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{con.firmAddress}</span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-[#E2E6F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#696E82]">
                  <div className="flex items-center gap-3">
                    {con.contact && (
                      <a
                        href={`tel:${con.contact}`}
                        className="inline-flex items-center gap-1 text-[#5A81FA] hover:underline font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{con.contact}</span>
                      </a>
                    )}
                    {con.email && (
                      <a
                        href={`mailto:${con.email}`}
                        className="inline-flex items-center gap-1 text-[#5A81FA] hover:underline font-medium"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{con.email}</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyContact(
                        con.id,
                        `${con.name} (${con.firmName || "Consultant"} - ${con.discipline})\nPhone: ${con.contact || "N/A"}\nEmail: ${con.email || "N/A"}`
                      )
                    }
                    className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-50 cursor-pointer"
                    title="Copy Contact Details"
                  >
                    {copiedId === con.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === con.id ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Contractors Section */}
      {sortedContractors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="type-section-title text-[#1F1F1F] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Trade Contractors ({sortedContractors.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedContractors.map((cont) => (
              <div
                key={cont.id}
                className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="type-card-title text-[#1F1F1F] font-bold">{cont.firmName || cont.name}</h3>
                    <div className="text-xs text-[#696E82] font-medium mt-0.5">Contact: {cont.name}</div>
                  </div>
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                    {cont.trade}
                  </span>
                </div>

                {cont.address && (
                  <div className="flex items-start gap-1.5 text-[11px] text-[#696E82]">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{cont.address}</span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-[#E2E6F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#696E82]">
                  <div className="flex items-center gap-3">
                    {cont.contact && (
                      <a
                        href={`tel:${cont.contact}`}
                        className="inline-flex items-center gap-1 text-[#5A81FA] hover:underline font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{cont.contact}</span>
                      </a>
                    )}
                    {cont.email && (
                      <a
                        href={`mailto:${cont.email}`}
                        className="inline-flex items-center gap-1 text-[#5A81FA] hover:underline font-medium"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{cont.email}</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyContact(
                        cont.id,
                        `${cont.firmName || cont.name} (${cont.trade})\nContact: ${cont.name}\nPhone: ${cont.contact || "N/A"}\nEmail: ${cont.email || "N/A"}`
                      )
                    }
                    className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-50 cursor-pointer"
                    title="Copy Contact Details"
                  >
                    {copiedId === cont.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === cont.id ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
