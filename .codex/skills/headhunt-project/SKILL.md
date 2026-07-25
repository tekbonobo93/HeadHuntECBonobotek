---
name: headhunt-project
description: Project-specific workflow for TalentoMatch IA. Use when Codex needs to modify or analyze this repository's React frontend, single-file Express backend, Gemini-powered flows, CV parsing, job search, interview simulation, notifications, email digest simulation, or shared TypeScript contracts. Trigger for feature work, bug fixes, refactors, endpoint changes, or architecture review inside this repo.
---

# Headhunt Project

Use this skill to work safely in TalentoMatch IA.

## Workflow

1. Inspect the code graph first.
2. Confirm whether the change is frontend-only, backend-only, or contract-crossing.
3. Read the specific files that own the flow before editing.
4. Keep diffs narrow in `src/App.tsx` and `server.ts`.
5. Validate with `npm run lint` and, when behavior changed materially, `npm run build`.

## Graph-First Discovery

Use `codebase-memory-mcp` before grep.

Project id:
- `C-Users-jedan-proyectos-HeadHuntECBonobotek`

Preferred order:
1. `search_graph`
2. `trace_path`
3. `get_code_snippet`
4. `query_graph`
5. `search_code` for literals like `/api/...`, `localStorage` keys, copy text, or CSS classes

If the index is stale or absent, re-index with persistence enabled.

## Change Routing

Use this routing before editing:

- CV ingestion/profile extraction:
  - read `src/components/CVUploader.tsx`
  - read `src/components/CVPreviewVerifier.tsx`
  - read `src/types.ts`
  - read `/api/cv/analyze` in `server.ts`
- Job search and compatibility:
  - read `src/components/JobBoard.tsx`
  - read `src/components/PreferencesForm.tsx`
  - read `src/types.ts`
  - read `/api/jobs/search` in `server.ts`
- Recommendations/interview flows:
  - read `src/components/AIInsights.tsx`
  - read `src/components/DailyRecommendation.tsx`
  - read `src/components/TechnicalInterviewPractice.tsx`
  - read matching `/api/*` handlers in `server.ts`
- Notifications/email simulation:
  - read `src/App.tsx`
  - read `src/components/NotificationCenter.tsx`
  - read `src/components/EmailAlertsWidget.tsx`
  - read `src/utils/notificationSystem.ts`
  - read `src/utils/emailAlertSystem.ts`
- Shared data contracts:
  - read `src/types.ts` first
  - then inspect all callers before changing interfaces

## High-Risk Areas

- `src/App.tsx` is the orchestration root. Avoid broad state rewrites unless the task explicitly requires it.
- `server.ts` is a large single-file backend. Scope route changes tightly.
- `localStorage` keys are part of runtime behavior. Search before renaming.
- Endpoint payload changes must be updated in frontend callers in the same change.
- Keep Spanish product copy unless localization is requested.

## References

Read these files when needed:
- `references/architecture.md` for module boundaries and hotspots
- `references/api-surface.md` for frontend/backend endpoint mapping

## Validation

Use this minimum bar:
- `npm run lint`
- `npm run build` when shared types, route contracts, build configuration, or runtime behavior changed

If validation is skipped, state that explicitly.
