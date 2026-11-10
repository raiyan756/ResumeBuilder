# PM Circle Resume Studio

A local interview prototype for building and improving a resume. React + TypeScript frontend, .NET 10 controller-based API, PostgreSQL persistence and Gemini integration.

## Start

Open a terminal in `D:\ResumeBuilder` and run:

```powershell
docker compose up
```

Docker Desktop must be running. The first run builds the frontend and backend and downloads missing base images. Later runs reuse those images. Wait for the API to report that it is listening.

- App: http://localhost:5173
- Backend health: http://localhost:8088/api/health
- OpenAPI: http://localhost:8088/openapi/v1.json

The backend uses port **8088**, leaving the existing SchoolAdmissionSystem on **8080** alone. PostgreSQL is reachable only inside the Compose network. These app ports bind to localhost; this is a single-user prototype without authentication.

Run in the background with `docker compose up -d`. After changing source code, use `docker compose up -d --build`. Stop with `docker compose down`; saved drafts remain in the named PostgreSQL volume. Do not add `-v` unless you intend to erase the project's database volume.

## Enable Gemini

The supplied API key has been configured in the local, Git-ignored `.env`. For a fresh checkout, copy `.env.example` to `.env` and edit these values in a local editor:

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
AI_MODE=Auto
```

Then apply the configuration:

```powershell
docker compose up -d --force-recreate backend
```

Refresh the app. The AI panel should change from **Demo mode** to **Powered by Gemini**. Configuration detection is not a live credential validation; a successful suggestion/import confirms model access. Set `GEMINI_MODEL` to another PDF + structured-output capable model available to your project if necessary. Availability and quota depend on your Gemini account.

- `Auto`: real Gemini when a key is present; otherwise clearly labeled simulated improvements.
- `Demo`: always simulated suggestions; PDF import is disabled with an explanatory error.
- `Gemini`: require a key; return a configuration error if it is missing.

The API key is server-only and `.env` is ignored by Git. Never put it in a `VITE_*` variable. Real AI failures are shown as errors; the app never silently substitutes fake results. The default model was selected after live testing: the older 2.5 Flash-Lite returned a new-user restriction and Google recommended 3.5 Flash-Lite, which successfully handled review and PDF extraction.

## Internal prompts

This app wraps Gemini with server-owned specialist prompts:

- `resume BE/ResumeBuilder.Api/Prompts/ResumeSpecialist.txt`: CV specialist persona, target-role tailoring, summary/experience/review/skills behavior, factual constraints and structured output rules.
- `resume BE/ResumeBuilder.Api/Prompts/PdfExtraction.txt`: extract the original CV facts into editable fields without embellishment or invented data.

`GeminiClient` sends these as `systemInstruction`, separately from user data. User fields and PDF text are treated as source material rather than instructions. Responses must match a JSON schema and pass application validation. The user still reviews AI output; prompts cannot guarantee perfect factual accuracy.

Edit the text files to tune the assistant, then run `docker compose up -d --build backend`. The prompts are embedded in the server assembly and are not shipped in the frontend bundle.

PDF auto-fill requires real Gemini access. Uploads are limited to 5 MiB, checked for a PDF signature, processed in memory and not retained by this app. Google receives the uploaded PDF. Improvement requests exclude the contact section, though other entered resume text may contain personal information. Use fictional data for demos. See [Gemini's terms](https://ai.google.dev/gemini-api/terms) before sending real personal data, especially on a free tier.

## What works

- Start from scratch or explore an explicitly fictional sample resume.
- Add, edit and remove personal details, summary, experience, education, certifications, skills, projects and achievements.
- Save, reopen, update and delete drafts in PostgreSQL.
- Upload an existing PDF, review the extracted fields, then save it as a new draft (key required).
- Choose a suggested target role or type a custom one.
- Review gaps, generate a summary, improve an experience entry, and suggest relevant skills.
- Review AI suggestions and explicitly apply or dismiss them. Changed drafts invalidate old suggestions.
- Live professional resume preview; responsive editor/preview tabs on smaller screens.
- Export through the browser's **Save as PDF** dialog with A4 print styling. This is a real browser print/export flow, not a server-generated download.
- Loading, validation, provider errors, save status and unsaved-navigation warnings.

## Folder layout

```text
ResumeBuilder/
  resume FE/                       React + Vite + TypeScript
    src/components/                Editor, preview, AI panel, icons
    src/api.ts                     One typed fetch wrapper
    src/types.ts                   Shared frontend data contract
    Dockerfile, nginx.conf         Static hosting and /api proxy
  resume BE/
    ResumeBuilder.Api/
      Controllers/                 HTTP input/output
      Services/                    Business rules and AI orchestration
      Repositories/                IResumeRepository + EF implementation
      Data/Migrations/             Versioned PostgreSQL schema
      Models/, Contracts/          Resume shape and request/response DTOs
      Prompts/                     Editable internal CV specialist prompts
    ResumeBuilder.Checks/          Dependency-free regression checks
  scripts/smoke-test.ps1            Actual Compose integration checks
  IMPLEMENTATION_PLAN.md           Scope, phases and API contract
  docs/VERIFICATION.md              Test evidence and limitations
  compose.yaml                     Entire stack
```

## Why this is small

One backend project, a concrete resume repository, built-in DI and HttpClient, one JSONB resume table, normal React state and plain CSS. No generic repository, state library, background queue, CQRS, AutoMapper or authentication scaffolding.

Controllers call services. Services apply business rules and call `IResumeRepository`; only the repository uses EF for draft operations. Gemini calls are isolated in `GeminiClient`, with orchestration in `ResumeAiService`. The health controller checks database connectivity directly because it is an infrastructure probe rather than a resume operation.

The full document is replaced on save. For a single-user demo this keeps the API simple. Multi-user production work would add authentication, owner-scoped queries, conflict detection, retention controls, stronger content validation and deployment-managed migrations. Startup migrations are suitable for this single-instance local prototype.

## Verify

Requires a .NET 10 SDK for local regression checks; Docker itself builds using the stable .NET 10 SDK image.

```powershell
dotnet run --project "resume BE/ResumeBuilder.Checks"
pwsh -File scripts/smoke-test.ps1 -CheckRestart
```

The regression runner uses fake HTTP responses to test Gemini parsing, errors, timeouts and PDF contracts. It does not call Google. The smoke test uses the real frontend proxy, backend and PostgreSQL, creates a synthetic draft and removes it afterwards. `-CheckRestart` restarts only this project's database/backend to verify persistence. It skips real AI requests when Gemini mode is configured.

## Development

For frontend hot reload, keep the Docker backend running, then:

```powershell
cd "resume FE"
npm ci
npm run dev -- --port 5174
```

Vite proxies `/api` to port 8088. Use port 5174 while Docker's frontend owns 5173.

For backend schema changes:

```powershell
dotnet tool restore
dotnet ef migrations add YourChange --project "resume BE/ResumeBuilder.Api" --output-dir Data/Migrations
docker compose up -d --build backend
```

## Quick interview demo

1. Open the fictional sample, explain the manual and existing-PDF entry points.
2. Edit personal details and an experience; show the live preview.
3. Change the target role, request AI help, and review before applying.
4. Save, return to the dashboard and reopen the draft.
5. Export with Save as PDF. For a real import demo, configure your key and use a synthetic CV.
6. Explain the repository pattern, JSONB trade-off, transparent demo mode and production extensions.
