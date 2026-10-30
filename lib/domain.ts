import { sampleDraft } from './seed.ts';
import { dependenciesNow, evidenceState, scanFreshness } from './freshness.ts';
import { decisionGroups, ruleOptions, testPolicy } from './policy.ts';
import { analyse, sourceCurrent, REVIEW_RULESET_VERSION } from './analysis.ts';
import type { Actor, Draft, SemanticMatch, Source, Workspace } from './types';
export class DomainError extends Error {
    status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function requireRole(actor: Actor, roles: string[]) { if (!roles.includes(actor.role))
    throw new DomainError('Your role cannot perform this action.', 403); }
export async function hash(value: string | ArrayBuffer) { const b = typeof value === 'string' ? new TextEncoder().encode(value) : value; const out = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(out)].map(n => n.toString(16).padStart(2, '0')).join(''); }
export async function contentHash(d: Draft) { return hash(JSON.stringify({ title: d.title, content: d.content, product: d.product, market: d.market, channel: d.channel, intent: d.intent, altText: d.altText, foreground: d.foreground, background: d.background, attachment: d.attachment || null })); }
export async function sourceDigest(w: Workspace, ids?: string[], now = Date.now()) { return hash(evidenceState(w, ids, now)); }
export function sourceReferencesCurrent(d: Draft, w: Workspace, now = Date.now()) {
    const ids = [...(d.review?.evidence || []).map(e => e.sourceId), ...(d.review?.findings || []).flatMap(f => f.sourceId ? [f.sourceId] : [])];
    return ids.every(id => { const s = w.sources.find(x => x.id === id); return s && sourceCurrent(s, now); });
}
export async function reviewCurrent(d: Draft, w: Workspace, now = Date.now()) { return d.review?.rulesetVersion === REVIEW_RULESET_VERSION && !!d.review?.dependencies && d.review.contentHash === await contentHash(d) && d.review.policyVersion === w.brand.version && d.review.sourceDigest === await sourceDigest(w, dependenciesNow(d, w, now).map(x => x.sourceId), now); }
export async function policyFingerprint(w: Workspace) { return hash(JSON.stringify({ rulesetVersion: REVIEW_RULESET_VERSION, brand: w.brand, sources: evidenceState(w), drafts: await Promise.all(w.drafts.map(async d => [d.id, await contentHash(d), d.review?.id])) })); }
export async function approvalCurrent(d: Draft, w: Workspace) { return !!d.approval && await reviewCurrent(d, w) && d.approval.reviewId === d.review?.id && d.approval.contentHash === d.review?.contentHash; }
export function event(w: Workspace, actor: Actor, action: string, detail: string, draftId?: string) { w.events.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), actor: actor.name, action, detail, draftId }); w.events = w.events.slice(0, 500); }
export function getDraft(w: Workspace, id: string) { const d = w.drafts.find(d => d.id === id); if (!d)
    throw new DomainError('Draft not found.', 404); return d; }
