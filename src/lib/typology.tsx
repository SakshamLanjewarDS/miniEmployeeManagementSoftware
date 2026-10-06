import React from "react";
import { Building2 } from "lucide-react";

export interface TypologyConfig {
  name: string;
  key: string;
  color: string;       // Primary hex color
  bgClass: string;     // Tailwind bg + text + border classes
  badgeClass: string;
  dotColor: string;
  initials: string;    // 2-letter uppercase initials
}

export const KNOWN_TYPOLOGIES: Record<string, TypologyConfig> = {
  hospital: {
    name: "Hospital",
    key: "hospital",
    color: "#E11D48", // Rose-600
    bgClass: "bg-rose-50 text-rose-700 border-rose-200",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotColor: "#E11D48",
    initials: "HS",
  },
  "healthcare & hospital": {
    name: "Healthcare & Hospital",
    key: "healthcare & hospital",
    color: "#E11D48",
    bgClass: "bg-rose-50 text-rose-700 border-rose-200",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotColor: "#E11D48",
    initials: "HS",
  },
  "private bunglow": {
    name: "Private Bunglow",
    key: "private bunglow",
    color: "#D97706", // Amber-600
    bgClass: "bg-amber-50 text-amber-800 border-amber-200",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotColor: "#D97706",
    initials: "PB",
  },
  "residential architecture": {
    name: "Residential Architecture",
    key: "residential architecture",
    color: "#16A34A", // Green-600
    bgClass: "bg-green-50 text-green-700 border-green-200",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    dotColor: "#16A34A",
    initials: "RA",
  },
  "luxury villa & penthouse": {
    name: "Luxury Villa & Penthouse",
    key: "luxury villa & penthouse",
    color: "#B45309", // Amber-700
    bgClass: "bg-amber-50 text-amber-900 border-amber-300",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
    dotColor: "#B45309",
    initials: "LV",
  },
  commercial: {
    name: "Commercial",
    key: "commercial",
    color: "#2563EB", // Blue-600
    bgClass: "bg-blue-50 text-blue-700 border-blue-200",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "#2563EB",
    initials: "CM",
  },
  "commercial & corporate office": {
    name: "Commercial & Corporate Office",
    key: "commercial & corporate office",
    color: "#2563EB",
    bgClass: "bg-blue-50 text-blue-700 border-blue-200",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "#2563EB",
    initials: "CM",
  },
  "flat scheme": {
    name: "Flat Scheme",
    key: "flat scheme",
    color: "#0284C7", // Sky-600
    bgClass: "bg-sky-50 text-sky-700 border-sky-200",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotColor: "#0284C7",
    initials: "FS",
  },
  "high-rise residential": {
    name: "High-Rise Residential",
    key: "high-rise residential",
    color: "#0284C7",
    bgClass: "bg-sky-50 text-sky-700 border-sky-200",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotColor: "#0284C7",
    initials: "HR",
  },
  institutional: {
    name: "Institutional",
    key: "institutional",
    color: "#7C3AED", // Violet-600
    bgClass: "bg-violet-50 text-violet-700 border-violet-200",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotColor: "#7C3AED",
    initials: "IN",
  },
  "institutional & cultural": {
    name: "Institutional & Cultural",
    key: "institutional & cultural",
    color: "#7C3AED",
    bgClass: "bg-violet-50 text-violet-700 border-violet-200",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotColor: "#7C3AED",
    initials: "IN",
  },
  pwd: {
    name: "PWD",
    key: "pwd",
    color: "#EA580C", // Orange-600
    bgClass: "bg-orange-50 text-orange-800 border-orange-200",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
    dotColor: "#EA580C",
    initials: "PW",
  },
  "re-development": {
    name: "Re-Development",
    key: "re-development",
    color: "#059669", // Emerald-600
    bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "#059669",
    initials: "RD",
  },
  redevelopment: {
    name: "Re-Development",
    key: "redevelopment",
    color: "#059669",
    bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "#059669",
    initials: "RD",
  },
  "flat interiors": {
    name: "Flat Interiors",
    key: "flat interiors",
    color: "#C026D3", // Fuchsia-600
    bgClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    badgeClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    dotColor: "#C026D3",
    initials: "FI",
  },
  "interior architecture & fitout": {
    name: "Interior Architecture & Fitout",
    key: "interior architecture & fitout",
    color: "#C026D3",
    bgClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    badgeClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    dotColor: "#C026D3",
    initials: "IA",
  },
  "hospitality & boutique resort": {
    name: "Hospitality & Boutique Resort",
    key: "hospitality & boutique resort",
    color: "#4F46E5", // Indigo-600
    bgClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dotColor: "#4F46E5",
    initials: "HB",
  },
  "retail & showroom": {
    name: "Retail & Showroom",
    key: "retail & showroom",
    color: "#DB2777", // Pink-600
    bgClass: "bg-pink-50 text-pink-700 border-pink-200",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
    dotColor: "#DB2777",
    initials: "RS",
  },
  "landscape & urban design": {
    name: "Landscape & Urban Design",
    key: "landscape & urban design",
    color: "#65A30D", // Lime-600
    bgClass: "bg-lime-50 text-lime-800 border-lime-200",
    badgeClass: "bg-lime-50 text-lime-800 border-lime-200",
    dotColor: "#65A30D",
    initials: "LU",
  },
  "industrial & warehousing": {
    name: "Industrial & Warehousing",
    key: "industrial & warehousing",
    color: "#475569", // Slate-600
    bgClass: "bg-slate-100 text-slate-700 border-slate-300",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotColor: "#475569",
    initials: "IW",
  },
};

