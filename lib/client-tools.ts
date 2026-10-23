import type { Attachment, SemanticMatch, Source } from './types';
import { sentences } from './analysis';
let embedder: any;
export async function semanticMatches(content: string, sources: Source[], status: (s: string) => void): Promise<SemanticMatch[]> {
    status('Loading the local language model. The first download may take a minute.');
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;
    if (!embedder)
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8', device: 'wasm' });
    const lines = sentences(content).slice(0, 40).filter(s => s.length <= 2000);
    if (!lines.length || !sources.length)
        return [];
    status('Comparing the draft with evidence on this device…');
    const result = await embedder([...lines, ...sources.map(s => s.excerpt + ' ' + s.approvedWording)], { pooling: 'mean', normalize: true });
    const vectors: number[][] = result.tolist();
    return lines.flatMap((sentence, i) => sources.map((s, j) => ({ sentence, sourceId: s.id, score: Math.max(-1, Math.min(1, vectors[i].reduce((n, v, k) => n + v * vectors[lines.length + j][k], 0))) })).sort((a, b) => b.score - a.score).slice(0, 3));
}
export async function extract(file: File, status: (s: string) => void): Promise<Partial<Attachment>> {
    if (file.size > 10 * 1024 * 1024)
        throw new Error('Files must be 10 MB or smaller.');
    if (file.type === 'application/pdf') {
        status('Reading the PDF…');
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';
        const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        const pdf = await loading.promise;
        if (pdf.numPages > 5) {
            await loading.destroy();
            throw new Error('Use a PDF with five pages or fewer.');
        }
        const text: string[] = [];
        for (let n = 1; n <= pdf.numPages; n++) {
            const page = await pdf.getPage(n);
            const content = await page.getTextContent();
            text.push(content.items.map((item: any) => item.str || '').join(' '));
        }
        const pageCount = pdf.numPages;
        await loading.destroy();
        return { type: 'pdf', pageCount, extractedText: text.join('\n').slice(0, 30000), extractionConfirmed: false };
    }
    if (!['image/png', 'image/jpeg'].includes(file.type))
        throw new Error('Choose a PDF, PNG or JPEG file.');
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width, height = bitmap.height;
    bitmap.close();
    if (width > 10000 || height > 10000 || width * height > 24000000)
        throw new Error('Use an image below 24 megapixels and 10,000 pixels per side.');
    status('Reading image text on this device…');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, { logger: m => { if (m.status === 'recognizing text')
            status(`Reading image text · ${Math.round(m.progress * 100)}%`); } });
    try {
        const { data } = await worker.recognize(file);
        return { type: 'image', width, height, ocrConfidence: data.confidence, extractedText: data.text.slice(0, 30000), extractionConfirmed: false };
    }
    finally {
        await worker.terminate();
    }
}
export function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
export function receiptHtml(r: any) {
    const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const evidence = (r.review?.evidence || []).map((e: any) => { const s = r.sources.find((s: any) => s.id === e.sourceId); return `<article><h3>${esc(s?.title)} <small>version ${esc(e.sourceVersion)}</small></h3><blockquote>${esc(e.quote)}</blockquote><p>${esc(s?.excerpt)}</p><small>${esc(s?.product)} / ${esc(s?.market)} · valid through ${esc(s?.expiresAt)}</small></article>`; }).join('');
    const exceptions = (r.review?.findings || []).filter((f: any) => f.resolution).map((f: any) => `<article><h3>${esc(f.title)}</h3><p>${esc(f.resolution.reason)}</p><small>${esc(f.resolution.by)} · ${esc(f.resolution.at)}</small></article>`).join('');
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proofline approval receipt</title><style>body{font:14px/1.7 Arial,sans-serif;color:#152c37;max-width:800px;margin:45px auto;padding:24px}header{display:flex;justify-content:space-between;border-bottom:1px solid #ccd9d2;padding-bottom:20px;color:#16675e;font-size:11px;letter-spacing:2px}h1{font:42px/1.2 Georgia;margin:35px 0 15px}h2{font:26px Georgia;margin-top:36px}h3{font-size:14px}small{color:#64736a;font-size:11px}.content{white-space:pre-wrap;background:#f4f7f1;padding:25px;border-left:3px solid #16675e}article{break-inside:avoid;border-bottom:1px solid #dae2d8;padding:10px 0 20px}blockquote{font:italic 17px/1.6 Georgia;color:#16675e;margin:15px 0}code{overflow-wrap:anywhere;font-size:10px}pre{white-space:pre-wrap;font-size:10px;background:#f7f8f5;padding:20px}button{background:#16675e;color:white;border:0;border-radius:4px;padding:11px 16px;cursor:pointer;margin-bottom:25px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:18px;background:#f7f8f5;padding:20px;margin:20px 0}.meta span{display:block;font-size:10px;color:#64736a;text-transform:uppercase;letter-spacing:1px}footer{margin-top:35px;border-top:1px solid #ccd9d2;padding-top:20px;font-size:11px;color:#64736a}@media print{button,details{display:none}body{margin:0;padding:15px;max-width:none}h2,h3{break-after:avoid}@page{margin:18mm}}</style><button onclick="print()">Print / save as PDF</button><header><strong>PROOFLINE</strong><span>APPROVAL RECEIPT</span></header><h1>${esc(r.title)}</h1><small>${esc(r.workspace)} · ${r.mode === 'demo' ? 'Synthetic sample workspace' : 'Private team workspace'} · issued ${esc(r.issuedAt)}</small><div class="meta"><div><span>Approved by</span>${esc(r.approval.name)}</div><div><span>Draft version</span>${esc(r.draftVersion)}</div><div><span>Review engine</span>${esc(r.review.engine)}</div><div><span>Policy version</span>${esc(r.approval.policyVersion)}</div></div><h2>The approved content</h2><div class="content">${esc(r.content)}</div>${r.attachment ? `<h3>Attachment: ${esc(r.attachment.name)}</h3><p class="content">${esc(r.attachment.extractedText)}</p><small>Original-file SHA-256</small><br><code>${esc(r.attachment.hash)}</code>` : ''}${r.altText ? `<h3>Image description</h3><p>${esc(r.altText)}</p>` : ''}<h2>Evidence in context</h2>${evidence || '<p>No numerical or broad-promise claim was matched by the automated checks. Human review remains necessary.</p>'}${exceptions ? '<h2>Reviewer exceptions</h2>' + exceptions : ''}<h2>The approval record</h2><p>${esc(r.approval.note)}</p><small>Approved ${esc(r.approval.at)} · review ${esc(r.approval.reviewId)}</small><p><small>Content SHA-256</small><br><code>${esc(r.approval.contentHash)}</code></p><p><small>Evidence digest</small><br><code>${esc(r.approval.sourceDigest)}</code></p><details><summary>Complete machine-readable record</summary><pre>${esc(JSON.stringify(r, null, 2))}</pre></details><footer>${esc(r.limitation)}<p>This exported document is not digitally signed; verify material decisions against the live workspace record.</p></footer></html>`;
}
