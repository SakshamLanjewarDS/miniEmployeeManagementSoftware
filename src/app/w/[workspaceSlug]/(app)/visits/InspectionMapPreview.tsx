"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Compass,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Footprints,
  ExternalLink,
  Layers,
  LocateFixed,
} from "lucide-react";

interface MapPreviewProps {
  site: {
    name: string;
    address?: string;
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number;
    landmarkNotes?: string | null;
  };
  checkInEvent?: {
    latitude: number | null;
    longitude: number | null;
    accuracyMeters?: number | null;
    calculatedDistanceMeters?: number | null;
    geofenceAssessment?: string;
    serverReceiptTime?: string;
  } | null;
  checkOutEvent?: {
    latitude: number | null;
    longitude: number | null;
    accuracyMeters?: number | null;
    calculatedDistanceMeters?: number | null;
    serverReceiptTime?: string;
  } | null;
  waypoints?: Array<{
    id?: string;
    latitude: number | null;
    longitude: number | null;
    calculatedDistanceMeters?: number | null;
    serverReceiptTime: string;
    failureReason?: string | null;
  }>;
  checkInAddress?: string | null;
  checkOutAddress?: string | null;
}

// Convert latitude and longitude offset to approximate meters (equirectangular projection)
function coordsToMetersOffset(
  refLat: number,
  refLng: number,
  targetLat: number,
  targetLng: number
) {
  const latDist = (targetLat - refLat) * 111320;
  const lngDist =
    (targetLng - refLng) *
    (40075000 * Math.cos((refLat * Math.PI) / 180) / 360);
  return { x: lngDist, y: -latDist }; // SVG y is down (South), positive lat is North
}