const FALLBACK_PALETTES = [
  { color: "#0D9488", bgClass: "bg-teal-50 text-teal-700 border-teal-200" },      // Teal
  { color: "#4F46E5", bgClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },  // Indigo
  { color: "#9333EA", bgClass: "bg-purple-50 text-purple-700 border-purple-200" },  // Purple
  { color: "#0891B2", bgClass: "bg-cyan-50 text-cyan-700 border-cyan-200" },      // Cyan
  { color: "#CA8A04", bgClass: "bg-yellow-50 text-yellow-800 border-yellow-200" },  // Yellow
  { color: "#BE185D", bgClass: "bg-pink-50 text-pink-700 border-pink-200" },      // Pink
  { color: "#059669", bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200" }, // Emerald
  { color: "#DC2626", bgClass: "bg-red-50 text-red-700 border-red-200" },          // Red
];

/**
 * Returns complete styling & identity metadata for any typology string
 */
export function getTypologyConfig(typologyName?: string | null): TypologyConfig {
  if (!typologyName || !typologyName.trim()) {
    return {
      name: "Architecture",
      key: "architecture",
      color: "#64748B", // Slate-500
      bgClass: "bg-slate-50 text-slate-600 border-slate-200",
      badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
      dotColor: "#64748B",
      initials: "AR",
    };
  }

  const clean = typologyName.trim();
  const lower = clean.toLowerCase();

  if (KNOWN_TYPOLOGIES[lower]) {
    return KNOWN_TYPOLOGIES[lower];
  }

  // Look for partial substring match in known keys
  for (const [key, cfg] of Object.entries(KNOWN_TYPOLOGIES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return {
        ...cfg,
        name: clean,
      };
    }
  }

  // Generate deterministic fallback from name hash
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length;
  const pal = FALLBACK_PALETTES[idx];

  // Extract initials (up to 2 letters)
  const words = clean.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : clean.slice(0, 2).toUpperCase();

  return {
    name: clean,
    key: lower,
    color: pal.color,
    bgClass: pal.bgClass,
    badgeClass: pal.bgClass,
    dotColor: pal.color,
    initials,
  };
}

/**
 * Generates a unified, deduplicated list of all typologies for dropdowns,
 * including both active project typologies and studio standards.
 */
export function getAllTypologies(projects?: Array<{ projectType?: string | null }>): string[] {
  const dynamicSet = new Set<string>();

  // 1. First add distinct typologies present in existing projects
  if (projects && projects.length > 0) {
    for (const p of projects) {
      if (p.projectType && p.projectType.trim()) {
        dynamicSet.add(p.projectType.trim());
      }
    }
  }

  // 2. Add studio standards
  const standardList = [
    "Private Bunglow",
    "Hospital",
    "Commercial",
    "Flat Scheme",
    "Institutional",
    "PWD",
    "Re-Development",
    "Flat Interiors",
    "Residential Architecture",
    "Commercial & Corporate Office",
    "Healthcare & Hospital",
    "Luxury Villa & Penthouse",
    "Hospitality & Boutique Resort",
    "Interior Architecture & Fitout",
    "High-Rise Residential",
    "Retail & Showroom",
    "Landscape & Urban Design",
    "Institutional & Cultural",
    "Industrial & Warehousing",
  ];

  for (const std of standardList) {
    dynamicSet.add(std);
  }

  return Array.from(dynamicSet);
}

/**
 * Intelligent architectural typology matcher
 */
export function isTypologyMatch(
  projectType: string | null | undefined,
  selectedTypology: string
): boolean {
  if (!selectedTypology || selectedTypology === "ALL" || selectedTypology.trim() === "") {
    return true;
  }
  if (!projectType || !projectType.trim()) {
    return false;
  }

  const pLower = projectType.trim().toLowerCase();
  const sLower = selectedTypology.trim().toLowerCase();

  // 1. Exact match
  if (pLower === sLower) return true;

  // 2. Direct containment
  if (pLower.includes(sLower) || sLower.includes(pLower)) return true;

  // 3. Known equivalence pairs
  const equivalences: [string[], string[]] = [
    ["hospital", "healthcare", "healthcare & hospital"],
    ["commercial", "commercial & corporate office"],
    ["institutional", "institutional & cultural", "college", "school"],
    ["private bunglow", "luxury villa & penthouse", "residential architecture", "villa", "bunglow"],
    ["flat scheme", "high-rise residential"],
    ["flat interiors", "interior architecture & fitout", "interiors"],
    ["pwd", "public works"],
    ["re-development", "redevelopment"],
  ] as any;

  for (const group of equivalences as string[][]) {
    const hasP = group.some((g) => pLower === g || pLower.includes(g));
    const hasS = group.some((g) => sLower === g || sLower.includes(g));
    if (hasP && hasS) return true;
  }

  // 4. Significant keyword matching
  const keywords = sLower.split(/[\s,&/-]+/).filter((w) => w.length > 2);
  return keywords.some((kw) => pLower.includes(kw));
}

/**
 * Small profile circle rendered before project name, color-coded by typology
 */
export function ProjectProfileCircle({
  typology,
  name,
  size = "md",
  className = "",
}: {
  typology?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const cfg = getTypologyConfig(typology);

  // Compute 1-2 letter initial for the project
  let initial = "";
  if (name && name.trim()) {
    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    initial = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();
  } else {
    initial = cfg.initials;
  }

  const sizeClasses = {
    xs: "w-4 h-4 text-[9px]",
    sm: "w-5 h-5 text-[10px]",
    md: "w-6 h-6 text-[10px]",
    lg: "w-8 h-8 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-bold text-white rounded-full shrink-0 shadow-2xs select-none ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: cfg.color }}
      title={`${cfg.name} • ${name || "Project"}`}
      aria-label={`${cfg.name} typology project`}
    >
      {initial}
    </span>
  );
}

/**
 * Typology Badge with identifying color styling
 */
export function TypologyBadge({
  typology,
  size = "sm",
  showIcon = true,
  className = "",
}: {
  typology?: string | null;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
  className?: string;
}) {
  const cfg = getTypologyConfig(typology);

  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.2 gap-1",
    sm: "text-[10px] px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-2xs ${cfg.badgeClass} ${sizeClasses[size]} ${className}`}
      title={`Architectural Typology: ${cfg.name}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.color }}
      />
      {showIcon && <Building2 className="w-2.5 h-2.5 shrink-0 opacity-75" />}
      <span className="truncate">{cfg.name}</span>
    </span>
  );
}

/**
 * Small standalone color dot indicator
 */
export function TypologyDot({
  typology,
  className = "",
}: {
  typology?: string | null;
  className?: string;
}) {
  const cfg = getTypologyConfig(typology);
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ${className}`}
      style={{ backgroundColor: cfg.color }}
      title={cfg.name}
    />
  );
}
