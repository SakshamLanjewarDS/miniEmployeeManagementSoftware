"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Mail,
  Building2,
  Phone,
  MapPin,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  MessageCircle,
  FileText,
  User,
  Sliders,
} from "lucide-react";

export interface ShareableContact {
  id: string;
  name: string;
  category: string; // e.g. "Electrical", "Structural Engineering", etc.
  firmName?: string | null;
  contact?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface ClientOption {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  company?: string | null;
}

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface ContactShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: ShareableContact[];
  clients?: ClientOption[];
  projects?: ProjectOption[];
  workspaceName?: string;
  contactTypeLabel?: string; // "Contractor" or "Consultant"
}

export function ContactShareModal({
  isOpen,
  onClose,
  contacts,
  clients = [],
  projects = [],
  workspaceName = "100% DESIGN Studio",
  contactTypeLabel = "Contractor",
}: ContactShareModalProps) {
  // Recipient info
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [customNote, setCustomNote] = useState("");

  // Which contacts are actively included (defaults to all passed in)
  const [includedContactIds, setIncludedContactIds] = useState<string[]>(
    contacts.map((c) => c.id)
  );

  // Synchronize included contacts whenever modal opens or contacts change
  React.useEffect(() => {
    if (isOpen) {
      setIncludedContactIds(contacts.map((c) => c.id));
    }
  }, [isOpen, contacts]);

  // Field inclusion toggles
  const [includePhone, setIncludePhone] = useState(true);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [includeFirm, setIncludeFirm] = useState(true);
  const [includeAddress, setIncludeAddress] = useState(true);

  // Preview tab: whatsapp vs email
  const [previewTab, setPreviewTab] = useState<"whatsapp" | "email">("whatsapp");
  const [copied, setCopied] = useState(false);

  // Update recipient when selecting client from dropdown
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) return;
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClientName(found.name + (found.company ? ` (${found.company})` : ""));
      if (found.contact) setClientPhone(found.contact);
      if (found.email) setClientEmail(found.email);
    }
  };

  // Toggle individual contact inclusion
  const toggleContact = (id: string) => {
    setIncludedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Group ALL passed contacts by category (Trade or Discipline)
  const allGroupedContacts = useMemo(() => {
    const map = new Map<string, ShareableContact[]>();
    contacts.forEach((c) => {
      const cat = c.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    });
    return map;
  }, [contacts]);

  // Group ONLY included contacts by category (Trade or Discipline) for message generation
  const includedGroupedContacts = useMemo(() => {
    const active = contacts.filter((c) => includedContactIds.includes(c.id));
    const map = new Map<string, ShareableContact[]>();
    active.forEach((c) => {
      const cat = c.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    });
    return map;
  }, [contacts, includedContactIds]);

  const toggleCategory = (cat: string) => {
    const catContacts = allGroupedContacts.get(cat) || [];
    const catIds = catContacts.map((c) => c.id);
    const allInCatSelected =
      catIds.length > 0 && catIds.every((id) => includedContactIds.includes(id));
    if (allInCatSelected) {
      setIncludedContactIds((prev) => prev.filter((id) => !catIds.includes(id)));
    } else {
      setIncludedContactIds((prev) => Array.from(new Set([...prev, ...catIds])));
    }
  };

  // Clean phone number for WhatsApp wa.me link
  const cleanPhoneForWhatsApp = useMemo(() => {
    const raw = clientPhone.replace(/[^0-9]/g, "");
    if (!raw) return "";
    // If 10 digits (typical Indian mobile), prefix 91
    if (raw.length === 10) return `91${raw}`;
    return raw;
  }, [clientPhone]);

  // Generate formatted message text
  const messageText = useMemo(() => {
    const active = contacts.filter((c) => includedContactIds.includes(c.id));
    if (active.length === 0) {
      return "No contacts selected to share.";
    }

    const lines: string[] = [];

    // Header
    lines.push(`🏛️ *${workspaceName.toUpperCase()}*`);
    lines.push(`*Recommended ${contactTypeLabel} Directory*`);
    lines.push(`─────────────────────────────`);

    if (clientName.trim()) {
      lines.push(`Dear ${clientName.trim()},`);
    } else {
      lines.push(`Hello,`);
    }

    if (customNote.trim()) {
      lines.push(`${customNote.trim()}\n`);
    } else {
      lines.push(
        `Here are the verified ${contactTypeLabel.toLowerCase()} contact details for your review:\n`
      );
    }

    if (selectedProject) {
      lines.push(`📁 *Project:* ${selectedProject.code} — ${selectedProject.name}\n`);
    }

    // Contacts grouped by category
    includedGroupedContacts.forEach((catContacts, cat) => {
      lines.push(`📌 *${cat.toUpperCase()}* (${catContacts.length})`);
      catContacts.forEach((c) => {
        lines.push(`• *${c.name}*`);
        if (includeFirm && c.firmName) {
          lines.push(`  🏢 Firm: ${c.firmName}`);
        }
        if (includePhone && c.contact) {
          lines.push(`  📞 Contact: ${c.contact}`);
        }
        if (includeEmail && c.email) {
          lines.push(`  ✉️ Email: ${c.email}`);
        }
        if (includeAddress && c.address) {
          lines.push(`  📍 Location: ${c.address}`);
        }
        lines.push(``);
      });
    });

    lines.push(`─────────────────────────────`);
    lines.push(`Shared by: *${workspaceName}* Architecture & Engineering Team`);
    lines.push(`Please feel free to connect with them directly or let us know if you need assistance coordinating.`);

    return lines.join("\n");
  }, [
    contacts,
    includedContactIds,
    workspaceName,
    contactTypeLabel,
    clientName,
    customNote,
    selectedProject,
    includedGroupedContacts,
    includeFirm,
    includePhone,
    includeEmail,
    includeAddress,
  ]);

  // Email subject line
  const emailSubject = useMemo(() => {
    const proj = selectedProject ? ` for ${selectedProject.code} (${selectedProject.name})` : "";
    return `${workspaceName}: Recommended ${contactTypeLabel} Contacts${proj}`;
  }, [workspaceName, contactTypeLabel, selectedProject]);

  // WhatsApp Link
  const whatsappUrl = useMemo(() => {
    const encoded = encodeURIComponent(messageText);
    if (cleanPhoneForWhatsApp) {
      return `https://wa.me/${cleanPhoneForWhatsApp}?text=${encoded}`;
    }
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }, [cleanPhoneForWhatsApp, messageText]);

  // Gmail Web Link
  const gmailUrl = useMemo(() => {
    const to = encodeURIComponent(clientEmail.trim());
    const su = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(messageText);
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
  }, [clientEmail, emailSubject, messageText]);

  // Mailto Link
  const mailtoUrl = useMemo(() => {
    const to = encodeURIComponent(clientEmail.trim());
    const su = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(messageText);
    return `mailto:${to}?subject=${su}&body=${body}`;
  }, [clientEmail, emailSubject, messageText]);

  // Copy handler
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = messageText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  const totalSelectedCount = includedContactIds.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E6F0] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5A81FA] text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1F1F1F]">
                  Share {contactTypeLabel} Contacts
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F4FF] text-[#2C308D] border border-[#CEDEFF]">
                  {totalSelectedCount} {totalSelectedCount === 1 ? "Contact" : "Contacts"} Selected
                </span>
              </div>
              <p className="text-xs text-[#696E82] mt-0.5">
                Send professional contact cards to your client directly via WhatsApp or Email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF] transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns (Inputs & Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#F8F9FD]">
          {/* LEFT COLUMN: Controls & Recipient Info (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Recipient Details Card */}
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1F1F1F] uppercase tracking-wider border-b border-[#E2E6F0] pb-2">
                <User className="w-3.5 h-3.5 text-[#5A81FA]" />
                <span>Client / Recipient Details</span>
              </div>

              {/* Client Quick Picker */}
              {clients.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] mb-1">
                    Quick Select Client from Directory (Optional)
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  >
                    <option value="">-- Choose Existing Client (Auto-fills details) --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""} {c.contact ? `• ${c.contact}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] mb-1">
                    Client / Recipient Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Mr. Rajesh Mehta"
                    className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] mb-1">
                    WhatsApp / Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                    />
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] mb-1">
                    Client Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="e.g. client@example.com"
                      className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                    />
                    <Mail className="w-3.5 h-3.5 text-[#5A81FA] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {projects.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#696E82] mb-1">
                      Project Reference (Optional)
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                    >
                      <option value="">-- No specific project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] mb-1">
                  Custom Greeting / Note (Optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Sharing approved trade specialists as requested during our site meeting."
                  className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>
            </div>

            {/* 2. Selected Contacts Picker & Category Breakdown */}
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Selected {contactTypeLabel}s ({totalSelectedCount}/{contacts.length})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIncludedContactIds(contacts.map((c) => c.id))}
                    className="text-[#5A81FA] hover:underline cursor-pointer font-semibold text-[11px]"
                  >
                    Select All
                  </button>
                  <span className="text-[#696E82]">•</span>
                  <button
                    type="button"
                    onClick={() => setIncludedContactIds([])}
                    className="text-[#696E82] hover:text-red-600 hover:underline cursor-pointer font-semibold text-[11px]"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Grouped Contact Badges */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {Array.from(allGroupedContacts.entries()).map(([cat, list]) => {
                  const selectedInCatCount = list.filter((c) =>
                    includedContactIds.includes(c.id)
                  ).length;
                  const allInCatSelected =
                    selectedInCatCount === list.length && list.length > 0;

                  return (
                    <div
                      key={cat}
                      className="space-y-2 bg-[#F8F9FD] p-3 rounded-xl border border-[#E2E6F0]"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#2C308D] uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <span>{cat}</span>
                          <span className="text-[10px] text-[#696E82] font-semibold lowercase">
                            ({selectedInCatCount} of {list.length} selected)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className="text-[10px] text-[#5A81FA] hover:underline cursor-pointer lowercase font-medium"
                        >
                          {allInCatSelected ? "unselect trade" : "select all in trade"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {list.map((c) => {
                          const isIncluded = includedContactIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              onClick={() => toggleContact(c.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                                isIncluded
                                  ? "bg-white border-[#5A81FA] ring-1 ring-[#5A81FA]/20 shadow-2xs"
                                  : "bg-white/60 border-[#E2E6F0] opacity-50 hover:opacity-80"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => toggleContact(c.id)}
                                className="mt-0.5 rounded text-[#5A81FA] focus:ring-[#5A81FA] cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-[#1F1F1F] truncate">
                                  {c.name}
                                </h5>
                                {c.firmName && (
                                  <p className="text-[11px] text-[#696E82] truncate">
                                    {c.firmName}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#696E82]">
                                  {c.contact && (
                                    <span className="font-mono text-[#5A81FA] font-semibold">
                                      {c.contact}
                                    </span>
                                  )}
                                  {c.email && (
                                    <span className="truncate max-w-[120px]">{c.email}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Include / Exclude Fields Toggle */}
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1F1F1F] uppercase tracking-wider mb-2">
                <Sliders className="w-3.5 h-3.5 text-[#5A81FA]" />
                <span>Fields to Include in Message</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePhone}
                    onChange={(e) => setIncludePhone(e.target.checked)}
                    className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <span>Phone Numbers</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeEmail}
                    onChange={(e) => setIncludeEmail(e.target.checked)}
                    className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <span>Email Addresses</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeFirm}
                    onChange={(e) => setIncludeFirm(e.target.checked)}
                    className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <span>Firm / Company</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeAddress}
                    onChange={(e) => setIncludeAddress(e.target.checked)}
                    className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <span>City / Address</span>
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Interactive Preview & One-Click Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Preview Box */}
            <div className="bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs overflow-hidden flex flex-col flex-1">
              <div className="p-3 border-b border-[#E2E6F0] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span className="text-xs font-bold text-[#1F1F1F]">Live Message Preview</span>
                </div>
                <div className="flex items-center gap-1 bg-[#F2F4FF] p-0.5 rounded-lg border border-[#CEDEFF] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("whatsapp")}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      previewTab === "whatsapp"
                        ? "bg-white text-emerald-700 shadow-2xs"
                        : "text-[#696E82] hover:text-[#1F1F1F]"
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("email")}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      previewTab === "email"
                        ? "bg-white text-[#5A81FA] shadow-2xs"
                        : "text-[#696E82] hover:text-[#1F1F1F]"
                    }`}
                  >
                    Email Text
                  </button>
                </div>
              </div>

              {/* Preview Content Area */}
              <div
                className={`p-3.5 flex-1 overflow-y-auto text-xs font-mono leading-relaxed select-text ${
                  previewTab === "whatsapp"
                    ? "bg-[#EFEAE2] text-[#111B21]"
                    : "bg-[#F8F9FD] text-[#1F1F1F]"
                }`}
                style={{ maxHeight: "360px" }}
              >
                {previewTab === "whatsapp" ? (
                  <div className="bg-white p-3.5 rounded-xl shadow-xs border border-black/5 whitespace-pre-wrap">
                    {messageText}
                  </div>
                ) : (
                  <div className="space-y-2 whitespace-pre-wrap font-sans text-xs">
                    <div className="text-[11px] text-[#696E82] pb-1 border-b border-[#E2E6F0]">
                      <strong>To:</strong> {clientEmail || "(No email specified)"}
                      <br />
                      <strong>Subject:</strong> {emailSubject}
                    </div>
                    <div className="whitespace-pre-wrap">{messageText}</div>
                  </div>
                )}
              </div>

              {/* Copy message button */}
              <div className="p-3 border-t border-[#E2E6F0] bg-white flex items-center justify-between shrink-0">
                <span className="text-[11px] text-[#696E82]">
                  {messageText.length} characters
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-[#F2F4FF] hover:bg-[#CEDEFF] text-[#2C308D]"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Formatted Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Direct Action Share Buttons */}
            <div className="space-y-2.5">
              {/* WhatsApp Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-center"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>
                  {clientPhone
                    ? `Send to WhatsApp (${clientPhone})`
                    : "Send via WhatsApp (Pick Contact)"}
                </span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
              </a>

              {/* Email Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#EA4335] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors text-center"
                >
                  <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
                  <span>Compose in Gmail</span>
                </a>

                <a
                  href={mailtoUrl}
                  className="py-2.5 px-3 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#5A81FA] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors text-center"
                >
                  <Send className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Default Mail App</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E2E6F0] bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-[#696E82]">
            Tip: You can select multiple trades (e.g. 1 Electrician + 2 Tiling + 1 Plumbing) to send in a single consolidated message.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#1F1F1F] rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
