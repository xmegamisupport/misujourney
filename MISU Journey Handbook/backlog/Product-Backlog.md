# MISU Journey — Product Backlog

Version: 2.0

Owner: XMEGAMI Product Team

Last Updated: 15 July 2026

---

## Purpose

MISU Journey has entered the **Product Optimization** stage. Development is no longer organised as sequential Sprints (Sprint 004, 005, …). Instead, this backlog is the central register that feeds the optimization workflow.

## Product Optimization Workflow

```
Founder Experience Review
        ↓
Product Backlog        ← this document
        ↓
Priority Review
        ↓
Version Release
```

- **Founder Experience Review** surfaces issues, ideas, and decisions.
- Each becomes a **Product Backlog** item using the standard template below.
- **Priority Review** assigns Priority (P1/P2/P3) and a Target Version.
- **Version Release** groups prioritised items into a themed release.

## Version Numbering

Releases are versioned and themed, e.g.:

| Version | Theme |
|---|---|
| v3.0 | Body Progress MVP |
| v3.1 | Body Progress Experience Update |
| v3.2 | Customer Experience Improvements |

A backlog item's **Target Version** may be `Unassigned` until Priority Review places it in a release.

## Field Definitions

**Status** (lifecycle): `Backlog` → `Prioritised` → `Scheduled` → `In Progress` → `Released`. Also `Deferred` (accepted but parked) and `Rejected` (decided against).

**Priority:**
- **P1** — Critical / blocking or high business impact; address first.
- **P2** — Important; schedule into an upcoming version.
- **P3** — Nice-to-have / gradual; opportunistic.

**Category** (choose one): `Bug` · `UX Improvement` · `Product Decision` · `Future Feature` · `Technical Debt` · `Performance` · `Security`.

---

## Backlog Item Template

Copy this block for every new item.

```
## BL-XXX — <Title>

- **Backlog ID:** BL-XXX
- **Title:** <short title>
- **Status:** Backlog | Prioritised | Scheduled | In Progress | Released | Deferred | Rejected
- **Priority:** P1 | P2 | P3
- **Category:** Bug | UX Improvement | Product Decision | Future Feature | Technical Debt | Performance | Security
- **Description:** <what this item is, in one or two sentences>
- **Current Behaviour:** <how the system behaves today>
- **Expected Behaviour:** <how it should behave after the change>
- **Business Reason:** <why it matters — customer/coach/company value>
- **Affected Modules:** <modules / pages / files touched>
- **Dependencies:** <other backlog items, decisions, or prerequisites; "None" if independent>
- **Target Version:** <vX.Y or Unassigned>
- **Notes:** <implementation hints, known locations, constraints>
```

---

# Backlog Items

## BL-001 — Journey Naming Alignment

- **Backlog ID:** BL-001
- **Title:** Journey Naming Alignment
- **Status:** Backlog
- **Priority:** P3
- **Category:** UX Improvement
- **Description:** Replace generic Journey duration labels in the UI with the confirmed official Journey names and positioning.
- **Current Behaviour:** UI shows generic duration labels such as `30天习惯`, `30 天计划`, `60 天计划`, `90 天计划`.
- **Expected Behaviour:** UI shows the official names wherever Journey information is displayed:
  - 🌱 **30 Days — Kickstart Journey** — *"Every big transformation starts with a first step."*
  - 🌿 **60 Days — Momentum Journey** — *"Consistency creates momentum. Momentum creates results."*
  - 🌳 **90 Days — Transformation Journey** — *"True transformation happens when healthy habits become a lifestyle."*
- **Business Reason:** Consistent branding and positioning across the product reinforces the "build a healthier lifestyle" philosophy and makes each plan feel like a meaningful journey rather than a generic duration.
- **Affected Modules:** Registration, Dashboard, Body Progress, Coach UI, Admin UI, customer messages, and documentation (Product Bible, Handbook). Display text only.
- **Dependencies:** None. No database, migration, or business-logic changes — durations remain 30 / 60 / 90.
- **Target Version:** Unassigned (candidate for a Customer Experience Improvements release, e.g. v3.2).
- **Notes:** Apply gradually/opportunistically — no big-bang change. Known current locations: registration plan option `"30天习惯"` in `src/lib/goals/constants.ts` (`JOURNEY_PLAN_OPTIONS`); Body Progress record detail `"{n} 天计划"` in `src/app/customer/progress/body/history/[recordId]/page.tsx`.
