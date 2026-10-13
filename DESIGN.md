# 100% DESIGN Studio OS — Design System & UI/UX Design Manual

**Design System Name:** Studio Blueprint Design System (SBDS)  
**Version:** `3.3.0` (Production Enterprise Ready — Architectural Precision Tokens, Container Queries, Two-Way Live Sync Badges, Mobile Field Companion, Owner Decision Inbox, Extension Hydration Resilience & Blueprint Transmittal Print Standards)  
**Target Platform:** Web (Desktop Studio Workstation & Mobile Field Companion)  
**Framework:** React 19, Next.js 16 (App Router with Webpack mode), Tailwind CSS v4, Lucide Icons  
**Primary CSS Entrypoint:** [`src/app/globals.css`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/globals.css)

---

## 1. Design Philosophy & Vision

Architectural and interior design studios live by mathematical precision, geometric clarity, and spatial hierarchy. Generic corporate dashboard templates feel alien to practitioners who work with millimeter tolerances, blueprint lines, and physical construction sites.

The **100% DESIGN Studio OS Design System** is anchored in four foundational tenets:

1. **Architectural Blueprint Aesthetic:**  
   Clean canvas surfaces, crisp 1px borders, subtle ice-blue tints, and architectural blueprint cobalt accents. Rather than heavy, muddy drop shadows, spatial depth is established through crisp mathematical border lines (`#E2E6F0` and `#A8B1CE`) and layered white/ice surface planes.
2. **High Information Density with Zero Clutter:**  
   Architects manage dozens of drawing sheets, checklists, snag items, and coordinates simultaneously. Interfaces provide high data density through tabular numerals, compact pill badges, and structured modular panels without inducing cognitive overload.
3. **Ergonomic Studio & Field Duality:**  
   The interface seamlessly bridges two distinct environments:
   - **Studio Workstation (Large Displays):** Dual-monitor setups, expansive multi-column task grids, multi-pane drawing viewers, docked billable timers, and the centralized Owner Decision Inbox.
   - **Job Site Field Companion (Mobile Devices):** High-contrast outdoor legibility, thumb-friendly tap targets ($\ge 44\text{px}$), hands-free voice dictation buttons, and instant 1-click GPS site check-in.
4. **Governed State Integrity & Four-Eyes Transparency:**  
   Every state transition (e.g. Draft $\to$ Active, In Progress $\to$ Checking, Approved $\to$ GFC Release) visually communicates its governance rules. Submitter actions, reviewer locks, blocker alerts, and verification badges are prominently displayed to eliminate ambiguity.

---

## 2. Design Tokens & Color Palette

The color system uses CSS custom properties configured in [`src/app/globals.css`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/globals.css) with high-contrast accessibility (WCAG 2.1 AA).

### 2.1 Surfaces & Canvas Tokens

| Token Variable | HEX Value | Role / Usage |
|---|---|---|
| `--background` | `#F8F9FD` | Master viewport canvas (subtle architectural cool grey) |
| `--surface` | `#FFFFFF` | Primary card and modal panel surface |
| `--surface-alt` | `#F2F4FF` | Secondary container, nested tables, drawer backgrounds |
| `--surface-border` | `#E2E6F0` | Standard divider and container perimeter border (1px) |
| `--surface-border-strong` | `#A8B1CE` | Active control border, scrollbar thumb, hover border |

### 2.2 Typography & Neutral Tokens

| Token Variable | HEX Value | Role / Usage |
|---|---|---|
| `--foreground` | `#1F1F1F` | Primary headings, table text, high-emphasis values |
| `--foreground-muted` | `#696E82` | Secondary labels, descriptions, timestamps, metadata |
| `--foreground-subtle` | `#8A92A6` | Placeholder text, inactive icons, helper hints |

### 2.3 Brand Architectural Palette

