# 100% DESIGN Studio OS — Employee Performance Metric Dictionary

**Document ID:** PERF-03-METRIC-DICT  
**Version:** 3.4.0  
**Scope:** Studio Practice Employee Performance Module (`/w/[workspaceSlug]/employee-performance`)

---

## 1. Principles of Explainable Performance

1. **No Opaque Scoring:** The system does not generate arbitrary single-number productivity scores or punitive gamified leaderboards.
2. **Cohort-Based Analysis:** Metrics evaluate distinct cohorts (e.g. deliverables due within the selected period) rather than conflating active workload with historical outcomes.
3. **Four-Eyes Integrity:** Self-completed operational work is strictly distinguished from independently reviewed and approved governed deliverables.
4. **Leave & Capacity Fairness:** Approved leave and studio holidays reduce scheduled capacity; they are never counted as employee underperformance or unproductivity.
5. **No Double Counting:** Multi-assignee deliverables attribute shared participation unless distinct checklist ownership is recorded.

---

## 2. Core Metric Specifications

### Metric 1: Assigned Work
- **Definition:** The count of unique deliverable assignment events occurring within the selected evaluation period.
- **Source Record:** `TaskAssignment` records created within `[periodStart, periodEnd)`.
- **Numerator:** Distinct task assignment instances created in period.
- **Denominator:** N/A (Volume count).
- **Inclusion Rules:** Active and inactive employees in the selected period.
- **Exclusion Rules:** Assignments deleted or cancelled prior to evaluation cutoff.

---

### Metric 2: Completed Work
- **Definition:** The count of distinct deliverables reaching final accepted completion status during the selected period.
- **Source Record:** `Task` where `status = 'COMPLETED'` and `completionDate` falls within `[periodStart, periodEnd)`.
- **Sub-Categories:**
  - *Governed Completion:* Completed via four-eyes independent review approval (`reviewTaskSubmission` or `transitionTaskStatus` with audit reason).
  - *Operational Completion:* Operational self-completed tasks (`SELF_COMPLETION_ALLOWED`).
- **Reopen Rule:** If a deliverable is reopened and subsequently re-completed, it is counted exactly once in the period of final acceptance.

---

### Metric 3: Due Work and On-Time Delivery Rate
- **Definition:** Percentage of deliverables with an approved deadline in the period that were successfully completed on or before that deadline.
- **Cohort Basis:** Deliverables with `dueDate` in `[periodStart, periodEnd)`.
- **Formula:**
  $$\text{On-Time Delivery Rate} = \frac{\text{Eligible Due Items Completed on or before Approved Deadline}}{\text{Eligible Due Items Whose Approved Deadlines Have Elapsed}} \times 100\%$$
- **Numerator:** Count of cohort deliverables completed with `completionDate <= approvedDeadline`.
- **Denominator:** Count of cohort deliverables whose `approvedDeadline <= min(periodEnd, now)`.
- **Handling of Extensions:** Approved deadline extensions are recognized; historical lateness is not silently rewritten, but evaluation respects the approved revised deadline.
- **Incomplete Overdue:** Overdue incomplete items remain visible in the denominator, properly reflecting missed milestones. Future-due items within the period are not counted as failures.

---

### Metric 4: Overdue Workload & Aging Bands
- **Definition:** Open, non-completed deliverables whose current approved deadline has elapsed as of the period cutoff.
- **Aging Bands:**
  - `1 – 3 Days Overdue`
  - `4 – 7 Days Overdue`
  - `8 – 14 Days Overdue`
  - `15+ Days Critical Overdue`
- **Source Record:** `Task` with `status IN ('NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED')` and `dueDate < periodEnd`.

---

### Metric 5: First-Pass Approval Rate
- **Definition:** The percentage of deliverable submissions approved on their very first review cycle without requiring changes or corrections.
- **Cohort Basis:** Submissions where `version = 1` submitted and decided within the period.
- **Formula:**
  $$\text{First-Pass Approval Rate} = \frac{\text{First Submissions Approved}}{\text{Total First Submissions Decided}} \times 100\%$$
- **Pending Exclusion:** Submissions currently pending review (`status = 'PENDING'`) are excluded from the denominator to avoid penalizing employees for reviewer delays.

---

### Metric 6: Rework & Correction Rate
- **Definition:** The proportion of deliverable submissions where revisions were requested by leadership or client changes.
- **Source Record:** `TaskSubmission` where `status = 'CHANGES_REQUESTED'`.
- **Classification:**
  - *Technical/Quality Revision:* Deficiencies in drafting, specifications, or coordination.
  - *Client Scope Change:* Revisions prompted by approved `ProjectChangeRequest` (not categorized as employee drafting error).

---

### Metric 7: Turnaround & Cycle Time
- **Definition:** The elapsed time required for work to progress from initiation to submission, and from submission to leadership decision.
- **Components:**
  - *Employee Working Cycle Time:* Median elapsed hours from assignment start to submission.
  - *Reviewer Turnaround Time:* Median elapsed hours from submission to leadership decision.
- **Metric Presentation:** Median hours/days (mitigates outlier distortion).

---

### Metric 8: Blockers & Dependency Impediments
- **Definition:** Incidents where deliverable progress was halted due to external dependencies, client decisions, or site issues.
- **Source Record:** `Task` where `status = 'BLOCKED'` or `TaskActivityHistory` with blocker logs.
- **Metrics Tracked:** Active blocker count, average blocker duration, and responsible next action.

---

### Metric 9: Capacity & Effort Utilization
- **Definition:** Comparison between available working hours, allocated estimated effort, and logged active timer time.
- **Scheduled Hours:** 8.0 hours/day $\times$ working days in period (excluding weekends).
- **Available Hours:** Scheduled hours minus approved paid/unpaid leave and official studio holidays.
- **Allocated Hours:** Sum of `estimatedHours` on assigned deliverables in the period.
- **Actual Hours:** Sum of billable/logged timer session hours (`TaskTimerSession`).

---

### Metric 10: Contribution Context & Mix
- **Definition:** Qualitative distribution of assigned work across project typologies, priorities, and complexity tiers.
- **Breakdown:** High vs Medium vs Low priority; Residential vs Commercial vs Hospitality; Schematic vs Working Drawings vs Site Coordination.
- **Purpose:** Prevents misleading comparisons between unlike architectural roles (e.g. Senior Project Architect vs 3D Visualizer).

---

## 3. Data Representation Standards

| Condition | Display Rule | Prohibited Behavior |
| :--- | :--- | :--- |
| Zero items due in period | Display `—` or `No due items` with sample size `(0/0)` | Fabricating `0%` or `100%` |
| Pending first review | Display `Pending Review` with count | Counting as failed first-pass review |
| Approved leave during period | Explicitly deduct from scheduled capacity | Counting as low productivity or idle time |
| Shared multi-assignee task | Display as `Shared Deliverable (N members)` | Awarding each assignee 100% standalone credit |
