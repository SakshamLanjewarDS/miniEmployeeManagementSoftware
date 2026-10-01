# Component Inventory & Design Tokens

## Visual Identity: 100% DESIGN Studio
- **Aesthetic**: Warm architectural minimalism. Refined ivory/white/greige surfaces, charcoal typography, restrained olive accents (`#4B5320` / `#556B2F`), elegant subtle borders.
- **Typography**: DM Sans / Inter for crisp UI legibility; optional Cormorant Garamond for brand titles.
- **Micro-interactions**: Subtle transitions (150ms ease), status badges, clear focus rings, accessible contrast ratios (WCAG AA compliant).

## Core Component Hierarchy

### 1. Primitive UI Components (`src/components/ui/`)
- `Button`: Primary, Secondary, Outline, Danger, Ghost variants with loading spinners.
- `Input`, `Textarea`, `Select`: Accessible form fields with error messages and label pairings.
- `Badge`: Status chips for Task status, Project phase, Site geofence, and Review state.
- `Modal` / `Dialog`: Accessible overlay dialogs with ESC key handling and backdrop focus trapping.
- `Card`: Surface containers with border tokens.
- `Tabs`: Segmented controllers for Project detail tabs (Overview, Tasks, Team, Visits, Drawings, Finance).

### 2. Layout Components (`src/components/layout/`)
- `AppShell`: Persistent sidebar, top header, breadcrumb navigation, tenant workspace selector, user profile menu.
- `Sidebar`: Role-aware navigation links (My Tasks, Projects, Site Visits, Clients & Consultants, Team, Finance, Settings).
- `Topbar`: Global search, workspace indicator, notification badge, current user profile.
- `MobileNavigation`: Accessible drawer and bottom navigation bar for site field workers.

### 3. Shared Data Components (`src/components/shared/`)
- `DataTable`: Responsive table with sorting, pagination, and empty/loading states.
- `FilterBar`: Search input, multi-select dropdown filters, date range selectors.
- `KanbanBoard`: Multi-column drag/drop or click-to-move board for task workflows.
- `EmptyState`: Contextual empty illustrations with action prompts.
- `ErrorState`: Friendly error boundary fallbacks with retry actions.

### 4. Domain Feature Components (`src/features/*/components/`)
- `tasks/TaskCard`, `tasks/TaskDetailModal`, `tasks/TaskWorkflowActions`
- `visits/VisitCheckInCard`, `visits/GeofenceBadge`, `visits/VisitReportModal`
- `documents/DrawingRevisionList`, `documents/UploadRevisionDialog`
- `finance/BudgetOverviewCard`, `finance/FeeMilestoneTable`, `finance/ExpenseList`
- `employees/EmployeeForm`, `employees/DeactivateConfirmModal`
