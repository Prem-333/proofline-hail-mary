import { db, failure, json } from '@/lib/server';
import { DomainError } from '@/lib/domain';
import { scanFreshness } from '@/lib/freshness';
import { verifyMonitorToken } from '@/lib/monitor-auth';
import type { Workspace } from '@/lib/types';

export async function POST(req: Request) {
    try {
        try { await verifyMonitorToken((req.headers.get('authorization') || '').replace(/^Bearer /, '')); }
        catch { throw new DomainError('An authorised monitor workflow is required.', 401); }
        const cursor = new URL(req.url).searchParams.get('after') || '';
        if (cursor.length > 100 || !/^[a-zA-Z0-9-]*$/.test(cursor)) throw new DomainError('Invalid scan cursor.');
        const now = new Date().toISOString(), cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
        const rows = await db().prepare("SELECT id,state,revision FROM workspaces WHERE id>? AND (mode='private' OR created_at>?) ORDER BY id LIMIT 10").bind(cursor, cutoff).all<{ id: string; state: string; revision: number }>();
        let affected = 0, conflicts = 0;
        for (const row of rows.results) {
            const state: Workspace = JSON.parse(row.state);
            const result = scanFreshness(state, 'scheduled');
            const saved = await db().prepare('UPDATE workspaces SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(state), now, row.id, row.revision).run();
            if (saved.meta.changes !== 1) conflicts++; else affected += result.items.length;
        }
        return json({ processed: rows.results.length, affected, conflicts, checkedAt: now, nextCursor: rows.results.length === 10 ? rows.results[rows.results.length - 1].id : null });
    } catch (e) { return failure(e); }
}
