import { access, body, failure, json, save } from '@/lib/server';
import { approvalCurrent, DomainError, event, getDraft } from '@/lib/domain';
export async function POST(req: Request) {
    try {
        const input = await body(req);
        const a = await access(req, input.workspaceId);
        if (input.revision !== a.row.revision)
            throw new DomainError('Refresh before exporting; the workspace changed.', 409);
        const d = getDraft(a.state, input.draftId);
        if (!await approvalCurrent(d, a.state))
            throw new DomainError('Export blocked: approval is missing or out of date. Run review and obtain a fresh approval.', 409);
        const receipt = { product: 'Proofline', receiptVersion: 1, issuedAt: new Date().toISOString(), workspace: a.state.name, mode: a.row.mode, title: d.title, draftId: d.id, draftVersion: d.version, content: d.content, altText: d.altText, attachment: d.attachment ? { name: d.attachment.name, hash: d.attachment.hash, extractedText: d.attachment.extractedText, extractionConfirmed: d.attachment.extractionConfirmed } : null, approval: d.approval, review: d.review, policy: a.state.brand, sources: a.state.sources.map(s => ({ id: s.id, title: s.title, version: s.version, status: s.status, product: s.product, market: s.market, approvedWording: s.approvedWording, expiresAt: s.expiresAt, excerpt: s.excerpt })), limitation: 'Approval covers this content and these source/policy versions at export time. Later content edits, relevant evidence changes, policy changes or updated review checks require fresh review. Automated checks do not certify factual truth, legal compliance or accessibility.' };
        event(a.state, a.actor, 'Review package exported', `${d.title} · version ${d.version}`, d.id);
        await save(a);
        return json({ receipt, revision: a.row.revision });
    }
    catch (e) {
        return failure(e);
    }
}
