# API Surface

## Frontend to backend mapping

- `src/components/CVUploader.tsx`
  - `POST /api/cv/analyze`
- `src/components/JobBoard.tsx`
  - `POST /api/jobs/search`
- `src/components/DailyRecommendation.tsx`
  - `POST /api/jobs/daily-recommendation`
- `src/components/AIInsights.tsx`
  - `POST /api/jobs/recommendations`
  - `POST /api/jobs/salary-comparison`
  - `POST /api/jobs/cover-letter`
  - `POST /api/interview/start`
  - `POST /api/interview/respond`
  - `POST /api/goals/quiz`
- `src/components/LinkedInSimPopup.tsx`
  - `POST /api/jobs/linkedin-import`
- `src/components/TechnicalInterviewPractice.tsx`
  - `POST /api/interview/technical/questions`
  - `POST /api/interview/technical/evaluate`

## Backend notes

- `server.ts` contains API key checking plus Gemini-backed and fallback behavior
- Fallback helpers include CV parsing, job generation, recommendations, salary comparison, cover letters, LinkedIn import analysis, and interview helpers
- Contract changes should be implemented in both the route handler and the consuming component in one change

## Safe modification checklist

Before editing any `/api/*` behavior:
1. Find the route in `server.ts`
2. Find every frontend caller
3. Confirm the response payload shape
4. Check `src/types.ts` for shared interfaces
5. Keep error handling compatible with current caller expectations
