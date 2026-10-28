# Project structure

```text
app/                    Page routes, layout, global styles and HTTP endpoints
  api/                  Workspace, file, member, export and monitor endpoints
components/             Review desk, source preview, monitor, OCR and policy views
lib/                    Shared types, validation, review rules and domain logic
db/                     Drizzle database schema and database access
drizzle/                Versioned SQL migrations and migration metadata
worker/                 Cloudflare Worker entry point
public/                 Static assets; PDF worker is generated during build
scripts/                Build, local runtime and deployment support
tests/                  Domain checks, HTTP journey and synthetic fixtures
docs/                   Architecture, scope, attribution and verification notes
.github/workflows/      Continuous integration and hourly evidence monitor
.openai/hosting.json     Storage bindings and Sites deployment identity
```

`app/page.tsx` opens `components/proofline-app.tsx`. UI components call the API routes; routes validate commands and enforce workspace access before invoking `lib/domain.ts`. Both normal review and source preview use `lib/analysis.ts`. The preview in `lib/source-impact.ts` does not modify saved records.

Keep business rules in `lib/`, request handling in `app/api/`, and interface behaviour in `components/`. Add schema changes as new migrations. Generated output, dependencies, local databases and environment files must remain outside Git.

Round 3 logic is separated into `lib/freshness.ts` (dependencies and affected drafts), `lib/visual.ts` (OCR text and image spans), `lib/policy.ts` (decision grouping and proposal test fingerprints), and `lib/monitor-auth.ts` (restricted scheduler identity). The scheduled workflow runs `scripts/run-evidence-monitor.mjs`; the authenticated endpoint is `app/api/monitor/route.ts`. `tests/round3.test.ts` and `tests/round3-http.test.mjs` cover the new behaviour. The JSON workspace aggregate stores the new optional records without changing the database schema.

The clean GitHub export excludes unused starter component examples, the submission PDF, generated PDF workers and all local execution state. The build scripts recreate required generated assets. Existing dependency versions remain pinned in `package-lock.json`.
