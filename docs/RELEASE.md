# Round 3 release verification

Updated 28 October 2026 (IST).

- 53 domain/security scenarios passed, covering the original approval flow and all three Round 3 improvements.
- 19 HTTP scenarios passed against the local application; the test runner also counts two parent containers, which are not extra scenarios.
- TypeScript checking passed.
- Browser checks exercised actual Tesseract extraction, word-region correction, missing-text transcription, claim highlighting, policy trial results and explicit owner publication.
- The hourly monitor is defined in `.github/workflows/evidence-monitor.yml`. Its actual executions and failures are visible in the repository's Actions tab; the application shows the last successful scheduled check for the workspace.
- The monitor's signature, repository, workflow and expiry checks are covered by tests. A local test is not evidence of a completed hosted scheduler run.

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
