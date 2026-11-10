# PM Circle Resume Builder implementation plan

## Goal and scope

Build a small interview prototype with two entry points: enter details manually, or upload an existing PDF and review the extracted details. Both lead to the same editable resume, AI suggestions, role-specific improvements, preview, and PDF export.

Work requested now: prepare this FE + BE plan, implement the backend, then complete the React frontend and verify the whole application through Docker Compose.

## Technology and structure

- `resume FE`: React, TypeScript, Vite. Plain CSS and built-in fetch; no state library initially.
- `resume BE`: .NET 10 ASP.NET Core Web API, controllers, dependency injection, services, repositories, EF Core and PostgreSQL.
- One backend project; no CQRS, MediatR, generic repository, AutoMapper, microservices, or authentication for this interview MVP.
- A concrete `IResumeRepository` owns persistence. Services own business rules. Controllers translate HTTP inputs and results.
- Gemini is behind `IResumeAiService` and a typed HTTP client, using structured JSON responses. The API key is server-only.
- Docker Compose runs PostgreSQL, backend and frontend. `docker compose up` builds missing images and starts all three.

```text
Browser -> React -> /api via nginx -> Controllers -> Services -> IResumeRepository -> PostgreSQL
                                                   |
                                                   +-> Gemini client
```

## Data model

One `resumes` table stores ID, title, target role, UTC creation/update timestamps, and the resume document as JSONB. The document has contact information, summary, work experience, education, certifications, skills, projects and achievements. JSONB keeps the prototype small and handles variable-length sections without many relational tables. DTOs still validate section shapes and sizes. Revisit normalization only when analytics or cross-resume search requires it.

Draft fields can be empty; a title and target role are required. The API replaces a complete document on save, with last-write-wins semantics. The first version is single-user and local-only; multi-user ownership and optimistic concurrency belong to the production phase.

## Phase 1 Backend and Docker foundation

1. Create controllers/services/repositories and EF Core model with an initial migration.
2. Implement list, get, create, update and delete resume drafts; use consistent ProblemDetails errors.
3. Implement AI actions: summary, improve one experience item, review weak/missing information, suggest role-specific skills. Return suggestions without silently saving them.
4. Implement PDF upload extraction (PDF only, max 5 MiB, basic signature validation). Return an editable document; never save or retain the uploaded PDF. Extraction uses Gemini and requires a configured key. Clearly state that PDF content is sent to Google.
5. Use an explicit simulated mode for improvements when no key is configured; every result includes `isSimulated` and `provider`. Never pretend a PDF was parsed in simulated mode. Real provider failures return useful errors, not invented results.
6. Add health endpoint, OpenAPI JSON, sample API calls, regression checks and a Docker Compose smoke test.
7. Complete the React editor in phase 2 and verify FE-to-BE connectivity with actual draft save/reopen operations.

## API contract

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Database readiness and AI mode, without secrets |
| GET | `/api/resumes` | Up to 100 most recently updated draft summaries |
| GET | `/api/resumes/{id}` | Full draft |
| POST | `/api/resumes` | Create `{ title, targetRole, document }` |
| PUT | `/api/resumes/{id}` | Replace draft with the same request shape |
| DELETE | `/api/resumes/{id}` | Delete draft |
| POST | `/api/ai/improve` | `{ action, targetRole, document, experienceIndex? }` |
| POST | `/api/imports/pdf` | Multipart `file`; returns extracted document for review |
| GET | `/openapi/v1.json` | OpenAPI contract |

AI actions: `summary`, `experience`, `review`, `skills`. AI response: `{ provider, isSimulated, suggestedText, suggestions, missingInformation, recommendedSkills }`. Suggested skills are suggestions to verify, never automatically asserted as possessed skills. The `experience` action requires a valid `experienceIndex`.

## Phase 2 React user flow

1. Start screen: create from scratch, upload PDF, or open a saved draft.
2. Editable sections: personal/contact, summary, repeatable experience, education, certifications, skills, projects and achievements; add/edit/remove rows.
3. Desktop: form and live resume preview side-by-side. Mobile: Editor and Preview tabs. Minimal blue-and-white layout.
4. Target role selector with the four example PM roles plus a custom role.
5. AI panel: generate summary, improve a selected experience, review gaps, recommend skills. Show original and suggestion with explicit Apply/Dismiss. Display simulated mode clearly.
6. Upload: explain Google processing, validate file, show extraction progress, then let the user correct details before saving.
7. Explicit Save button with dirty-state warning, loading/success/error feedback. Avoid autosave complexity initially.
8. One professional resume template; `window.print()` plus print CSS for browser Save as PDF. A server-side PDF generator is unnecessary for the first demo.

## Phase 3 Verify and rehearse

- Manual flow: enter -> save -> reload -> improve -> apply -> preview -> PDF export.
- Existing CV flow: upload -> review/correct -> role-specific improvement -> save/export.
- Verify draft persistence after container restart; test 404, invalid payloads, AI timeout/rate-limit errors and upload rejection.
- Use synthetic resume data in development. Do not log resume content, PDF bytes or API keys.
- Rehearse a 10-15 minute demo and explain Controller -> Service -> Repository, JSONB choice, AI limitations, and how authentication/ownership, retention controls and concurrency would be added for production.

## Startup and key configuration

Run `docker compose up` from `D:\ResumeBuilder`. Defaults start without any paid credentials. For real AI, create `.env` using `.env.example` and add `GEMINI_API_KEY` locally. Do not put the key in React, Git, screenshots or chat. Restart/recreate the backend after changing `.env`.

Frontend: http://localhost:5173. Backend: http://localhost:8088. PostgreSQL has a named volume and is not published on the host. HTTP ports bind to localhost because this prototype has no authentication. Port 8088 avoids the existing SchoolAdmissionSystem service on 8080.

## Deferred features

Authentication, multiple users, background jobs, cloud storage, DOCX upload, custom template designers, ATS scores, payments, deployments and production infrastructure are outside the quick prototype scope.

## Implementation references

- [.NET container documentation](https://learn.microsoft.com/aspnet/core/host-and-deploy/docker/building-net-docker-images)
- [Npgsql EF Core 10](https://www.npgsql.org/efcore/release-notes/10.0.html)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini document processing](https://ai.google.dev/gemini-api/docs/document-processing)

## Progress

- [x] FE + BE plan and project folders
- [x] Backend CRUD, persistence, validation and error handling
- [x] Gemini improvements and PDF extraction, including live API tests
- [x] Compose with PostgreSQL, backend and React frontend
- [x] Backend regression checks and Docker smoke test, including restart persistence
- [x] Full React editor, review/apply workflow, responsive preview and browser PDF export implementation
- [x] Server-only key configuration and editable CV specialist / PDF extraction system prompts
- [ ] Final native Save as PDF dialog verification (browser automation was stopped because Chrome URL could not be determined safely)