export default function InspectionMapPreview({
  site,
  checkInEvent,
  checkOutEvent,
  waypoints = [],
  checkInAddress,
  checkOutAddress,
}: MapPreviewProps) {
  const [viewMode, setViewMode] = useState<"VECTOR" | "OSM">("VECTOR");

  const siteLat = site.latitude ?? (checkInEvent?.latitude ?? 18.7758);
  const siteLng = site.longitude ?? (checkInEvent?.longitude ?? 72.8596);
  const radius = site.radiusMeters || 150;

  // Filter valid GPS waypoints
  const validWaypoints = useMemo(() => {
    return waypoints.filter((wp) => wp.latitude !== null && wp.longitude !== null);
  }, [waypoints]);

  // Compute SVG plot dimensions and scale
  const { plotRadius, maxMeters, checkInPos, checkOutPos, waypointPositions, svgSize } =
    useMemo(() => {
      const size = 380;
      const center = size / 2;

      // Find maximum distance among all points
      let maxDist = radius * 1.35;
      if (checkInEvent?.calculatedDistanceMeters) {
        maxDist = Math.max(maxDist, checkInEvent.calculatedDistanceMeters * 1.25);
      }
      if (checkOutEvent?.calculatedDistanceMeters) {
        maxDist = Math.max(maxDist, checkOutEvent.calculatedDistanceMeters * 1.25);
      }
      validWaypoints.forEach((wp) => {
        if (wp.calculatedDistanceMeters) {
          maxDist = Math.max(maxDist, wp.calculatedDistanceMeters * 1.25);
        }
      });

      // Scale factor: maxDist meters maps to (center - 30) pixels
      const usableRadius = center - 35;
      const scale = usableRadius / Math.max(maxDist, 100);

      // Site centroid is at (center, center)
      const pRadius = radius * scale;

      let inPos: { x: number; y: number } | null = null;
      if (checkInEvent?.latitude && checkInEvent?.longitude) {
        const offset = coordsToMetersOffset(
          siteLat,
          siteLng,
          checkInEvent.latitude,
          checkInEvent.longitude
        );
        inPos = {
          x: Math.min(Math.max(center + offset.x * scale, 15), size - 15),
          y: Math.min(Math.max(center + offset.y * scale, 15), size - 15),
        };
      }

      let outPos: { x: number; y: number } | null = null;
      if (checkOutEvent?.latitude && checkOutEvent?.longitude) {
        const offset = coordsToMetersOffset(
          siteLat,
          siteLng,
          checkOutEvent.latitude,
          checkOutEvent.longitude
        );
        outPos = {
          x: Math.min(Math.max(center + offset.x * scale, 15), size - 15),
          y: Math.min(Math.max(center + offset.y * scale, 15), size - 15),
        };
      }

      const wpPositions = validWaypoints.map((wp) => {
        const offset = coordsToMetersOffset(siteLat, siteLng, wp.latitude!, wp.longitude!);
        return {
          id: wp.id,
          x: Math.min(Math.max(center + offset.x * scale, 15), size - 15),
          y: Math.min(Math.max(center + offset.y * scale, 15), size - 15),
          dist: wp.calculatedDistanceMeters,
          time: wp.serverReceiptTime,
        };
      });

      return {
        svgSize: size,
        plotRadius: pRadius,
        maxMeters: maxDist,
        checkInPos: inPos,
        checkOutPos: outPos,
        waypointPositions: wpPositions,
      };
    }, [radius, checkInEvent, checkOutEvent, validWaypoints, siteLat, siteLng]);

  // Distance deviation calculations
  const inDistance = checkInEvent?.calculatedDistanceMeters ?? null;
  const isWithinGeofence = inDistance !== null ? inDistance <= radius : null;
  const deviationPercent = inDistance !== null ? Math.min(Math.round((inDistance / radius) * 100), 200) : 0;

  // OpenStreetMap embed URL
  const osmEmbedUrl = useMemo(() => {
    const delta = 0.005;
    const bbox = `${siteLng - delta},${siteLat - delta},${siteLng + delta},${siteLat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${siteLat},${siteLng}`;
  }, [siteLat, siteLng]);

  return (
    <div className="bg-white border border-[#E2E6F0] rounded-2xl overflow-hidden shadow-xs space-y-0">
      {/* Map Control Header */}
      <div className="p-3.5 bg-[#F8F9FD] border-b border-[#E2E6F0] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5A81FA]/10 text-[#5A81FA] flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <span>Spatial Perimeter & GPS Plot</span>
              <span className="text-[10px] font-mono text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded-full border border-[#CEDEFF]">
                Radius: {radius}m
              </span>
            </h4>
            <p className="text-[10px] text-[#696E82]">
              Benchmark site centroid vs actual field check-in coordinates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("VECTOR")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === "VECTOR"
                ? "bg-[#5A81FA] text-white shadow-2xs"
                : "bg-white text-[#696E82] hover:bg-[#F2F4FF] border border-[#E2E6F0]"
            }`}
          >
            Vector Geofence Plot
          </button>
          <button
            type="button"
            onClick={() => setViewMode("OSM")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === "OSM"
                ? "bg-[#5A81FA] text-white shadow-2xs"
                : "bg-white text-[#696E82] hover:bg-[#F2F4FF] border border-[#E2E6F0]"
            }`}
          >
            Street Map View
          </button>
          <a
            href={`https://www.google.com/maps?q=${siteLat},${siteLng}`}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-[#696E82] hover:text-[#5A81FA] hover:bg-white border border-[#E2E6F0] rounded-lg transition-colors"
            title="Open in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Map View Area */}
      {viewMode === "VECTOR" ? (
        <div className="relative bg-[#0F172A] p-4 flex flex-col items-center justify-center overflow-hidden">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `radial-gradient(#94A3B8 1px, transparent 1px), radial-gradient(#94A3B8 1px, #0F172A 1px)`,
              backgroundSize: "20px 20px",
            }}
          />

          {/* Compass / Orientation Indicator */}
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs border border-slate-700/80 px-2 py-1 rounded-md text-[10px] text-slate-300 font-mono flex items-center gap-1 z-10">
            <Navigation className="w-3 h-3 text-[#5A81FA]" />
            <span>N ↑ Grid Aligned</span>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-xs border border-slate-700/80 p-2 rounded-lg text-[10px] text-slate-300 space-y-1 z-10 shadow-lg">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5A81FA] ring-2 ring-[#5A81FA]/40" />
              <span>Site Center</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40" />
              <span>Enter Pin</span>
            </div>
            {checkOutPos && (
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/40" />
                <span>Exit Pin</span>
              </div>
            )}
            {waypointPositions.length > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Trail Waypoints ({waypointPositions.length})</span>
              </div>
            )}
          </div>

          {/* SVG Visual Canvas */}
          <svg
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="w-full max-w-[380px] h-[340px] z-5 relative select-none"
          >
            <defs>
              <radialGradient id="geofenceGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#5A81FA" stopOpacity="0.18" />
                <stop offset="85%" stopColor="#5A81FA" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#5A81FA" stopOpacity="0.35" />
              </radialGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>

            {/* Range concentric rings */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={plotRadius * 0.5}
              fill="none"
              stroke="#334155"
              strokeDasharray="2 4"
              strokeWidth="1"
            />
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={plotRadius}
              fill="url(#geofenceGrad)"
              stroke="#5A81FA"
              strokeWidth="2"
              strokeDasharray="4 3"
              filter="url(#glow)"
            />

            {/* Geofence Perimeter Label */}
            <text
              x={svgSize / 2}
              y={svgSize / 2 - plotRadius - 6}
              textAnchor="middle"
              fill="#93C5FD"
              fontSize="10"
              fontWeight="600"
              fontFamily="monospace"
            >
              {radius}m PERIMETER
            </text>

            {/* Trail Line: Connect Check-in -> Waypoints -> Check-out */}
            {checkInPos && (
              <path
                d={(() => {
                  let pathStr = `M ${checkInPos.x} ${checkInPos.y}`;
                  waypointPositions.forEach((wp) => {
                    pathStr += ` L ${wp.x} ${wp.y}`;
                  });
                  if (checkOutPos) {
                    pathStr += ` L ${checkOutPos.x} ${checkOutPos.y}`;
                  }
                  return pathStr;
                })()}
                fill="none"
                stroke="#60A5FA"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.85"
              />
            )}

            {/* Intermediate Waypoints */}
            {waypointPositions.map((wp, idx) => (
              <g key={wp.id || idx}>
                <circle cx={wp.x} cy={wp.y} r="4" fill="#FBBF24" />
                <circle cx={wp.x} cy={wp.y} r="7" fill="none" stroke="#FBBF24" strokeOpacity="0.4" />
              </g>
            ))}

            {/* SITE CENTROID BENCHMARK PIN */}
            <g transform={`translate(${svgSize / 2}, ${svgSize / 2})`}>
              <circle r="14" fill="#5A81FA" fillOpacity="0.2" className="animate-ping" />
              <circle r="7" fill="#5A81FA" stroke="#FFFFFF" strokeWidth="2" />
              <text
                y="20"
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize="10"
                fontWeight="bold"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
              >
                Centroid
              </text>
            </g>

            {/* CHECK-IN PIN */}
            {checkInPos && (
              <g transform={`translate(${checkInPos.x}, ${checkInPos.y})`}>
                <circle r="10" fill="#10B981" fillOpacity="0.3" />
                <circle r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                <text
                  y="-12"
                  textAnchor="middle"
                  fill="#34D399"
                  fontSize="10"
                  fontWeight="bold"
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                >
                  📍 Check-In {inDistance !== null ? `(${inDistance}m)` : ""}
                </text>
              </g>
            )}

            {/* CHECK-OUT PIN */}
            {checkOutPos && (
              <g transform={`translate(${checkOutPos.x}, ${checkOutPos.y})`}>
                <circle r="10" fill="#EF4444" fillOpacity="0.3" />
                <circle r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                <text
                  y="18"
                  textAnchor="middle"
                  fill="#F87171"
                  fontSize="10"
                  fontWeight="bold"
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                >
                  🏁 Exit
                </text>
              </g>
            )}
          </svg>

          {/* Scale bar in bottom right */}
          <div className="absolute bottom-3 right-3 bg-slate-900/80 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
            Scale: ~{Math.round(maxMeters)}m span
          </div>
        </div>
      ) : (
        /* OpenStreetMap Embed View */
        <div className="relative w-full h-[340px] bg-slate-100">
          <iframe
            title="OpenStreetMap preview"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={osmEmbedUrl}
            className="w-full h-full border-0"
          />
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#1F1F1F] shadow-xs flex items-center gap-1.5 border border-[#E2E6F0]">
            <LocateFixed className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Site Coordinates: {siteLat.toFixed(4)}°, {siteLng.toFixed(4)}°</span>
          </div>
        </div>
      )}

      {/* Interactive Distance Deviation Meter */}
      <div className="p-3.5 bg-[#F8F9FD] border-t border-[#E2E6F0] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {isWithinGeofence === true ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : isWithinGeofence === false ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Compass className="w-4 h-4 text-[#5A81FA] shrink-0" />
            )}
            <span className="font-bold text-[#1F1F1F]">
              {inDistance !== null
                ? isWithinGeofence
                  ? `Checked in ${inDistance}m from site center (Permitted: ${radius}m — Inside Boundary)`
                  : `Checked in ${inDistance}m from site center (Permitted: ${radius}m — ⚠️ Outside Boundary)`
                : "No check-in distance recorded"}
            </span>
          </div>

          <span
            className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
              isWithinGeofence === true
                ? "bg-emerald-100 text-emerald-800"
                : isWithinGeofence === false
                ? "bg-rose-100 text-rose-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {inDistance !== null ? `${inDistance}m / ${radius}m` : "N/A"}
          </span>
        </div>

        {/* Deviation Progress Gauge Bar */}
        <div className="w-full bg-[#E2E6F0] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isWithinGeofence === true
                ? "bg-emerald-500"
                : isWithinGeofence === false
                ? "bg-rose-500"
                : "bg-[#5A81FA]"
            }`}
            style={{ width: `${Math.min(deviationPercent, 100)}%` }}
          />
        </div>

        {/* Reverse Geocoded Human Address Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          {checkInAddress && (
            <div className="p-2.5 bg-white border border-[#E2E6F0] rounded-xl flex items-start gap-2 shadow-2xs">
              <LogIn className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#696E82] block">
                  Audited Check-In Address
                </span>
                <span className="text-[#1F1F1F] font-semibold text-[11px] leading-tight block">
                  {checkInAddress}
                </span>
              </div>
            </div>
          )}

          {checkOutAddress && (
            <div className="p-2.5 bg-white border border-[#E2E6F0] rounded-xl flex items-start gap-2 shadow-2xs">
              <LogOut className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#696E82] block">
                  Audited Check-Out Address
                </span>
                <span className="text-[#1F1F1F] font-semibold text-[11px] leading-tight block">
                  {checkOutAddress}
                </span>
              </div>
            </div>
          )}

          {site.landmarkNotes && (
            <div className="p-2.5 bg-white border border-[#E2E6F0] rounded-xl flex items-start gap-2 shadow-2xs sm:col-span-2">
              <MapPin className="w-3.5 h-3.5 text-[#5A81FA] mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#696E82] block">
                  Site Landmark / Access Notes
                </span>
                <span className="text-[#1F1F1F] text-[11px] block">{site.landmarkNotes}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