| Token Variable | HEX Value | Role / Usage |
|---|---|---|
| `--color-primary` | `#5A81FA` | Architectural Blueprint Blue (primary action, focus ring) |
| `--color-primary-hover` | `#426EE8` | Primary button hover state |
| `--color-primary-dark` | `#375BCB` | Active pressed button state, high-emphasis accents |
| `--color-primary-light` | `#F2F4FF` | Primary badge background, active navigation tab pill |
| `--color-primary-border` | `#CEDEFF` | Border for primary containers and active selection pills |
| `--color-secondary` | `#2C308D` | Deep Studio Navy (sidebar header, leadership accents) |
| `--color-secondary-hover` | `#22256E` | Secondary button hover state |
| `--color-accent-ice` | `#CEDEFF` | Blueprint ice blue container fill |
| `--color-accent-whisper` | `#F2F4FF` | Soft tinted card headers and table row alternations |

### 2.4 Semantic State Palette

| Semantic Role | Background | Text / Icon | Border | Usage |
|---|---|---|---|---|
| **Success / Approved / Completed** | `#ECFDF5` (`emerald-50`) | `#059669` (`emerald-600`) | `#A7F3D0` (`emerald-200`) | Completed deliverables, approved submissions, live 2-way sync active badge |
| **Warning / Checking / Review** | `#FFFBEB` (`amber-50`) | `#D97706` (`amber-600`) | `#FDE68A` (`amber-200`) | `IN_REVIEW` status, pending Four-Eyes reviews, read-only sync badge |
| **Danger / Blocker / Overdue** | `#FEF2F2` (`rose-50`) | `#E11D48` (`rose-600`) | `#FECDD3` (`rose-200`) | Active blockers, overdue tasks, auto-rejected 24h rule badge, soft-deleted rows |
| **Info / Scheduled / Started** | `#EFF6FF` (`blue-50`) | `#2563EB` (`blue-600`) | `#BFDBFE` (`blue-200`) | In-progress work, scheduled site visits, clarifications, extension requests |
| **Draft / Inactive / Todo** | `#F3F4F6` (`gray-100`) | `#4B5563` (`gray-600`) | `#E5E7EB` (`gray-200`) | Draft schemes, unassigned checklist items, archived records |

---

## 3. Typography System

The primary typeface is **Inter** (`var(--font-sans)`), supported by system font fallbacks (`-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`). 

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### 3.1 Type Scale & Application Hierarchy

| Scale Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display Heading** | `28px` / `1.75rem` | Bold (`700`) | `1.2` | Workspace Welcome, Major Section Overviews |
| **Page Heading (`h1`)** | `22px` / `1.375rem` | Semibold (`600`) | `1.25` | Project Title, Dashboard Header, Inspection Title |
| **Section Heading (`h2`)** | `18px` / `1.125rem` | Semibold (`600`) | `1.3` | Card Section Header, Tab Category, Dossier Heading |
| **Subheading (`h3`)** | `15px` / `0.9375rem` | Medium (`500`) | `1.4` | Modal Titles, Deliverable Titles, Grouping Labels |
| **Body Regular** | `14px` / `0.875rem` | Normal (`400`) | `1.5` | Standard descriptions, minutes, checklist text |
| **Body Medium** | `14px` / `0.875rem` | Medium (`500`) | `1.5` | Form input values, table cells, assignee names |
| **Caption / Meta** | `12px` / `0.75rem` | Normal (`400`) | `1.4` | Timestamps, coordinates, badge labels, helper hints |
| **Micro Badge** | `11px` / `0.6875rem` | Semibold (`600`) | `1.0` | Status pills, drawing revision stamps ($R_0, R_1$), counters |

### 3.2 Tabular Numerals for Architectural Measurements
All financial sums, GPS latitude/longitude coordinates, square-meter areas, and CAD revision numbers use tabular figures (`font-variant-numeric: tabular-nums` or Tailwind `tabular-nums`) to maintain vertical column alignment in tables and financial ledgers.

---

## 4. Spacing, Geometry & Spatial Grid

### 4.1 4px Mathematical Spacing Scale
All margins, paddings, and flex gaps adhere strictly to multiples of 4px:
- `4px` (`gap-1`): Micro badge spacing, icon-to-label gaps
- `8px` (`gap-2`): Input padding, pill badge padding, checklist row gap
- `12px` (`gap-3`): Form field vertical spacing, compact list item gap
- `16px` (`gap-4`): Standard card interior padding, grid gap
- `24px` (`gap-6`): Modal padding, section separation gap
- `32px` (`gap-8`): Primary dashboard row spacing, canvas margins

