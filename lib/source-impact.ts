import { analyse } from './analysis.ts';
import type { Finding, Source, Workspace } from './types';

const findingKey = (f: Finding) => JSON.stringify([
    f.category, f.severity, f.title, f.quote, f.explanation, f.suggestion, f.sourceId,
]);

/** A read-only comparison using the same rules as a normal review. */
export function previewSourceChange(workspace: Workspace, proposed: Source, now = Date.now()) {
    const original = workspace.sources.find(s => s.id === proposed.id);
    if (!original) throw new Error('Select an existing source to preview a revision.');
    const revised = { ...proposed, version: original.version + 1 };
    const sources = workspace.sources.map(s => s.id === original.id ? revised : s);
    const drafts = workspace.drafts.map(draft => {
        const before = analyse(draft, workspace.sources, workspace.brand, [], now);
        const after = analyse(draft, sources, workspace.brand, [], now);
        const beforeKeys = new Set(before.findings.map(findingKey));
        const afterKeys = new Set(after.findings.map(findingKey));
        const added = after.findings.filter(f => !beforeKeys.has(findingKey(f)));
        const resolved = before.findings.filter(f => !afterKeys.has(findingKey(f)));
        return {
            id: draft.id, title: draft.title, version: draft.version,
            beforeBlockers: before.findings.filter(f => f.severity === 'blocker').length,
            afterBlockers: after.findings.filter(f => f.severity === 'blocker').length,
            added, resolved, changed: !!(added.length || resolved.length),
            needsReviewAfterSave: !!draft.review,
        };
    });
    return {
        sourceVersion: original.version, proposedVersion: revised.version, drafts,
        changedDrafts: drafts.filter(d => d.changed).length,
        draftsWithNewBlockers: drafts.filter(d => d.added.some(f => f.severity === 'blocker')).length,
        reviewsToRefresh: drafts.filter(d => d.needsReviewAfterSave).length,
    };
}
