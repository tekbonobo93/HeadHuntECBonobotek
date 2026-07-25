# AGENTS.md

## Project Scope

TalentoMatch IA is a TypeScript monorepo-in-one-folder:
- `src/` contains the React 19 + Vite SPA.
- `server.ts` contains the Express backend and all AI-facing HTTP endpoints.
- Most user state is browser-side and persisted in `localStorage`.

## Code Discovery

Prefer `codebase-memory-mcp` over grep for code discovery.

Use this project id:
- `C-Users-jedan-proyectos-HeadHuntECBonobotek`

Default discovery order:
1. `search_graph`
2. `trace_path`
3. `get_code_snippet`
4. `query_graph`
5. `search_code` only for literals, fetch paths, CSS classes, or non-structural text

If the graph is stale or missing, re-index with:
- `index_repository(repo_path="C:\\Users\\jedan\\proyectos\\HeadHuntECBonobotek", mode="full", persistence=true)`

## Architecture Notes

- `src/App.tsx` is the main composition root and holds cross-cutting state for profile, candidacies, notifications, XP, theme, and tab navigation.
- `src/types.ts` is the contract source of truth for `UserProfile`, `JobOffer`, `Candidacy`, notifications, goals, and daily recommendations.
- `src/components/CVUploader.tsx` sends CV data to `/api/cv/analyze` and hands reviewed output to `CVPreviewVerifier`.
- `src/components/JobBoard.tsx` calls `/api/jobs/search` and contains client-side result refinement.
- `src/components/AIInsights.tsx` is the main consumer of recommendation, salary, interview, quiz, and cover-letter endpoints.
- `src/utils/notificationSystem.ts`, `src/utils/emailAlertSystem.ts`, and `src/utils/pdfGenerator.ts` hold reusable browser-side utilities.
- `server.ts` is a single-file backend. Keep route edits narrow and avoid accidental regressions across unrelated endpoints.

## API Surface

The backend currently exposes these main routes:
- `/api/cv/analyze`
- `/api/jobs/search`
- `/api/jobs/daily-recommendation`
- `/api/jobs/salary-comparison`
- `/api/jobs/linkedin-import`
- `/api/jobs/cover-letter`
- `/api/jobs/recommendations`
- `/api/interview/start`
- `/api/interview/respond`
- `/api/goals/quiz`
- `/api/interview/technical/questions`
- `/api/interview/technical/evaluate`

When changing a route:
- update the matching frontend fetch caller in `src/components/*`
- preserve the existing response shape unless the caller is updated in the same change
- prefer additive changes over contract-breaking changes

## Working Rules

- Preserve Spanish UX copy unless the user asks for localization changes.
- Treat `localStorage` keys as part of the app contract. Search before renaming any key.
- Avoid introducing new global state stores unless the change is large enough to justify migrating away from `App.tsx`.
- When editing AI flows, inspect both the frontend fetch caller and the fallback logic in `server.ts`.
- When editing notifications or reminders, review both `App.tsx` and `src/utils/notificationSystem.ts`.
- When editing CV or profile flows, review `CVUploader`, `CVPreviewVerifier`, `UserProfileView`, and `src/types.ts`.

## Validation

Minimum validation for non-trivial changes:
- `npm run lint`
- `npm run build` when the change affects frontend, server bundling, or shared types

For documentation-only changes, validation can be limited to targeted file review.
