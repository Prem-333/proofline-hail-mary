# Project structure

```text
app/                    Page routes, layout, global styles and HTTP endpoints
  api/                  Workspace, file, member and export endpoints
components/             Product interface and source-change preview
lib/                    Shared types, validation, review rules and domain logic
db/                     Drizzle database schema and database access
drizzle/                Versioned SQL migrations and migration metadata
worker/                 Cloudflare Worker entry point
public/                 Static assets; PDF worker is generated during build
scripts/                Build, local runtime and deployment support
tests/                  Domain checks, HTTP journey and synthetic fixtures
docs/                   Architecture, scope, attribution and verification notes
.github/workflows/      Continuous integration
.openai/hosting.json     Storage bindings and Sites deployment identity
```

`app/page.tsx` opens `components/proofline-app.tsx`. UI components call the API routes; routes validate commands and enforce workspace access before invoking `lib/domain.ts`. Both normal review and source preview use `lib/analysis.ts`. The preview in `lib/source-impact.ts` does not modify saved records.

Keep business rules in `lib/`, request handling in `app/api/`, and interface behaviour in `components/`. Add schema changes as new migrations. Generated output, dependencies, local databases and environment files must remain outside Git.

The clean GitHub export excludes unused starter component examples, the submission PDF, generated PDF workers and all local execution state. The build scripts recreate required generated assets. Existing dependency versions remain pinned in `package-lock.json`.
