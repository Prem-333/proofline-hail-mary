# Round 3 release verification

Updated 28 October 2026 (IST).

- 53 domain/security scenarios passed, covering the original approval flow and all three Round 3 improvements.
- 19 HTTP scenarios passed against both the local application and public Round 3 deployment; the test runner also counts two parent containers, which are not extra scenarios.
- TypeScript checking and production packaging passed. [GitHub CI](https://github.com/Prem-333/proofline-hail-mary/actions/runs/40616574201) independently passed installation, all domain/security tests, type checking and the production build.
- Browser checks exercised actual Tesseract extraction, word-region correction, missing-text transcription, claim highlighting, policy trial results and explicit owner publication.
- The hourly monitor is defined in `.github/workflows/evidence-monitor.yml`. Its actual executions and failures are visible in the repository's Actions tab; the application shows the last successful scheduled check for the workspace.
- The monitor's signature, repository, workflow and expiry checks are covered by tests. A [real cloud execution](https://github.com/Prem-333/proofline-hail-mary/actions/runs/40616770135), manually dispatched through the same scheduled workflow, completed on 28 October at 07:14 IST: 10 workspaces checked, 4 affected drafts and zero concurrent-write conflicts. The live sample displayed its persisted scheduled-check time. The first execution overlapped HTTP tests, preserved two concurrent edits and reported failure; the retry succeeded. The hourly cron is configured, but its first timer-triggered execution was not awaited for this release.

The three delivered improvements, judge walkthrough and implementation boundaries are documented in [ROUND_3.md](ROUND_3.md).

## Earlier Round 2 verification

Updated 24 October 2026.

- Public project: https://proofline-hail-mary.dainty-shark-5340.chatgpt.site
- Public source: https://github.com/Prem-333/proofline-hail-mary
- 29 domain scenarios passed, including five source-change preview cases.
- 11 HTTP scenarios passed on 23 October against the public deployment, covering creation, persistence, independent approval, export, invalidation, session isolation, role enforcement, concurrent edits and file storage. The test runner also counts a parent test; it is not an extra scenario.
- TypeScript checking and the production build passed.
- Local browser verification covered MiniLM retrieval, PDF extraction, image OCR, corrections, independent approval and the downloaded receipt.
- Public links were accessed without an authentication header. The sample requires no login.

The hosted model provider stalled during the first browser check. Optional AI now has a 45-second deadline and continues with lexical retrieval and explicit rules if unavailable. Model loading may continue in the background; a later review can reuse it. This is an external-download limitation, not a claim of successful hosted AI inference.

These checks are implementation evidence, not model accuracy or user-study results. Production private-workspace invitation acceptance has not been exercised with a second real account. Team members still need to verify their actual contributions in CONTRIBUTIONS.md before submitting.