### 4.2 Rounded Geometry Scale
- `rounded-md` (`6px`): Input fields, buttons, small status pills
- `rounded-lg` (`8px`): Standard cards, dropdown menus, table containers
- `rounded-xl` (`12px`): Modal dialogs, floating workstation docks, drawers
- `rounded-2xl` (`16px`): High-emphasis KPI cards, live integration banners
- `rounded-full` (`9999px`): Avatars, priority pills, timer status indicators

---

## 5. Layout Architecture & App Shell

The application shell provides ergonomic spatial hierarchy across 3 interconnected regions:

```
┌────────────────────────────────────────────────────────────────────────┐
│ AppTopbar: Tenant Switcher | Search | Timer Dock | Notifications | Profile │
├──────────────┬─────────────────────────────────────────────────────────┤
│ AppSidebar   │ Main Content Canvas                                     │
│ (276px wide) │                                                         │
│              │ ┌─────────────────────────────────────────────────────┐ │
│ • Dashboard  │ │ Page Header: Title + Context + Primary Action CTA   │ │
│ • Projects   │ ├─────────────────────────────────────────────────────┤ │
│ • Tasks      │ │ Live Integration Banner (2-Way Sheet Write-Back)    │ │
│ • Sites      │ ├─────────────────────────────────────────────────────┤ │
│ • Drawings   │ │ Task Grid Region (@container)                       │ │
│ • Leaves     │ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│ • Finance    │ │ │ Task Card 1 │ │ Task Card 2 │ │ Task Card 3 │     │ │
│ • Inbox      │ │ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│ • Team       │ └─────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────┘
```

### 5.1 Responsive Container Queries (`.task-grid-region`)
Rather than relying solely on global viewport media queries, the deliverable grid uses modern CSS Container Queries (`container-type: inline-size`):

```css
.task-grid-region {
  container-type: inline-size;
}

.task-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

@container (min-width: 720px) {
  .task-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (min-width: 1120px) {
  .task-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

---

## 6. Core Component Catalog & Patterns

### 6.1 Live Google Sheets Sync Status Bar
* **Visual States:**
  - `2-WAY LIVE WRITE-BACK ACTIVE`: Emerald pill badge with an animated pulsing indicator (`animate-pulse`). Displayed when the Apps Script webhook is connected and transmitting real-time updates.
  - `READ-ONLY (CONNECT 2-WAY WEBHOOK)`: Amber pill badge displayed when sheet data is ingested via CSV export but live outbound write-back is awaiting webhook configuration.
* **Controls:** 
  - `Two-Way Script`: Opens the Apps Script setup modal with 1-click snippet copy and webhook URL connector.
  - `Sync Live Sheet`: Dispatches an on-demand re-sync using the smart Indian date parser (`DD/MM/YYYY`) with spin animations during background processing.

### 6.2 Task Cards ([`TaskCard.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/components/tasks/TaskCard.tsx))
- **Header:** Project code tag (`PRJ-01`), task priority pill (`HIGH`, `MEDIUM`), and action menu.
- **Body:** Deliverable title (`font-medium text-foreground`), multi-assignee avatar stack, checklist completion progress bar (`X of Y items complete`), and active blocker flag (if any).
- **Footer:** Due date indicator with visual color-coded urgency (green $\to$ amber $\to$ red), and status selector dropdown.

### 6.3 Task Card Actions & Status Dropdown ([`TaskCardActions.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/components/tasks/TaskCardActions.tsx))
- **Status Dropdown:** 5-state normalized workflow selector:
  - `TODO` (`NOT_STARTED`)
  - `STARTED` / `ONGOING` (`IN_PROGRESS`)
  - `CHECKING` (`IN_REVIEW`)
  - `COMPLETED` (`COMPLETED`)
- **Direct Completion:** Supports direct selection of `COMPLETED` when employee self-completion is active.
- **Quick Controls:** View Details, Edit Deliverable, Delegate, Request Changes, Delete.

