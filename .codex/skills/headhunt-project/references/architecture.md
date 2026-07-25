# Architecture

## Runtime split

- Frontend: React 19 SPA bootstrapped from `src/main.tsx`
- Backend: Express app in `server.ts`
- Build: Vite for client assets, esbuild for `server.ts`

## High-value files

- `src/App.tsx`: main stateful shell, tab layout, theme, XP, reminders, notifications
- `src/types.ts`: shared contracts
- `src/components/AIInsights.tsx`: recommendations, salary comparison, cover letter, interview, goals quiz
- `src/components/CVUploader.tsx`: CV upload and `/api/cv/analyze`
- `src/components/JobBoard.tsx`: aggregated job search and `/api/jobs/search`
- `src/components/TechnicalInterviewPractice.tsx`: technical interview question/evaluation flows
- `src/utils/emailAlertSystem.ts`: simulated digest email generation and config persistence
- `src/utils/notificationSystem.ts`: browser notification config, permission, synthesized sounds
- `src/utils/pdfGenerator.ts`: PDF export
- `server.ts`: all backend endpoints and Gemini/fallback orchestration

## State model

- Persistent browser state lives mainly in `localStorage`
- `App.tsx` owns profile, candidacies, notifications, XP, theme, and navigation state
- Child components mostly receive props and callbacks rather than owning canonical data

## Change hotspots

- Route contracts: `server.ts` plus direct fetch callers in `src/components/*`
- Shared types: `src/types.ts`
- Cross-cutting UX state: `src/App.tsx`

## Known tradeoffs

- `server.ts` is large and centralized, so narrow diffs are safer than broad refactors
- `App.tsx` is also large and acts as the orchestration layer for many features
- Many flows are simulated or fallback-driven; behavior may depend on both Gemini and local heuristics
