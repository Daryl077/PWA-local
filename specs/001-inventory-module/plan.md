# Implementation Plan: Inventory Module

**Branch**: `001-inventory-module` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `./spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

The Inventory Module provides category and product management, batch‑level stock tracking with expiration dates, PEPS‑based stock decrementation, and configurable expiration alerts. The technical approach uses a TypeScript/React front‑end, Dexie/IndexedDB for offline persistence, Zod for schema validation, and Vitest for testing.

## Technical Context

**Language/Version**: TypeScript (compatible with React 19)

**Primary Dependencies**: React 19, Vite, Tailwind CSS, Dexie, Zod, vite-plugin-pwa

**Storage**: IndexedDB via Dexie (local‑only)

**Testing**: Vitest + Testing Library

**Target Platform**: Web browsers (desktop & mobile) as an installable PWA

**Project Type**: Front‑end web application (no backend)

**Performance Goals**: UI interactions ≤ 100 ms, data queries ≤ 200 ms, offline operation guaranteed

**Constraints**: Must work offline, no external services, data stored locally, security by default (owner/seller roles)

**Scale/Scope**: Up to ~5 000 products and 20 000 batches, suitable for a typical local liquor store

## Constitution Check

All core principles (I–VI) are satisfied:
- Local‑First PWA (offline operation)
- Local Data Persistence (IndexedDB/Dexie)
- Deterministic Offline Caching (service worker)
- Installable PWA (manifest)
- Modular Architecture (feature modules)
- Security by Default (role‑based permissions)

No violations; gates pass.

## Project Structure

- **Contract updates**: `src/contracts/services.ts` will be minimally updated to add `userId` fields to `receiveLot` and `registerWaste`, introduce `adjustStock`, and change `listExpiringLots` to return a plain array (no `Result`).
- **Action update**: a new action `register_waste` will be added to the `Action` enum and permission table.
- **Task separation**: updating the contracts and permissions will be a small, isolated task before any implementation work.
- **Testing note**: no empty `__tests__` directories will be created now; tests will be added together with the first domain rule implementation.

## Project Structure

### Documentation (this feature)

```text
specs/001-inventory-module/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (not created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── inventory.ts        # Interface definitions for inventory entities
├── features/
│   ├── auth/
│   ├── system/
│   └── inventory/
│       ├── domain/
│       ├── ui/
│       └── index.ts
├── storage/
│   └── dexie implementation
├── shared/
│   └── common UI components
```

**Structure Decision**: Single‑project front‑end application using feature‑based modules under `src/features`. The inventory feature follows the established pattern of domain and UI separation.

## Complexity Tracking

> No complexity tracking required; all design decisions stem from existing project conventions and constitution.
