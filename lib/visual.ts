import type { Attachment, Finding, OCRWord } from './types';
export const OCR_THRESHOLD = 85;
export function wordsText(words: OCRWord[]) {
    return words.map((w, i) => (i ? words[i - 1].line === w.line ? ' ' : '\n' : '') + w.text).join('');
}
export function uncertainWords(a?: Attachment) { return (a?.words || []).filter(w => w.confidence < OCR_THRESHOLD && !w.confirmed); }
export function imageText(a: Attachment) { return [wordsText(a.words || []), a.supplementalText?.trim()].filter(Boolean).join('\n'); }
const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim().replace(/\s+/g, ' ');
export function findingWordIds(f: Finding, words: OCRWord[]) {
    const query = normalise(f.quote);
    if (!query || f.category === 'extraction' || f.category === 'accessibility' || f.category === 'visual') return [];
    const ids = new Set<string>();
    for (let i = 0; i < words.length; i++) {
        let text = '';
        for (let j = i; j < words.length && text.length <= query.length; j++) {
            text = normalise(text + ' ' + words[j].text);
            if (text === query) { for (let k = i; k <= j; k++) ids.add(words[k].id); break; }
            if (!query.startsWith(text)) break;
        }
    }
    return [...ids];
}
