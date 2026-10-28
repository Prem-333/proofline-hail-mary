'use client';
import { useState } from 'react';
import type { Attachment, Finding } from '@/lib/types';
import { findingWordIds, OCR_THRESHOLD, uncertainWords, imageText } from '@/lib/visual';

export function VisualReview({ attachment, findings, editable, onChange }: { attachment: Attachment; findings: Finding[]; editable: boolean; onChange: (a: Attachment) => void }) {
    const [selected, setSelected] = useState(''), [filter, setFilter] = useState<'all' | 'uncertain'>('uncertain');
    const words = attachment.words || [], uncertain = uncertainWords(attachment);
    const word = words.find(w => w.id === selected);
    const links = findings.map(f => ({ f, ids: findingWordIds(f, words) })).filter(x => x.ids.length);
    const flagged = new Set(links.flatMap(x => x.ids));
    const active = new Set(links.filter(x => x.ids.includes(selected)).flatMap(x => x.ids));
    const visible = filter === 'all' ? words : uncertain;
    function change(text: string, confirm = false) {
        const next = words.map(w => w.id === selected ? { ...w, text, confirmed: confirm } : w);
        onChange({ ...attachment, words: next, extractedText: imageText({ ...attachment, words: next }), extractionConfirmed: false });
        if (confirm) setSelected(next.find(w => w.confidence < OCR_THRESHOLD && !w.confirmed)?.id || selected);
    }
    return <section className="visual-review" aria-label="Image evidence overlay">
        <div className="section-label"><span>IMAGE REVIEW</span><span>{words.length} regions · {uncertain.length} to confirm</span></div>
        <div className="visual-canvas">
            <img src={'/api/files?key=' + encodeURIComponent(attachment.key)} alt="Original uploaded image with selectable text regions"/>
            {words.map(w => <button type="button" key={w.id} title={`${w.text} · ${Math.round(w.confidence)}% confidence`} aria-label={`Image region: ${w.text}, ${Math.round(w.confidence)} percent confidence`} aria-pressed={selected === w.id} className={`word-region ${w.confidence < OCR_THRESHOLD && !w.confirmed ? 'uncertain' : ''} ${flagged.has(w.id) ? 'flagged' : ''} ${selected === w.id || active.has(w.id) ? 'selected' : ''}`} style={{ left: `${100*w.x0/attachment.width!}%`, top: `${100*w.y0/attachment.height!}%`, width: `${100*(w.x1-w.x0)/attachment.width!}%`, height: `${100*(w.y1-w.y0)/attachment.height!}%` }} onClick={() => setSelected(w.id)}/>) }
        </div>
        {!words.length ? <p className="warning-box">No word locations are available for this image. Upload it again to run region extraction. If no text is detected, transcribe it in the extracted-text field and compare it with the original.</p> : <>
            <p className="fine">Amber: uncertain text. Red: a finding. Teal: selected region. Correct transcription errors here; to change the actual design or claim, revise and upload the original image.</p>
            {!!links.length && <div className="image-finding-links">{links.map(({f,ids}) => <button type="button" className="secondary" key={f.id} onClick={() => {setSelected(ids[0]);setFilter('all');}}>{f.title} <span>Locate on image</span></button>)}</div>}
            <div className="region-editor">
                <div><label className="field"><span>Correction queue</span><select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="uncertain">Uncertain regions ({uncertain.length})</option><option value="all">All regions ({words.length})</option></select></label>
                    <div className="word-list">{visible.map(w => <button type="button" key={w.id} className={selected === w.id ? 'selected' : ''} onClick={() => setSelected(w.id)}>{w.text || '(removed)'} <small>{Math.round(w.confidence)}%</small></button>)}</div>
                    {!visible.length && <p>No uncertain regions remain. Inspect the full image for omissions, then confirm the transcription below.</p>}
                </div>
                <div>{word ? <><label className="field"><span>Region text</span><input aria-label="Region text" value={word.text} readOnly={!editable} maxLength={120} onChange={e => change(e.target.value)}/></label><p className="fine">OCR read “{word.originalText}” · {Math.round(word.confidence)}% confidence · {word.confirmed ? 'confirmed by the editor' : 'not individually confirmed'}</p>{editable && <button type="button" className="secondary" onClick={() => change(word.text, true)}>Confirm region</button>}</> : <p>Select a word in the image or correction queue. Every region below {OCR_THRESHOLD}% confidence needs individual confirmation before approval.</p>}</div>
            </div>
            <label className="field"><span>Text missed by OCR</span><textarea rows={2} maxLength={2000} readOnly={!editable} value={attachment.supplementalText || ''} placeholder="Transcribe any visible text that has no region." onChange={e => { const next = { ...attachment, supplementalText: e.target.value, extractionConfirmed: false }; onChange({ ...next, extractedText: imageText(next) }); }}/><small>Included in the review, without an automatic image location. Compare it with the original before confirming.</small></label>
        </>}
    </section>;
}
