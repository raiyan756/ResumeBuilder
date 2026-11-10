# Verification evidence

Verified on 9 November 2026. This report distinguishes implementation, actual browser observations, API integration tests and remaining manual checks.

## End-to-end story

A user creates or imports a resume, edits it in React, saves through the .NET controller/service/repository into PostgreSQL, obtains structured Gemini suggestions, applies chosen changes, previews the resume and exports through the browser print workflow.

| Boundary | Result | Evidence |
| --- | --- | --- |
| Frontend production build | Passed | TypeScript check and Vite build succeeded in the Node 24 Docker build |
| Backend production build | Passed | .NET 10 Docker publish succeeded |
| Backend regression suite | Passed | 32 checks: CRUD service behavior, nested validation, simulated labeling, PDF limits/signature, provider JSON schema, exclusion of contacts, malformed/truncated responses, rate limits and timeout handling |
| FE proxy -> API -> PostgreSQL | Passed | Docker integration runner passed 23 checks in demo mode |
| Restart persistence | Passed | Synthetic draft retained title and summary after database/backend restart; test passed again after the proxy fix without manual intervention |
| Browser draft workflow | Passed | Opened fictional sample, saved it, applied a simulated summary, saved again, returned to dashboard and reopened persisted content |
| Mobile view | Passed | Inspected editor and live preview at 390 x 844; responsive tabs and horizontally scrolling section navigation work |
| Real Gemini access | Passed | Supplied key accepted; real review endpoint returned HTTP 200, provider Gemini, isSimulated false and specific suggestions/questions |
| Real PDF extraction | Passed | Multipart upload of a synthetic one-page PDF through frontend /api proxy returned HTTP 200 and correctly extracted Jordan Example, work experience and Jira/project planning/documentation skills |
| Secrets | Passed | .env ignored by Git; only backend environment receives key; root .env lies outside both Docker build contexts |
| OpenAPI | Passed | /openapi/v1.json served OpenAPI 3.1.1 |
| PDF export | Implemented; final dialog not verified | Export instructions displayed correctly. IAB print invocation did not expose a printable result. Native Chrome check was stopped by Computer Use because it could not confidently determine the current URL. No exported PDF was inspected. |

## Issues found and fixed

1. Port 8080 was already used by SchoolAdmissionSystem. This app now uses backend port 8088 and frontend port 5173; existing containers were left intact.
2. Nginx initially cached the backend's container IP. Restarting the containers changed that IP and caused 502 responses. The proxy now resolves backend via Docker DNS with a five-second cache; repeat restart testing passed.
3. EF design and runtime transitive versions differed in the regression project. Explicit EF Relational 10.0.14 alignment removed the build warnings.
4. Google rejected the old default model for this new user despite listing it in the models endpoint. Its error recommended gemini-3.5-flash-lite. The configuration now uses that model, and live review/import calls succeeded.

## Remaining manual checks

- In normal Chrome/Edge, open a saved resume, choose Export PDF -> Continue to PDF -> Save as PDF, select A4 and disable headers/footers. Inspect pagination on a long resume as well as the sample.
- A successful real PDF extraction was tested at the HTTP boundary. The complete browser file-picker-to-autofill interaction was not repeated after the key was added because Computer Use had ended.
- AI output must still be checked by a person for factual accuracy. The app deliberately requires explicit Apply before changing a resume.

The named sample resume retained in the workspace is fictional. The integration runner removes its own synthetic drafts after checking them. No real CV was sent during testing.
