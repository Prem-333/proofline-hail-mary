'use client';
import { useState } from 'react';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { previewSourceChange } from '@/lib/source-impact';
import { commandSchema } from '@/lib/validation';
import type { Source, Workspace } from '@/lib/types';

export function SourceImpact({ workspace, proposed }: { workspace: Workspace; proposed: Source }) {
    const [result, setResult] = useState<{ workspace: Workspace; key: string; data: ReturnType<typeof previewSourceChange> } | null>(null);
    const [error, setError] = useState('');
    const key = JSON.stringify(proposed);
    const current = result?.workspace === workspace && result.key === key;
    function preview() {
        const checked = commandSchema.safeParse({ action: 'source.save', source: proposed });
        if (!checked.success) {
            setError('Complete the source fields before previewing: ' + checked.error.issues.map(i => i.message).join(' '));
            return;
        }
        setError('');
        setResult({ workspace, key, data: previewSourceChange(workspace, proposed) });
    }
    return <section className="source-impact" aria-label="Source change preview">
        <div className="impact-heading"><FlaskConical size={20}/><div><h3>Check the change before you save.</h3><p>Compare draft findings against the saved and proposed source.</p></div></div>
        <button type="button" className="secondary" onClick={preview}>Preview draft impact <ArrowRight size={15}/></button>
        <div aria-live="polite">
            {error && <p className="alert">{error}</p>}
            {result && !current && <p className="impact-stale">The source or workspace changed. Run the preview again.</p>}
            {current && result && <>
                <div className="impact-version"><span>Saved v{result.data.sourceVersion}</span><ArrowRight size={16}/><span>Proposed v{result.data.proposedVersion}</span><small>Not saved</small></div>
                <div className="impact-counts">
                    <div><strong>{result.data.changedDrafts}</strong><span>drafts with changed findings</span></div>
                    <div><strong>{result.data.draftsWithNewBlockers}</strong><span>drafts with new blockers</span></div>
                    <div><strong>{result.data.reviewsToRefresh}</strong><span>reviews to refresh after saving</span></div>
                </div>
                {!result.data.drafts.length && <p>No drafts yet. Create a draft to compare this change.</p>}
                {result.data.drafts.map(d => <details className="impact-draft" key={d.id} open={d.changed}>
                    <summary><span>{d.title} <small>v{d.version}</small></span><span className={d.changed ? 'impact-changed' : 'impact-unchanged'}>{d.changed ? `${d.added.length} added · ${d.resolved.length} resolved` : 'No finding changes'}</span></summary>
                    <p className="impact-blockers">Blocking findings: <b>{d.beforeBlockers}</b><ArrowRight size={13}/><b>{d.afterBlockers}</b></p>
                    {d.added.map((f, i) => <div className="impact-finding added" key={'a'+i}><span>Added · {f.severity === 'blocker' ? 'Must fix' : 'Review'}</span><h4>{f.title}</h4><blockquote>{f.quote}</blockquote><p>{f.explanation}</p></div>)}
                    {d.resolved.map((f, i) => <div className="impact-finding resolved" key={'r'+i}><span>Resolved in preview</span><h4>{f.title}</h4><blockquote>{f.quote}</blockquote></div>)}
                    {!d.changed && <p>The explicit checks return the same findings for this draft.</p>}
                </details>)}
                <p className="impact-scope">Preview only: saved drafts, lexical evidence matching and explicit rules. No approval is granted. Only reviews linked to changed evidence require refresh. Newly relevant sources are included. Unrelated approvals remain valid.</p>
            </>}
        </div>
    </section>;
}