### 6.4 Employee Workstation Dashboard ([`EmployeeDashboardView.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/w/[workspaceSlug]/(app)/dashboard/employee/EmployeeDashboardView.tsx))
- **Daily Focus Mode:** High-impact hero widget featuring the employee's primary objective with timer trigger, "Submit for Review", and direct "Mark Complete" shortcuts.
- **Active Tasks & Deliverables:** Comprehensive table/list with instant 1-click status transitions, blocker alerts, and checklist expanders.
- **Velocity & Timer Metrics:** Live tracker of hours logged today, task turnaround rate, and active Pomodoro countdown.

### 6.5 Owner Decision Inbox ([`src/app/w/[workspaceSlug]/(app)/inbox`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/w/[workspaceSlug]/(app)/inbox))
- **Unified Leadership Queue:** Consolidated review hub displaying pending submissions, deadline extensions, scope change requests, profile updates, and site visit logs.
- **Four-Eyes Enforcement Banner:** Contextual notice disabling self-approval when the active user submitted the request.
- **1-Click Approvals:** Instant decision modal with feedback commentary.

### 6.6 Geofence Radar & SVG Site Plot Canvas ([`VisitsClientView.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/w/[workspaceSlug]/(app)/visits/VisitsClientView.tsx))
- **Spatial Status Pill:** Real-time distance evaluation (`WITHIN_RADIUS` in emerald, `OUTSIDE_RADIUS` in rose).
- **SVG Vector Radar:** Dynamic radar circle displaying site boundary, GPS accuracy halo, and check-in coordinates.
- **Hands-Free Speech Dictation:** Microphone toggle with live audio wave pulsing and architectural term autocorrect.

---

## 7. Interaction Patterns & Hydration Resilience

### 7.1 Browser Extension Hydration Resilience
To eliminate React hydration warnings (`fdprocessedid` mismatches) caused by third-party browser extensions (password managers, autofillers, 1Password, Bitwarden):
* All interactive `<button>`, `<input>`, and `<select>` elements declare `suppressHydrationWarning`.
* Top-level layout headers declare selective window error suppression for non-app extension scripts (`share-modal.js`, `chext_driver.js`).

### 7.2 Zero Touch Lag (`touch-action: manipulation`)
To ensure rapid responsiveness on tablets and mobile phones on construction sites, all interactive tags have touch delay removed:
```css
a, button, input, select, textarea {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
```

### 7.3 Custom Architectural Scrollbars
Scrollbars are styled to be minimal, unobtrusive, and color-matched to the architectural palette:
```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--surface-border-strong);
  border-radius: 3px;
}
```

---

## 8. Print & Physical Transmittal Styles (`@media print`)

Architectural handovers and site inspection reports must be printed for municipal submissions, client binders, or physical site file boxes. 

All views implement dedicated `@media print` rules:
- **Clean Background:** Removes all dark mode fills, backgrounds, sidebars, topbars, and action buttons.
- **High-Resolution Typography:** Forces crisp black text (`#000000`) and prints vector logos cleanly.
- **Page Break Control:** `page-break-inside: avoid` on drawing tables, snag registers, and sign-off signature blocks to prevent awkward mid-signature page tears.
- **Official Stamp Block:** Formats formal client acknowledgement and partner inspection sign-off blocks formatted for physical wet signatures and studio seal stamps.

---

## 9. Design System Summary Specification Table

| Category | Standard Specification |
|---|---|
| **Primary Hue** | Blueprint Royal Blue (`#5A81FA`) |
| **Secondary Hue** | Studio Navy (`#2C308D`) |
| **Surface Hue** | Crisp White (`#FFFFFF`) / Ice Tint (`#F8F9FD`) |
| **Border Tone** | Geometric Slate (`#E2E6F0`) |
| **Base Font** | Inter (Variable / Regular, Medium, Semibold, Bold) |
| **Numeric Font** | Inter Tabular Numbers (`tabular-nums`) |
| **Grid Engine** | CSS Container Queries (`@container`) + CSS Grid |
| **Touch Optimization** | `touch-action: manipulation` (0ms delay) |
| **Hydration Resilience** | `suppressHydrationWarning` on all interactive form & action tags |
| **Live Sync UX** | Dual-state status badges (Pulsing 2-Way Write-Back vs Read-Only) |
| **Governance UX** | Four-Eyes locks, Snapshot Version Badges & Employee Self-Completion Mode |
| **Print Output** | `@media print` formatted for official physical transmittal dossiers |
