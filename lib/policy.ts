import { analyse } from './analysis.ts';
import type { Brand, Workspace, PolicyDecision, PolicyTrial } from './types';
export function ruleOptions(brand: Brand) {
    return [...brand.bannedTerms.map(t => ({ key: 'tone:' + t.toLowerCase(), label: `Avoid “${t}”` })), ...Object.entries(brand.preferredTerms).map(([t,r]) => ({ key: 'terminology:' + t.toLowerCase(), label: `“${t}” → “${r}”` })), { key: 'visual:palette', label: 'Approved palette' }, { key: 'accessibility:contrast', label: 'Minimum contrast' }, { key: 'accessibility:description', label: 'Image description' }];
}
export function decisionGroups(w: Workspace) {
    const grouped = new Map<string, PolicyDecision[]>();
    for (const d of w.decisions || []) grouped.set(d.ruleKey, [...(grouped.get(d.ruleKey) || []), d]);
    return [...grouped].map(([ruleKey, decisions]) => ({ ruleKey, label: decisions[decisions.length - 1].ruleLabel, decisions, repeated: decisions.length >= 2 })).sort((a,b) => b.decisions.length - a.decisions.length);
}
const signature = (f: { category: string; severity: string; title: string; quote: string; explanation: string }) => JSON.stringify([f.category, f.severity, f.title, f.quote, f.explanation]);
export function testPolicy(w: Workspace, brand: Brand): PolicyTrial['drafts'] {
    return w.drafts.map(d => {
        const before = analyse(d, w.sources, w.brand, d.review?.semantic || []), after = analyse(d, w.sources, brand, d.review?.semantic || []);
        const beforeKeys = new Set(before.findings.map(signature)), afterKeys = new Set(after.findings.map(signature));
        return { id: d.id, title: d.title, before: before.findings.filter(f => f.severity === 'blocker').length, after: after.findings.filter(f => f.severity === 'blocker').length, added: after.findings.filter(f => !beforeKeys.has(signature(f))).map(f => f.title + ': ' + f.quote), resolved: before.findings.filter(f => !afterKeys.has(signature(f))).map(f => f.title + ': ' + f.quote) };
    });
}
