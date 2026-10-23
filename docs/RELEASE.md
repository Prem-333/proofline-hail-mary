# Round 2 release verification

Verified 23 October 2026.

- Public project: https://proofline-hail-mary.dainty-shark-5340.chatgpt.site
- Public source: https://github.com/Prem-333/proofline-hail-mary
- 24 domain scenarios passed.
- 11 HTTP scenarios passed against the public deployment, covering creation, persistence, independent approval, export, invalidation, session isolation, role enforcement, concurrent edits and file storage. The test runner also counts a parent test; it is not an extra scenario.
- TypeScript checking and the production build passed.
- Local browser verification covered MiniLM retrieval, PDF extraction, image OCR, corrections, independent approval and the downloaded receipt.
- Public links were accessed without an authentication header. The sample requires no login.

The hosted model provider stalled during the first browser check. Optional AI now has a 45-second deadline and continues with lexical retrieval and explicit rules if unavailable. Model loading may continue in the background; a later review can reuse it. This is an external-download limitation, not a claim of successful hosted AI inference.

These checks are implementation evidence, not model accuracy or user-study results. Production private-workspace invitation acceptance has not been exercised with a second real account. Team members still need to verify their actual contributions in CONTRIBUTIONS.md before submitting.
