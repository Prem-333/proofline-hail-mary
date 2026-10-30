import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, contrast } from '../lib/analysis.ts';
import { execute, reviewCurrent, approvalCurrent, contentHash } from '../lib/domain.ts';
import { seedWorkspace, sampleDraft } from '../lib/seed.ts';
import { previewSourceChange } from '../lib/source-impact.ts';
const creator = { id: 'c', name: 'Creator', role: 'creator' as const }, reviewer = { id: 'r', name: 'Reviewer', role: 'reviewer' as const }, admin = { id: 'a', name: 'Owner', role: 'admin' as const };
async function setup(content = sampleDraft.content) { const w = seedWorkspace(); await execute(w, creator, { action: 'draft.create', draft: { ...sampleDraft, content } }); return { w, d: w.drafts[0] }; }
async function ready() { const x = await setup('Our internal study measured 18% less reporting time on selected tasks. Start your 14-day trial.'); await execute(x.w, creator, { action: 'draft.analyse', draftId: x.d.id }); await execute(x.w, creator, { action: 'draft.submit', draftId: x.d.id }); return x; }
test('sample flags brand vocabulary, hype and unsupported figure', async () => { const { w, d } = await setup(); const r = analyse(d, w.sources, w.brand); assert.equal(r.findings.length, 3); assert.ok(r.findings.some(f => f.outcome === 'contradicted' && f.suggestion?.includes('18%'))); assert.equal(r.evidence.length, 1); });
test('corrected qualified wording matches both sources', async () => { const { w, d } = await ready(); assert.equal(d.review!.findings.length, 0); assert.equal(d.review!.evidence.length, 2); assert.equal(await reviewCurrent(d, w), true); });
test('hyphenated duration detects wrong trial length', async () => { const { w, d } = await setup('Start your 30-day trial.'); assert.equal(analyse(d, w.sources, w.brand).findings[0].outcome, 'contradicted'); });
test('expired evidence blocks release', async () => { const { w, d } = await setup('Get 40% off your annual subscription during launch.'); assert.ok(analyse(d, w.sources, w.brand).findings.some(f => f.title === 'Evidence has expired')); });
test('unapproved source cannot support a claim', async () => { const { w, d } = await setup('Start your 14-day trial.'); w.sources[1].status = 'draft'; assert.ok(analyse(d, w.sources, w.brand).findings.some(f => f.title === 'Source is not approved')); });
test('different product evidence is excluded', async () => { const { w, d } = await setup('Start your 14-day trial.'); d.product = 'Another product'; assert.equal(analyse(d, w.sources, w.brand).findings[0].title, 'Evidence needed'); });
test('different market evidence is excluded', async () => { const { w, d } = await setup('Start your 14-day trial.'); w.sources[1].market = 'US'; d.market = 'India'; assert.equal(analyse(d, w.sources, w.brand).findings[0].title, 'Evidence needed'); });
test('conflicting approved figures require source-owner action', async () => { const { w, d } = await setup('Our internal study measured 18% less reporting time on selected tasks.'); w.sources.push({ ...w.sources[0], id: 'conflict', approvedWording: w.sources[0].approvedWording.replace('18%', '25%'), excerpt: w.sources[0].excerpt.replace('18%', '25%') }); assert.ok(analyse(d, w.sources, w.brand).findings.some(f => f.outcome === 'conflicting')); });
test('universal guarantees remain blocked even with a supported figure', async () => { const { w, d } = await setup('Guaranteed 18% less reporting time for every team.'); assert.ok(analyse(d, w.sources, w.brand).findings.some(f => f.title === 'Keep the claim within scope')); });
test('creator cannot approve and reviewer cannot edit', async () => { const { w, d } = await ready(); await assert.rejects(() => execute(w, creator, { action: 'draft.approve', draftId: d.id, note: '' }), /role/); await assert.rejects(() => execute(w, reviewer, { action: 'draft.save', draftId: d.id, draft: sampleDraft }), /role/); });
test('administrator cannot self-approve', async () => { const { w, d } = await ready(); d.createdBy = admin.id; await assert.rejects(() => execute(w, admin, { action: 'draft.approve', draftId: d.id, note: '' }), /own draft/); });
test('creator cannot revise another creator’s draft', async () => { const { w, d } = await ready(); await assert.rejects(() => execute(w, { ...creator, id: 'other' }, { action: 'draft.save', draftId: d.id, draft: sampleDraft }), /Only the creator/); });
test('blocking findings cannot be waived', async () => { const { w, d } = await setup(); await execute(w, creator, { action: 'draft.analyse', draftId: d.id }); const f = d.review!.findings.find(f => f.severity === 'blocker')!; await assert.rejects(() => execute(w, reviewer, { action: 'finding.resolve', draftId: d.id, findingId: f.id, reason: 'We accept the risk' }), /Blocking/); });
test('advisories require a reasoned independent exception', async () => { const { w, d } = await setup('Luma AI helps teams report.'); await execute(w, creator, { action: 'draft.analyse', draftId: d.id }); await execute(w, creator, { action: 'draft.submit', draftId: d.id }); await assert.rejects(() => execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: '' }), /Resolve/); await execute(w, reviewer, { action: 'finding.resolve', draftId: d.id, findingId: d.review!.findings[0].id, reason: 'Historical name quoted in a case study.' }); await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: 'Context checked' }); assert.equal(await approvalCurrent(d, w), true); });
test('successful independent approval is current', async () => { const { w, d } = await ready(); await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: 'Verified source context' }); assert.equal(await approvalCurrent(d, w), true); assert.ok(w.events.some(e => e.action === 'Draft approved')); });
test('content edit invalidates approval and keeps previous version', async () => { const { w, d } = await ready(); await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: '' }); await execute(w, creator, { action: 'draft.save', draftId: d.id, draft: { ...sampleDraft, content: d.content + ' New text.' } }); assert.equal(await approvalCurrent(d, w), false); assert.equal(d.revisions.length, 1); assert.equal(d.version, 2); });
test('source revision invalidates approval', async () => { const { w, d } = await ready(); await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: '' }); await execute(w, admin, { action: 'source.save', source: { ...w.sources[0], excerpt: w.sources[0].excerpt + ' Revised scope.' } }); assert.equal(await approvalCurrent(d, w), false); });
test('policy revision invalidates approval', async () => { const { w, d } = await ready(); await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: '' }); await execute(w, admin, { action: 'brand.save', brand: w.brand }); assert.equal(await approvalCurrent(d, w), false); });
test('source expiry invalidates an unchanged approval', async () => { const { w, d } = await ready(); await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: '' }); w.sources[0].expiresAt = '2020-01-01'; assert.equal(await approvalCurrent(d, w), false); });
test('title and attachment are covered by the content fingerprint', async () => { const { d } = await setup(); const h = await contentHash(d); d.title += ' revised'; assert.notEqual(h, await contentHash(d)); const h2 = await contentHash(d); d.attachment = { key: 'x', name: 'file.png', type: 'image', size: 10, hash: 'a'.repeat(64), extractedText: 'hello', extractionConfirmed: true }; assert.notEqual(h2, await contentHash(d)); });
test('image review requires confirmed extraction and description', async () => { const { w, d } = await setup('A useful reporting tool.'); d.attachment = { key: 'x', name: 'image.png', type: 'image', size: 10, hash: 'a'.repeat(64), extractedText: '', extractionConfirmed: false }; const r = analyse(d, w.sources, w.brand); assert.equal(r.incomplete, true); assert.ok(r.findings.some(f => f.category === 'accessibility')); assert.ok(r.findings.some(f => f.category === 'extraction')); });
test('selected colour pair follows WCAG contrast formula', () => { assert.equal(contrast('#000000', '#ffffff'), 21); assert.equal(contrast('#ffffff', '#ffffff'), 1); });
test('removing an attachment actually removes it', async () => { const { w, d } = await setup(); d.attachment = { key: 'x', name: 'f.pdf', type: 'pdf', size: 10, hash: 'a'.repeat(64), extractedText: '', extractionConfirmed: false }; await execute(w, creator, { action: 'draft.save', draftId: d.id, draft: sampleDraft }); assert.equal(d.attachment, undefined); });
test('change request revokes approval and records feedback', async () => { const { w, d } = await ready(); await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: '' }); await execute(w, reviewer, { action: 'draft.changes', draftId: d.id, body: 'Add context for the study.' }); assert.equal(await approvalCurrent(d, w), false); assert.equal(d.submitted, false); assert.equal(d.comments[0].kind, 'changes'); });
test('source preview predicts a new blocker without changing saved data', async () => {
    const { w, d } = await ready();
    await execute(w, reviewer, { action: 'draft.approve', draftId: d.id, note: 'Checked' });
    const saved = JSON.stringify(w);
    const revised = { ...w.sources[0], excerpt: w.sources[0].excerpt.replace('18%', '12%'), approvedWording: w.sources[0].approvedWording.replace('18%', '12%') };
    const preview = previewSourceChange(w, revised);
    assert.equal(JSON.stringify(w), saved);
    assert.equal(preview.draftsWithNewBlockers, 1);
    assert.equal(preview.reviewsToRefresh, 1);
    assert.equal(preview.drafts[0].beforeBlockers, 0);
    const committed = structuredClone(w);
    await execute(committed, admin, { action: 'source.save', source: revised });
    await execute(committed, creator, { action: 'draft.analyse', draftId: d.id });
    assert.equal(preview.drafts[0].afterBlockers, committed.drafts[0].review!.findings.filter(f => f.severity === 'blocker').length);
});
test('source preview identifies a resolved finding', async () => {
    const { w } = await ready();
    const corrected = structuredClone(w.sources[0]);
    w.sources[0].excerpt = w.sources[0].excerpt.replace('18%', '12%');
    w.sources[0].approvedWording = w.sources[0].approvedWording.replace('18%', '12%');
    const preview = previewSourceChange(w, corrected);
    assert.equal(preview.drafts[0].resolved.filter(f => f.severity === 'blocker').length, 1);
    assert.equal(preview.drafts[0].afterBlockers, 0);
});
test('expiry preview adds a blocker for a previously supported claim', async () => {
    const { w } = await ready();
    const preview = previewSourceChange(w, { ...w.sources[0], expiresAt: '2020-01-01' });
    assert.equal(preview.draftsWithNewBlockers, 1);
    assert.ok(preview.drafts[0].added.some(f => /expired|current/i.test(f.explanation + f.title)));
});
test('unrelated source changes keep findings and do not require review refresh', async () => {
    const { w } = await ready();
    const unrelated = { ...w.sources[2], product: 'Other product' };
    const preview = previewSourceChange(w, unrelated);
    assert.equal(preview.changedDrafts, 0);
    assert.equal(preview.reviewsToRefresh, 0);
});
test('source preview checks extracted attachment claims and rejects missing sources', async () => {
    const { w, d } = await setup('Reporting overview.');
    d.attachment = { key: 'x', name: 'study.pdf', type: 'pdf', size: 10, hash: 'a'.repeat(64), extractedText: 'Our internal study measured 18% less reporting time on selected tasks.', extractionConfirmed: true };
    const revised = { ...w.sources[0], excerpt: w.sources[0].excerpt.replace('18%', '12%'), approvedWording: w.sources[0].approvedWording.replace('18%', '12%') };
    assert.equal(previewSourceChange(w, revised).draftsWithNewBlockers, 1);
    assert.throws(() => previewSourceChange(w, { ...revised, id: 'absent' }), /existing source/);
});

test('source.save rejects a source with missing required fields', async () => {
    const { w } = await setup();
    const base = { ...w.sources[0] };
    for (const field of ['title', 'excerpt', 'approvedWording', 'status', 'product', 'market']) {
        await assert.rejects(() => execute(w, admin, { action: 'source.save', source: { ...base, [field]: '' } }), /required/i);
        await assert.rejects(() => execute(w, admin, { action: 'source.save', source: { ...base, [field]: '   ' } }), /required/i);
    }
});
test('source.save rejects an invalid status value', async () => {
    const { w } = await setup();
    await assert.rejects(() => execute(w, admin, { action: 'source.save', source: { ...w.sources[0], status: 'published' } }), /status/i);
});
