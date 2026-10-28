import { z } from 'zod';
const short = z.string().trim().min(1).max(160), hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const ocrWord = z.object({ id: z.string().min(1).max(60), text: z.string().max(120), originalText: z.string().max(120), confidence: z.number().min(0).max(100), x0: z.number().min(0), y0: z.number().min(0), x1: z.number().min(0), y1: z.number().min(0), line: z.number().int().min(0), confirmed: z.boolean() });
const attachment = z.object({ key: z.string().max(200), name: z.string().max(160), type: z.enum(['pdf', 'image']), size: z.number().min(1).max(10485760), hash: z.string().regex(/^[a-f0-9]{64}$/), extractedText: z.string().max(30000), pageCount: z.number().int().min(1).max(5).optional(), width: z.number().max(20000).optional(), height: z.number().max(20000).optional(), ocrConfidence: z.number().min(0).max(100).optional(), extractionConfirmed: z.boolean(), words: z.array(ocrWord).max(800).optional(), supplementalText: z.string().max(2000).optional() }).refine(a => !a.words?.length || (a.type === 'image' && !!a.width && !!a.height && new Set(a.words.map(w => w.id)).size === a.words.length && a.words.every(w => w.x1 > w.x0 && w.y1 > w.y0 && w.x1 <= a.width! && w.y1 <= a.height!)), 'Image word regions must have unique IDs and valid bounds.');
export const draftInput = z.object({ title: short, content: z.string().max(30000), channel: short, intent: z.string().max(1000), product: short, market: short, altText: z.string().max(2000), foreground: hex, background: hex, attachment: attachment.optional() }).refine(v => !!v.content.trim() || !!v.attachment, 'Add text or a file.').refine(v => v.content.trim().split(/\s+/).length <= 1000, 'Text drafts support up to 1,000 words.');
const source = z.object({ id: z.string().optional(), title: short, excerpt: z.string().trim().min(10).max(12000), approvedWording: z.string().trim().min(5).max(3000), status: z.enum(['approved', 'draft']), expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s))), product: short, market: short });
export const brandInput = z.object({ name: short, voice: z.string().max(1500), bannedTerms: z.array(z.string().trim().min(1).max(100)).max(30), preferredTerms: z.record(z.string().min(1).max(100)).refine(v => Object.keys(v).length <= 30), colors: z.array(hex).min(1).max(12), minContrast: z.number().min(3).max(21) });
const base = { draftId: z.string().min(1).max(100) };
export const commandSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('demo.round3') }),
    z.object({ action: z.literal('freshness.scan') }),
    z.object({ action: z.literal('policy.propose'), ruleKey: short, rationale: z.string().trim().min(8).max(2000), brand: brandInput }),
    z.object({ action: z.literal('policy.update'), proposalId: short, rationale: z.string().trim().min(8).max(2000), brand: brandInput }),
    z.object({ action: z.literal('policy.test'), proposalId: short }),
    z.object({ action: z.literal('policy.approve'), proposalId: short }),
    z.object({ action: z.literal('source.save'), source }),
    z.object({ action: z.literal('brand.save'), brand: brandInput }),
    z.object({ action: z.literal('draft.create'), draft: draftInput }),
    z.object({ action: z.literal('draft.save'), ...base, draft: draftInput }),
    z.object({ action: z.literal('draft.analyse'), ...base, semantic: z.array(z.object({ sentence: z.string().max(2000), sourceId: z.string().max(100), score: z.number().min(-1).max(1) })).max(500).optional() }),
    z.object({ action: z.literal('draft.submit'), ...base }),
    z.object({ action: z.literal('draft.approve'), ...base, note: z.string().max(2000) }),
    z.object({ action: z.literal('draft.comment'), ...base, body: z.string().trim().min(1).max(2000) }),
    z.object({ action: z.literal('draft.changes'), ...base, ruleKey: z.string().max(160).optional(), body: z.string().trim().min(1).max(2000) }),
    z.object({ action: z.literal('finding.resolve'), ...base, findingId: z.string().max(100), reason: z.string().trim().min(8).max(1000) }),
]);
