# Proofline · Round 2 implementation

Proofline is Hail Mary's implementation of the Inkloom AI intelligent brand-governance brief. It helps a marketing team review content against versioned evidence, correct specific findings, obtain independent approval and export a record tied to that version.

## Completed product features

- An isolated, account-free sample workspace with fictional Luma Analytics evidence and three clearly labelled demo personas.
- Durable draft creation, editing, revision history, comments and change requests.
- Versioned evidence with product, market, approved wording, approval state and validity date.
- Editable brand vocabulary, avoided terms, palette and contrast threshold.
- Claim retrieval and explicit checks for numerical disagreement, missing qualifications, broad promises, expired sources and conflicting source figures.
- Optional browser-local MiniLM semantic retrieval; rule-based retrieval continues when the model cannot load.
- PDF text extraction and English image OCR, original-file storage and mandatory extraction confirmation.
- Image description, selected colour-pair contrast and palette checks.
- Independent approval, reasoned exceptions for advisories, and non-waivable blockers.
- Approval invalidation after content, evidence or brand-policy changes; export checks validity again on the server.
- Downloadable HTML approval receipt, printable to PDF, containing the content fingerprint and source versions.
- Signed-in private workspaces with membership roles and expiring one-use invitations.
- Optimistic concurrency, input validation, upload bounds, server authorization and session isolation.

## Technology and implementation

React 19 and TypeScript provide the interface. Vinext implements Next.js-style routes on a Cloudflare Worker. D1 stores workspace records, membership, invitations and upload metadata; R2 stores original files. Drizzle owns schema migrations. Zod validates write commands.

Each workspace aggregate has a revision. Writes update it only when the submitted revision still matches. A concurrent write returns HTTP 409 without replacing another person's work. A review stores the content SHA-256, policy version and source digest. Approval requires a different person, a current review and resolved findings. Export repeats those checks before issuing a point-in-time receipt.

PDF.js extracts digital PDF text. Tesseract.js reads English image text. Transformers.js runs quantized `Xenova/all-MiniLM-L6-v2` embeddings in the browser. Semantic similarity helps rank evidence; it is not a factual entailment model. Content is saved to the application backend, but embedding/OCR inputs are not sent to a model API. Third-party hosts provide model and OCR runtime files.

## Changes from Round 1

| Original plan | Round 2 implementation | Reason |
| --- | --- | --- |
| Next.js + FastAPI services | React/TypeScript with Vinext and Worker routes | One deployable application with shared domain checks. |
| Supabase/PostgreSQL | D1 + R2 | Integrated hosted persistence and file isolation without a separate database service. |
| Gemini API with structured generation | Optional local MiniLM retrieval plus deterministic rules and approved-source wording | Judges can use the core flow without supplying an API key; suggestions remain traceable. |
| Server-side pypdf/Tesseract/Pillow | Browser PDF.js/Tesseract with server file storage | Avoid a separate document-processing service; make extraction confirmation explicit. |
| Broad visual compliance | Image description and user-supplied colour-pair checks | Pixel-level layout and logo checks are not yet implemented. |
| Designed report export | Machine-readable receipt inside a printable HTML document | Preserve verifiable version detail now; a richer report can follow. |

## Three substantial Round 3 improvements

1. **Evidence freshness and affected-content tracking.** Build a dependency index from claims to sources, scheduled expiry checks, an affected-drafts queue and targeted re-review notices. Acceptance: changing or expiring a source identifies every dependent approved draft; no unrelated draft is flagged by the dependency index. This extends today's on-demand invalidation.
2. **Visual evidence overlays.** Store OCR word boxes and confidence, show findings at the relevant image region, and route uncertain text through a correction queue. Acceptance: a reviewer can locate and correct each flagged phrase on the image; low-confidence areas cannot silently pass. This extends today's plain OCR text and manual colour selection.
3. **Rule clarification from reviewer decisions.** Group repeated exceptions and change requests by policy rule, show representative evidence and let a brand owner draft, test and explicitly approve a policy revision. Acceptance: repeated exceptions create a traceable clarification item; no model or reviewer exception changes policy automatically. This extends today's individual comments and reasoned exceptions.

## Evaluation boundaries

The automated test suite checks implementation behaviour, not marketing-claim detection accuracy. The Round 1 proposal's 112-case held-out evaluation and user sessions remain a validation plan until the team records real results. No adoption, accuracy improvement or time saving is claimed from synthetic examples.

General claims without recognised numerical units or broad-promise terms can escape automated checks. Lexical and semantic retrieval can select an irrelevant source or miss one. Scanned PDFs may produce no text; reviewers must supply and verify the missing transcription. OCR can misread numbers. Colour checks use the pair entered by the creator and do not sample every pixel. The activity log is application history, not an independently immutable audit ledger. Model downloads require network access and can be slow on first use.

## Assigned ownership

All six participants: Bannari Amman Institute of Technology; third year, Computer Science and Business Systems.

| Participant | Responsibility |
| --- | --- |
| Premnath V R · team leader | Product scope, integration and demonstration |
| Mirthika S | Frontend, interaction design and accessibility review |
| Rithikha B | Evidence retrieval, AI evaluation and test corpus |
| Kanish S | Backend, authorization, persistence and security review |
| Bharathraj Nagarajan | PDF/image extraction and visual analysis |
| dharshini T | Quality assurance, analytics and release verification |

These are assigned responsibilities, not a fabricated record of individual commits. Each participant should record their actual work and peer review in the contribution log.

## AI assistance and reuse

Codex assisted architecture, implementation, tests, writing and design. The application reuses the Sites Vinext starter, React, Vinext, Cloudflare tooling, Drizzle, Zod, Lucide, PDF.js, Tesseract.js and Transformers.js. MiniLM is a third-party pretrained model, not a model trained by the team. The team is responsible for reviewing the implementation and the final submission. See `THIRD_PARTY.md` and the exact dependency versions in `package-lock.json`.
