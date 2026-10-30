import { analyse, sourceCurrent, REVIEW_RULESET_VERSION } from './analysis.ts';
import type { Draft, Workspace, FreshnessItem } from './types';

export function dependenciesNow(d: Draft, w: Workspace, now = Date.now()) {
    return analyse(d, w.sources, w.brand, d.review?.semantic || [], now).dependencies;
}
export function evidenceState(w: Workspace, ids?: string[], now = Date.now()) {
    return JSON.stringify(w.sources.filter(s => !ids || ids.includes(s.id)).map(s => [s.id, s.version, s.status, s.expiresAt, s.excerpt, s.approvedWording, s.product, s.market, sourceCurrent(s, now)]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));
}
export function evidenceIssues(d: Draft, w: Workspace, now = Date.now()) {
    if (!d.review) return [];
    if (!d.review.dependencies) return ['Run a new review to record source dependencies.'];
    if (d.review.rulesetVersion !== REVIEW_RULESET_VERSION) return ['Review checks have been updated. Run a fresh review before release.'];
    const reasons: string[] = [];
    for (const dep of d.review.dependencies) {
        const s = w.sources.find(s => s.id === dep.sourceId);
        if (!s) reasons.push('A linked source was removed.');
        else if (dep.currentAtReview && !sourceCurrent(s, now)) reasons.push(`${s.title}: ${s.status === 'draft' ? 'no longer approved' : 'expired'}.`);
        else if (s.version !== dep.sourceVersion) reasons.push(`${s.title}: reviewed v${dep.sourceVersion}, now v${s.version}.`);
    }
    const previous = new Set(d.review.dependencies.map(s => s.sourceId));
    if (dependenciesNow(d, w, now).some(s => !previous.has(s.sourceId))) reasons.push('New or revised evidence now matches a claim.');
    return reasons;
}
export function freshnessItems(w: Workspace, now = Date.now()): FreshnessItem[] {
    return w.drafts.flatMap(d => {
        const reasons = evidenceIssues(d, w, now);
        return reasons.length ? [{ draftId: d.id, title: d.title, approved: !!d.approval, reasons, sourceIds: d.review?.dependencies?.map(x => x.sourceId) || [] }] : [];
    });
}
export function scanFreshness(w: Workspace, trigger: 'manual' | 'scheduled' | 'source-change', now = Date.now()) {
    w.monitor = { lastScheduledAt: trigger === 'scheduled' ? new Date(now).toISOString() : w.monitor?.lastScheduledAt, checkedAt: new Date(now).toISOString(), trigger, items: freshnessItems(w, now) };
    return w.monitor;
}
