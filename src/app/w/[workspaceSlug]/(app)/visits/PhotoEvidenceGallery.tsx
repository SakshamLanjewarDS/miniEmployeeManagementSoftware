"use client";

import React, { useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Tag,
  Clock,
  MapPin,
  X,
  Plus,
  Trash2,
  ZoomIn,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

export interface SitePhotoItem {
  id?: string;
  url: string;
  caption?: string;
  tag: "QUALITY_ISSUE" | "PROGRESS_PHOTO" | "APPROVED_JUNCTION" | "SAFETY_VIOLATION";
  timestamp?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PhotoGalleryProps {
  photos: SitePhotoItem[];
  isEditable?: boolean;
  onPhotosChange?: (photos: SitePhotoItem[]) => void;
  currentCoords?: { latitude: number; longitude: number } | null;
}

const TAG_CONFIG: Record<
  SitePhotoItem["tag"],
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  QUALITY_ISSUE: {
    label: "Quality Issue",
    color: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: AlertTriangle,
  },
  PROGRESS_PHOTO: {
    label: "Progress Photo",
    color: "text-blue-800",
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: ImageIcon,
  },
  APPROVED_JUNCTION: {
    label: "Approved Junction",
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    icon: CheckCircle2,
  },
  SAFETY_VIOLATION: {
    label: "Safety Violation",
    color: "text-rose-800",
    bg: "bg-rose-50",
    border: "border-rose-300",
    icon: ShieldAlert,
  },
};

export default function PhotoEvidenceGallery({
  photos = [],
  isEditable = false,
  onPhotosChange,
  currentCoords,
}: PhotoGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [lightboxPhoto, setLightboxPhoto] = useState<SitePhotoItem | null>(null);

  // New photo upload modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [newPhotoTag, setNewPhotoTag] = useState<SitePhotoItem["tag"]>("PROGRESS_PHOTO");

  const filteredPhotos = photos.filter((p) => {
    if (activeFilter === "ALL") return true;
    return p.tag === activeFilter;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setNewPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl) return;

    const newPhoto: SitePhotoItem = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      url: newPhotoUrl,
      caption: newPhotoCaption.trim() || undefined,
      tag: newPhotoTag,
      timestamp: new Date().toISOString(),
      latitude: currentCoords?.latitude || null,
      longitude: currentCoords?.longitude || null,
    };

    const updated = [...photos, newPhoto];
    onPhotosChange?.(updated);

    // Reset
    setNewPhotoUrl("");
    setNewPhotoCaption("");
    setNewPhotoTag("PROGRESS_PHOTO");
    setShowAddModal(false);
  };

  const handleDeletePhoto = (index: number) => {
    const updated = photos.filter((_, idx) => idx !== index);
    onPhotosChange?.(updated);
  };

  return (
    <div className="space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#5A81FA]" />
          <h4 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
            Site Photo Evidence Gallery ({photos.length}/10)
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tag filter pills */}
          <div className="flex items-center gap-1 bg-[#F8F9FD] p-0.5 rounded-lg border border-[#E2E6F0] text-[10px]">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={`px-2 py-0.5 font-semibold rounded cursor-pointer transition-colors ${
                activeFilter === "ALL"
                  ? "bg-[#5A81FA] text-white"
                  : "text-[#696E82] hover:text-[#1F1F1F]"
              }`}
            >
              All ({photos.length})
            </button>
            {(["QUALITY_ISSUE", "PROGRESS_PHOTO", "APPROVED_JUNCTION", "SAFETY_VIOLATION"] as const).map(
              (tag) => {
                const count = photos.filter((p) => p.tag === tag).length;
                if (count === 0 && !isEditable) return null;
                const cfg = TAG_CONFIG[tag];
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveFilter(tag)}
                    className={`px-2 py-0.5 font-semibold rounded cursor-pointer transition-colors ${
                      activeFilter === tag
                        ? "bg-[#5A81FA] text-white"
                        : "text-[#696E82] hover:text-[#1F1F1F]"
                    }`}
                  >
                    {cfg.label} ({count})
                  </button>
                );
              }
            )}
          </div>

          {isEditable && photos.length < 10 && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photo</span>
            </button>
          )}
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="p-6 text-center bg-[#F8F9FD] border border-dashed border-[#CEDEFF] rounded-xl text-xs text-[#696E82] space-y-1">
          <Camera className="w-6 h-6 text-[#A8B1CE] mx-auto mb-1" />
          <p className="font-semibold text-[#1F1F1F]">No site photos logged</p>
          <p className="text-[11px]">
            {isEditable
              ? "Capture or attach geotagged site inspection photos before exiting."
              : "No visual evidence uploaded for this inspection."}
          </p>
          {isEditable && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-3 py-1 bg-white border border-[#E2E6F0] text-[#5A81FA] font-bold rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
            >
              + Upload First Photo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPhotos.map((photo, idx) => {
            const cfg = TAG_CONFIG[photo.tag] || TAG_CONFIG.PROGRESS_PHOTO;
            const Icon = cfg.icon;

            return (
              <div
                key={photo.id || idx}
                className="group relative bg-white border border-[#E2E6F0] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
              >
                {/* Photo Thumbnail */}
                <div
                  onClick={() => setLightboxPhoto(photo)}
                  className="relative aspect-4/3 bg-slate-900 overflow-hidden cursor-pointer"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Site inspection evidence"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Tag Pill */}
                  <div className="absolute top-1.5 left-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border backdrop-blur-xs ${cfg.bg} ${cfg.color} ${cfg.border}`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{cfg.label}</span>
                    </span>
                  </div>

                  {/* Zoom overlay icon */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-5 h-5" />
                  </div>

                  {/* GPS Watermark badge if present */}
                  {photo.latitude && photo.longitude && (
                    <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-[9px] font-mono text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                      <span>GPS</span>
                    </div>
                  )}
                </div>

                {/* Caption & Metadata */}
                <div className="p-2 text-xs space-y-1 flex-1 flex flex-col justify-between">
                  <p className="text-[11px] font-semibold text-[#1F1F1F] line-clamp-2">
                    {photo.caption || "Inspection snapshot"}
                  </p>

                  <div className="pt-1 border-t border-[#E2E6F0]/60 flex items-center justify-between text-[10px] text-[#696E82]">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {photo.timestamp
                          ? new Date(photo.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Timestamped"}
                      </span>
                    </span>

                    {isEditable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(idx);
                        }}
                        className="text-rose-600 hover:text-rose-800 p-0.5 rounded cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in-0"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${TAG_CONFIG[lightboxPhoto.tag]?.bg} ${TAG_CONFIG[lightboxPhoto.tag]?.color} ${TAG_CONFIG[lightboxPhoto.tag]?.border}`}
                >
                  <span>{TAG_CONFIG[lightboxPhoto.tag]?.label}</span>
                </span>
                <span className="text-xs text-slate-400">
                  {lightboxPhoto.timestamp
                    ? new Date(lightboxPhoto.timestamp).toLocaleString("en-IN")
                    : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative max-h-[70vh] flex items-center justify-center bg-black p-2">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption || "High-res evidence"}
                className="max-h-[65vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-1 text-xs">
              <p className="text-sm font-semibold text-white">
                {lightboxPhoto.caption || "No caption provided."}
              </p>
              {lightboxPhoto.latitude && lightboxPhoto.longitude && (
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    GPS Watermark: {lightboxPhoto.latitude.toFixed(5)}°,{" "}
                    {lightboxPhoto.longitude.toFixed(5)}°
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2.5">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#5A81FA]" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">Attach Field Photo Evidence</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#696E82] hover:text-[#1F1F1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="space-y-3.5 text-xs">
              {/* File upload input */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                  Upload Photo / Capture from Camera <span className="text-red-600">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-[#696E82] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F2F4FF] file:text-[#5A81FA] hover:file:bg-[#E5EAFF] cursor-pointer"
                />
              </div>

              {/* Preview if uploaded */}
              {newPhotoUrl && (
                <div className="relative aspect-16/9 bg-slate-900 rounded-xl overflow-hidden border border-[#E2E6F0]">
                  <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Tag selector */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                  Classification Category <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      "PROGRESS_PHOTO",
                      "QUALITY_ISSUE",
                      "APPROVED_JUNCTION",
                      "SAFETY_VIOLATION",
                    ] as const
                  ).map((tag) => {
                    const cfg = TAG_CONFIG[tag];
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewPhotoTag(tag)}
                        className={`p-2 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                          newPhotoTag === tag
                            ? "bg-[#5A81FA] text-white border-[#5A81FA]"
                            : "bg-[#F8F9FD] text-[#1F1F1F] border-[#E2E6F0] hover:bg-[#F2F4FF]"
                        }`}
                      >
                        <cfg.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                  Observation Caption / Defect Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Honeycombing at base of Column C-4 prior to pour sign-off"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>

              {/* GPS coordinates note */}
              {currentCoords && (
                <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>
                    Auto-stamping GPS: {currentCoords.latitude.toFixed(4)}°,{" "}
                    {currentCoords.longitude.toFixed(4)}°
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPhotoUrl}
                  className="px-4 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Add Photo Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
