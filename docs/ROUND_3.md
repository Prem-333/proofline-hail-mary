# Round 3 delivery

Proofline extends the existing content review, independent approval and receipt workflow with the three improvements committed in the Round 2 submission.

## 1. Evidence freshness and affected-content tracking

Each new review records the relevant source IDs, source versions, matching claim text and source validity at review time. Candidate sources are tracked as well as supporting sources so newly relevant or conflicting evidence cannot silently preserve an approval. The approval fingerprint uses that dependency set instead of every workspace source.

The Evidence monitor shows affected drafts and their reasons, plus an expandable claim-to-source map. Saving a source updates the stored queue. Approval and export independently recheck evidence validity, including expiry. An unrelated edit leaves an approval current. Reviews created before dependency tracking require one new review.

The hourly GitHub workflow in `.github/workflows/evidence-monitor.yml` calls a restricted server endpoint and scans active workspaces in batches of ten. It runs at minute 17 each hour; GitHub may delay scheduled execution. The page displays the last actual scheduled check. Writes use the existing workspace revision check, preserving concurrent edits. A conflict makes the job fail visibly so it can be retried.

The endpoint verifies GitHub's RS256 signature, issuer, audience, expiry, immutable repository ID, main branch, exact workflow path and allowed event. It accepts only the monitor workflow in `Prem-333/proofline-hail-mary`. It has no general content-write capability and returns counts, not workspace content. Forks must configure their own deployment trust. No long-lived scheduler secret is stored in source or workflow settings.

## 2. Visual evidence overlays

Tesseract returns word boxes, original text and confidence. Proofline stores these with the attachment, displays selectable image regions and maps textual findings to matching word spans. A correction panel lets the editor change transcription and confirm individual regions. A word below 85% confidence must be confirmed individually; the global confirmation checkbox cannot bypass that gate. The server also blocks approval when word-region text and the saved transcription disagree.

A separate field accepts visible text omitted by OCR; it is included in claim checks without inventing image coordinates. Corrections affect the transcription, not the original image. To fix an actual unsupported claim in an image, edit the original and upload the corrected image. Content fingerprints include the word records and confirmations, so a change requires a new review. Images are limited to 800 recognised word regions. Older uploads without coordinates need re-uploading for overlays. OCR can still omit text or give an incorrect reading high confidence, so whole-image inspection remains required.

## 3. Rule clarification from reviewer decisions

Advisory exceptions and rule-linked change requests become retained decision records. The clarification queue groups them by rule and presents the draft, quote, reviewer, reason and time. Two recorded decisions for a rule permit an owner to draft a proposal.

The owner edits a proposed policy, saves it separately, and tests it against all saved drafts. The test lists added and resolved findings and blocker counts. Publishing requires a current test and explicit owner approval. Changes to content, evidence or the current policy make the test obsolete. Editing the proposal clears its test. Publishing records the approver and new policy version; it never approves affected content automatically.

Voice guidance remains reviewer context: only supported structured rules produce automated findings. Proposal tests show implementation effects, not a guarantee that a policy is appropriate.

## Judge walkthrough

1. Open the sample workspace and choose **Prepare Round 3 examples**. Four fictional drafts and simulated review decisions are created through the normal domain operations.
2. Change the demo role to **Brand owner · Jordan**. In Evidence library, change the reporting source from 18% to 12% in both fields and save. Evidence monitor flags the reporting draft; the trial-only approval remains current.
3. In Review desk, choose a draft you can edit and select **Try image review with a sample**. Inspect word regions, correct a transcription, confirm uncertain regions, then confirm the whole transcription and review. Findings can be located on the image.
4. Open Policy clarifications. Inspect the two historical-name decisions, draft a clarification, adjust the preferred-term rule, and test it. Inspect resolved findings before **Approve & publish policy**.

All sample evidence, approvals and feedback are explicitly fictional. Use a fresh sample for a repeatable baseline. Preparing examples does not grant private-workspace permissions.

## Verification and limits

The test commands cover 53 domain/security scenarios and 19 HTTP scenarios, excluding the two parent HTTP test containers. The checks include independent approval, targeted invalidation, OCR gates, stale proposal tests, role enforcement and scheduler identity rejection. Execution results are recorded in the release notes; these are not model-accuracy or user-study measurements.

The existing limitations remain: optional semantic model downloads may fail and fall back to lexical rules; scanned PDFs need manual transcription; general factual claims and full layout/logo compliance are not covered; private invitation acceptance has not been tested with a second real account; receipts are not digitally signed. Team contribution sign-off remains the participants' responsibility.

## Reference

Scheduler authentication follows [GitHub's OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc). Third-party reuse and AI assistance remain disclosed in `THIRD_PARTY.md`.