export async function execute(w: Workspace, actor: Actor, command: any): Promise<{
    draftId?: string;
}> {
    const now = new Date().toISOString();
    if (command.action === 'demo.round3') {
        if (w.events.some(e => e.action === 'Round 3 sample prepared')) throw new DomainError('The Round 3 sample is already prepared.');
        if (w.drafts.length > 26) throw new DomainError('Make room for four sample drafts.');
        const c: Actor = { id: 'demo-creator', name: 'Alex · creator', role: 'creator' }, r: Actor = { id: 'demo-reviewer', name: 'Morgan · reviewer', role: 'reviewer' };
        for (const [title, content, feedback] of [
            ['Reporting study · approved sample', 'Our internal study measured 18% less reporting time on selected tasks.', false],
            ['Trial invitation · approved sample', 'Start your 14-day trial.', false],
            ['Historical product name · case study', 'Luma AI helps teams report.', true],
            ['Historical product name · interview', 'Luma AI helps customers review results.', true],
        ] as const) {
            const added = await execute(w, c, { action: 'draft.create', draft: { ...sampleDraft, title, content } });
            await execute(w, c, { action: 'draft.analyse', draftId: added.draftId });
            const d = getDraft(w, added.draftId!);
            if (feedback) { const f = d.review!.findings.find(f => f.ruleKey === 'terminology:luma ai'); if (f) await execute(w, r, { action: 'finding.resolve', draftId: d.id, findingId: f.id, reason: 'Synthetic example: historical name quoted in context. Consider clarifying the vocabulary rule.' }); }
            else if (!d.review!.findings.length) { await execute(w, c, { action: 'draft.submit', draftId: d.id }); await execute(w, r, { action: 'draft.approve', draftId: d.id, note: 'Synthetic demonstration approval for the isolated sample.' }); }
        }
        scanFreshness(w, 'manual');
        event(w, actor, 'Round 3 sample prepared', 'Four fictional drafts and simulated reviewer decisions created for evaluation.');
        return {};
    }
    if (command.action === 'freshness.scan') { scanFreshness(w, 'manual'); return {}; }
    if (command.action === 'policy.propose') {
        requireRole(actor, ['admin']);
        const group = decisionGroups(w).find(g => g.ruleKey === command.ruleKey && g.repeated);
        if (!group) throw new DomainError('Record at least two decisions for this rule before drafting a clarification.');
        w.proposals ??= [];
        if (w.proposals.length >= 20) throw new DomainError('This workspace supports 20 policy proposals.');
        const p = { id: crypto.randomUUID(), ruleKey: group.ruleKey, decisionIds: group.decisions.map(d => d.id), rationale: command.rationale, brand: { ...command.brand, version: w.brand.version }, baseVersion: w.brand.version, createdBy: actor.name, createdAt: now, status: 'draft' as const };
        w.proposals.unshift(p);
        event(w, actor, 'Policy clarification drafted', group.label);
        return {};
    }
    if (['policy.update', 'policy.test', 'policy.approve'].includes(command.action)) {
        requireRole(actor, ['admin']);
        const p = w.proposals?.find(p => p.id === command.proposalId);
        if (!p) throw new DomainError('Proposal not found.', 404);
        if (p.status === 'approved') throw new DomainError('This proposal has already been published.');
        if (p.baseVersion !== w.brand.version) throw new DomainError('Brand policy changed. Create a new proposal against the current version.', 409);
        if (command.action === 'policy.update') { p.brand = { ...command.brand, version: p.baseVersion }; p.rationale = command.rationale; p.trial = undefined; p.status = 'draft'; }
        if (command.action === 'policy.test') {
            p.trial = { fingerprint: await policyFingerprint(w), at: now, drafts: testPolicy(w, p.brand) };
            p.status = 'tested';
            event(w, actor, 'Policy proposal tested', `${p.id} · ${p.trial.drafts.length} drafts · no live policy change`);
        }
        if (command.action === 'policy.approve') {
            if (!p.trial || p.status !== 'tested' || p.trial.fingerprint !== await policyFingerprint(w)) throw new DomainError('Test this proposal against the current saved drafts and evidence before publishing.', 409);
            w.brand = { ...p.brand, version: w.brand.version + 1 };
            p.status = 'approved'; p.approvedBy = actor.name; p.approvedAt = now; p.publishedVersion = w.brand.version;
            event(w, actor, 'Policy clarification approved', `${p.rationale} · policy v${w.brand.version}`);
        }
        return {};
    }
    if (command.action === 'source.save') {
        requireRole(actor, ['admin']);
        const input = command.source;
        for (const field of ['title', 'excerpt', 'approvedWording', 'status', 'product', 'market'] as const)
            if (!input[field] || typeof input[field] !== 'string' || !input[field].trim())
                throw new DomainError(`Source ${field} is required.`);
        if (!['draft', 'approved'].includes(input.status))
            throw new DomainError('Source status must be "draft" or "approved".');
        const old = w.sources.find(s => s.id === input.id);
        const s: Source = { ...input, id: old?.id || crypto.randomUUID(), owner: actor.name, version: (old?.version || 0) + 1 };
        if (old)
            w.sources[w.sources.indexOf(old)] = s;
        else {
            if (w.sources.length >= 50)
                throw new DomainError('This workspace supports up to 50 sources.');
            w.sources.push(s);
        }
        scanFreshness(w, 'source-change');
        event(w, actor, old ? 'Source revised' : 'Source added', `${s.title} · version ${s.version} · ${s.status}`);
        return {};
    }
    if (command.action === 'brand.save') {
        requireRole(actor, ['admin']);
        w.brand = { ...command.brand, version: w.brand.version + 1 };
        event(w, actor, 'Brand rules revised', `Policy version ${w.brand.version}`);
        return {};
    }
    if (command.action === 'draft.create') {
        requireRole(actor, ['creator', 'admin']);
        if (w.drafts.length >= 30)
            throw new DomainError('This workspace supports up to 30 drafts.');
        const d: Draft = { ...command.draft, id: crypto.randomUUID(), createdBy: actor.id, createdName: actor.name, createdAt: now, updatedAt: now, version: 1, submitted: false, revisions: [], comments: [] };
        w.drafts.unshift(d);
        event(w, actor, 'Draft created', d.title, d.id);
        return { draftId: d.id };
    }
    const d = getDraft(w, command.draftId);
    if (command.action === 'draft.save') {
        requireRole(actor, ['creator', 'admin']);
        if (actor.role === 'creator' && d.createdBy !== actor.id)
            throw new DomainError('Only the creator or a brand administrator can edit this draft.', 403);
        d.revisions.unshift({ version: d.version, content: d.content, attachmentName: d.attachment?.name, at: now, by: actor.name });
        d.revisions = d.revisions.slice(0, 50);
        Object.assign(d, command.draft, { attachment: command.draft.attachment, version: d.version + 1, updatedAt: now, submitted: false });
        event(w, actor, 'Draft revised', `${d.title} · version ${d.version}`, d.id);
        return { draftId: d.id };
    }
    if (command.action === 'draft.analyse') {
        requireRole(actor, ['creator', 'admin', 'reviewer']);
        const output = analyse(d, w.sources, w.brand, command.semantic || []);
        d.review = { ...output, id: crypto.randomUUID(), contentHash: await contentHash(d), policyVersion: w.brand.version, sourceDigest: await sourceDigest(w, output.dependencies.map(x => x.sourceId)), semantic: command.semantic || [], checkedAt: now, engine: command.semantic?.length ? 'local-semantic' : 'rules' };
        d.approval = undefined;
        d.submitted = false;
        event(w, actor, 'Review completed', `${output.findings.length} findings · ${output.evidence.length} evidence matches · ${d.review.engine}`, d.id);
        return { draftId: d.id };
    }
    if (command.action === 'draft.submit') {
        requireRole(actor, ['creator', 'admin']);
        if (actor.role === 'creator' && d.createdBy !== actor.id)
            throw new DomainError('Only the creator or a brand administrator can submit this draft.', 403);
        if (!await reviewCurrent(d, w) || d.review?.incomplete)
            throw new DomainError('Run a complete, current review before requesting approval.');
        if (d.review!.findings.some(f => f.severity === 'blocker'))
            throw new DomainError('Resolve blocking findings by revising the content or evidence, then review again.');
        d.submitted = true;
        event(w, actor, 'Approval requested', d.title, d.id);
        return { draftId: d.id };
    }
    if (command.action === 'finding.resolve') {
        requireRole(actor, ['reviewer', 'admin']);
        if (d.createdBy === actor.id)
            throw new DomainError('A different person must review your draft.', 403);
        if (!await reviewCurrent(d, w))
            throw new DomainError('This review is out of date. Run it again.');
        const f = d.review!.findings.find(f => f.id === command.findingId);
        if (!f)
            throw new DomainError('Finding not found.', 404);
        if (f.severity === 'blocker')
            throw new DomainError('Blocking findings require a correction and a new review.');
        if (f.resolution) throw new DomainError('This exception has already been recorded.');
        w.decisions ??= [];
        if (f.ruleKey) { w.decisions.push({ id: crypto.randomUUID(), ruleKey: f.ruleKey, ruleLabel: ruleOptions(w.brand).find(r => r.key === f.ruleKey)?.label || f.title, draftId: d.id, draftTitle: d.title, reviewId: d.review!.id, quote: f.quote, reason: command.reason, by: actor.name, at: now, kind: 'exception' }); w.decisions = w.decisions.slice(-500); }
        f.resolution = { by: actor.name, reason: command.reason, at: now };
        event(w, actor, 'Exception recorded', `${f.title}: ${command.reason}`, d.id);
        return { draftId: d.id };
    }
    if (command.action === 'draft.comment' || command.action === 'draft.changes') {
        if (command.action === 'draft.changes')
            requireRole(actor, ['reviewer', 'admin']);
        if (command.action === 'draft.changes' && command.ruleKey) {
            const rule = ruleOptions(w.brand).find(r => r.key === command.ruleKey);
            if (!rule) throw new DomainError('Choose a current brand rule.');
            w.decisions ??= []; w.decisions.push({ id: crypto.randomUUID(), ruleKey: rule.key, ruleLabel: rule.label, draftId: d.id, draftTitle: d.title, reviewId: d.review?.id, quote: d.content.slice(0, 300), reason: command.body, by: actor.name, at: now, kind: 'changes' }); w.decisions = w.decisions.slice(-500);
        }
        if (d.comments.length >= 100)
            throw new DomainError('Comment limit reached.');
        d.comments.push({ id: crypto.randomUUID(), by: actor.id, name: actor.name, at: now, body: command.body, kind: command.action === 'draft.changes' ? 'changes' : 'comment' });
        if (command.action === 'draft.changes') {
            d.submitted = false;
            d.approval = undefined;
        }
        event(w, actor, command.action === 'draft.changes' ? 'Changes requested' : 'Comment added', command.body, d.id);
        return { draftId: d.id };
    }
    if (command.action === 'draft.approve') {
        requireRole(actor, ['reviewer', 'admin']);
        if (d.createdBy === actor.id)
            throw new DomainError('You cannot approve your own draft.', 403);
        if (!d.submitted)
            throw new DomainError('The creator must request approval first.');
        if (!await reviewCurrent(d, w) || d.review?.incomplete)
            throw new DomainError('Content, rules or evidence changed. A new review is required.', 409);
        if (d.review!.findings.some(f => f.severity === 'blocker' || !f.resolution))
            throw new DomainError('Resolve all findings before approval.');
        d.approval = { by: actor.id, name: actor.name, at: now, reviewId: d.review!.id, contentHash: d.review!.contentHash, sourceDigest: d.review!.sourceDigest, policyVersion: w.brand.version, note: command.note };
        event(w, actor, 'Draft approved', `${d.title} · version ${d.version}`, d.id);
        return { draftId: d.id };
    }
    throw new DomainError('Unknown action.');
}
