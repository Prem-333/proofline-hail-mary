import type { Brand, Draft, Finding, SemanticMatch, Source } from './types';
const STOP = new Set('a an the and or to for of on in with our your their is are was were be using use all every from as by at it its this that start today more less not no'.split(' '));
export function words(s: string) { return s.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(w => w.length > 1 && !STOP.has(w)); }
export function overlap(a: string, b: string) { const x = new Set(words(a)), y = new Set(words(b)); return [...x].filter(w => y.has(w)).length / Math.max(1, Math.min(x.size, y.size)); }
export function sentences(s: string) { return s.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean); }
const numerical = (s: string) => (s.match(/\b\d+(?:\.\d+)?[\s-]*(?:%|days?\b|hours?\b|months?\b|years?\b|minutes?\b)/gi) || []).map(x => x.toLowerCase().replace(/[\s-]+/g, '').replace(/s$/, ''));
export function sourceCurrent(s: Source, now = Date.now()) { return s.status === 'approved' && (!s.expiresAt || Date.parse(s.expiresAt + 'T23:59:59Z') >= now); }
function linear(n: number) { n /= 255; return n <= .04045 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4); }
export function contrast(a: string, b: string) {
    const lum = (s: string) => { const rgb = [1, 3, 5].map(i => linear(parseInt(s.slice(i, i + 2), 16))); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function analyse(draft: Draft, sources: Source[], brand: Brand, semantic: SemanticMatch[] = [], now = Date.now()) {
    const findings: Finding[] = [], evidence: {
        quote: string;
        sourceId: string;
        sourceVersion: number;
        method: string;
    }[] = [];
    const add = (f: Omit<Finding, 'id'>) => findings.push({ ...f, id: `f-${findings.length + 1}` });
    const content = [draft.content, draft.attachment?.extractedText].filter(Boolean).join('\n');
    for (const [term, replacement] of Object.entries(brand.preferredTerms)) {
        if (content.toLowerCase().includes(term.toLowerCase()))
            add({ category: 'terminology', severity: 'advisory', title: 'Use the approved term', quote: term, explanation: `The brand vocabulary uses “${replacement}” instead of “${term}”.`, suggestion: replacement, outcome: 'rule' });
    }
    for (const term of brand.bannedTerms)
        if (content.toLowerCase().includes(term.toLowerCase()))
            add({ category: 'tone', severity: 'advisory', title: 'Replace promotional hype', quote: term, explanation: `“${term}” conflicts with the brand's measured voice. ${brand.voice}`, suggestion: 'useful', outcome: 'rule' });
    const eligible = sources.filter(s => s.product.toLowerCase() === draft.product.toLowerCase() && (s.market === 'Global' || s.market.toLowerCase() === draft.market.toLowerCase()));
    for (const sentence of sentences(content)) {
        const nums = numerical(sentence), absolute = /\b(guarantee[ds]?|always|every\s+(?:team|customer)|best|fastest|certified|proven|risk.free)\b/i.test(sentence);
        if (!nums.length && !absolute)
            continue;
        const ranked = eligible.map(s => {
            const sem = semantic.find(m => m.sourceId === s.id && m.sentence === sentence);
            const lex = overlap(sentence, s.excerpt + ' ' + s.approvedWording);
            return { s, score: lex + (sem && sem.score >= .4 ? sem.score * .3 : 0), lex };
        }).sort((a, b) => b.score - a.score);
        const candidates = ranked.filter(r => r.score >= .3);
        if (!candidates.length) {
            add({ category: 'claim', severity: 'blocker', title: 'Evidence needed', quote: sentence, explanation: 'No applicable approved source was found for this claim. Add evidence for the same product and market, or remove the claim.', outcome: 'unverified' });
            continue;
        }
        const current = candidates.filter(r => sourceCurrent(r.s, now));
        const selected = (current[0] || candidates[0]).s;
        const link = { sourceId: selected.id, sourceVersion: selected.version };
        if (!sourceCurrent(selected, now)) {
            add({ category: 'claim', severity: 'blocker', title: selected.status === 'draft' ? 'Source is not approved' : 'Evidence has expired', quote: sentence, explanation: `“${selected.title}” is ${selected.status === 'draft' ? 'still a draft' : `no longer valid (${selected.expiresAt})`}. A brand owner must approve current evidence before this claim can be released.`, outcome: 'unverified', ...link });
            continue;
        }
        if (current.length > 1 && overlap(current[1].s.approvedWording.replace(/\d+(?:\.\d+)?/g, ''), selected.approvedWording.replace(/\d+(?:\.\d+)?/g, '')) >= .8 && numerical(current[1].s.approvedWording).join() !== numerical(selected.approvedWording).join() && numerical(current[1].s.approvedWording).length && nums.length) {
            add({ category: 'claim', severity: 'blocker', title: 'Approved sources disagree', quote: sentence, explanation: `“${selected.title}” and “${current[1].s.title}” provide different figures. Ask the source owner to resolve this conflict.`, outcome: 'conflicting', ...link });
            continue;
        }
        const sourceNums = numerical(selected.excerpt + ' ' + selected.approvedWording);
        const mismatch = nums.some(n => !sourceNums.includes(n));
        const scope = absolute && !/\bguarantee[ds]?\b/i.test(selected.approvedWording);
        const missingQualifier = ['internal', 'selected', 'up to'].some(q => selected.approvedWording.toLowerCase().includes(q) && !sentence.toLowerCase().includes(q));
        if (mismatch || scope || missingQualifier) {
            add({ category: 'claim', severity: 'blocker', title: mismatch ? 'The figure exceeds the evidence' : 'Keep the claim within scope', quote: sentence, explanation: mismatch ? `The approved source supports “${selected.approvedWording}” and does not support ${nums.filter(n => !sourceNums.includes(n)).join(', ')}.` : `The source is qualified. A guarantee, universal result or missing qualification extends beyond the approved wording.`, suggestion: selected.approvedWording, outcome: 'contradicted', ...link });
        }
        else {
            evidence.push({ quote: sentence, sourceId: selected.id, sourceVersion: selected.version, method: semantic.length ? 'Local semantic retrieval + numeric/rule checks' : 'Lexical retrieval + numeric/rule checks' });
        }
    }
    if (draft.attachment?.type === 'image') {
        if (!draft.altText.trim())
            add({ category: 'accessibility', severity: 'blocker', title: 'Add an image description', quote: draft.attachment.name, explanation: 'The image needs a useful text alternative for readers who cannot see it. Describe the message, not the file format.', outcome: 'rule' });
        const ratio = contrast(draft.foreground, draft.background);
        if (ratio < brand.minContrast)
            add({ category: 'accessibility', severity: 'blocker', title: 'Text contrast is too low', quote: `${draft.foreground} on ${draft.background}`, explanation: `The selected text/background pair has ${ratio.toFixed(2)}:1 contrast; the brand requires ${brand.minContrast}:1 for normal text. This check applies to the colours you supplied, not every pixel of the image.`, outcome: 'rule' });
        if (!brand.colors.map(c => c.toLowerCase()).includes(draft.foreground.toLowerCase()))
            add({ category: 'visual', severity: 'advisory', title: 'Colour outside the approved palette', quote: draft.foreground, explanation: 'The supplied foreground colour is not in the approved palette. Select a brand colour or record the reviewer’s exception.', suggestion: brand.colors[0], outcome: 'rule' });
    }
    if (draft.attachment && !draft.attachment.extractionConfirmed)
        add({ category: 'extraction', severity: 'blocker', title: 'Confirm the extracted content', quote: draft.attachment.name, explanation: 'Compare the extracted text with the original file. Correct missing or misread text and confirm it before review; extraction can miss visual content.', outcome: 'rule' });
    return { findings, evidence, incomplete: !!draft.attachment && !draft.attachment.extractionConfirmed };
}
