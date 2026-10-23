import { env } from 'cloudflare:workers';
import { DomainError, hash } from './domain';
import type { Actor, Workspace } from './types';
export function db() { if (!env.DB)
    throw new DomainError('The database is not ready. Please try again shortly.', 503); return env.DB; }
export function bucket() { if (!env.BUCKET)
    throw new DomainError('File storage is not ready.', 503); return env.BUCKET; }
export function identity(req: Request) { const id = req.headers.get('oai-authenticated-user-id'); if (!id)
    return null; const raw = req.headers.get('oai-authenticated-user-full-name'); let name = raw; try {
    if (raw && req.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8')
        name = decodeURIComponent(raw);
}
catch { } return { id, name: name || req.headers.get('oai-authenticated-user-email') || 'Workspace member' }; }
export function cookie(req: Request, name: string) { return req.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) || ''; }
export function sameOrigin(req: Request) { const origin = req.headers.get('origin'); if (!origin || origin !== new URL(req.url).origin)
    throw new DomainError('This action must come from the Proofline application.', 403); }
export async function body(req: Request) { sameOrigin(req); if (Number(req.headers.get('content-length') || 0) > 200000)
    throw new DomainError('Request is too large.', 413); const text = await req.text(); if (text.length > 200000)
    throw new DomainError('Request is too large.', 413); try {
    return JSON.parse(text);
}
catch {
    throw new DomainError('Invalid request body.');
} }
export function json(value: unknown, status = 200, headers: Record<string, string> = {}) { return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } }); }
export function failure(e: unknown) { if (e instanceof DomainError)
    return json({ error: e.message }, e.status); if (e && typeof e === 'object' && 'issues' in e)
    return json({ error: 'Please check the form fields.', details: (e as any).issues.map((x: any) => x.message).slice(0, 4) }, 400); console.error('Proofline request failed', e instanceof Error ? e.message : 'unknown'); return json({ error: 'The request could not be completed. Your saved work is unchanged. Please try again.' }, 500); }
export async function limit(req: Request, scope: string, max: number, seconds = 3600) {
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    const epoch = Math.floor(Date.now() / 1000);
    const window = Math.floor(epoch / seconds);
    const key = await hash(`${scope}:${ip}:${window}`);
    const row = await db().prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, epoch + seconds).first<{
        count: number;
    }>();
    if (row && row.count > max)
        throw new DomainError('Too many requests. Please wait and try again.', 429);
}
export type Access = {
    row: {
        id: string;
        owner: string;
        mode: 'demo' | 'private';
        state: string;
        revision: number;
        created_at: string;
    };
    state: Workspace;
    actor: Actor;
    signedIn: boolean;
};
export async function access(req: Request, id: string): Promise<Access> {
    if (!id || id.length > 100)
        throw new DomainError('Workspace not found.', 404);
    const row = await db().prepare('SELECT * FROM workspaces WHERE id=?').bind(id).first<Access['row']>();
    if (!row)
        throw new DomainError('Workspace not found.', 404);
    const user = identity(req);
    let actor: Actor;
    if (row.mode === 'demo') {
        const token = cookie(req, 'proofline_demo');
        if (!token || await hash(token) !== row.owner)
            throw new DomainError('Workspace not found.', 404);
        if (Date.now() - Date.parse(row.created_at) > 7 * 86400000)
            throw new DomainError('This sample workspace has expired. Start a new sample.', 410);
        const role = req.headers.get('x-demo-role') || 'creator';
        if (!['creator', 'reviewer', 'admin'].includes(role))
            throw new DomainError('Invalid demo role.');
        actor = { id: `demo-${role}`, name: role === 'creator' ? 'Alex · creator' : role === 'reviewer' ? 'Morgan · reviewer' : 'Jordan · brand owner', role: role as Actor['role'] };
    }
    else {
        if (!user)
            throw new DomainError('Sign in to access this workspace.', 401);
        const member = await db().prepare('SELECT role,display_name FROM memberships WHERE workspace_id=? AND user_id=?').bind(id, user.id).first<{
            role: Actor['role'];
            display_name: string;
        }>();
        if (!member)
            throw new DomainError('Workspace not found.', 404);
        actor = { id: user.id, name: member.display_name, role: member.role };
    }
    return { row, state: JSON.parse(row.state), actor, signedIn: !!user };
}
export async function save(a: Access) { const res = await db().prepare('UPDATE workspaces SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(a.state), new Date().toISOString(), a.row.id, a.row.revision).run(); if (res.meta.changes !== 1)
    throw new DomainError('Someone changed this workspace. Refresh and try again; your change was not applied.', 409); a.row.revision++; }
export function snapshot(a: Access) { return { id: a.row.id, revision: a.row.revision, mode: a.row.mode, state: a.state, actor: a.actor, signedIn: a.signedIn }; }
export async function checkAttachment(workspaceId: string, attachment: any) { if (!attachment)
    return; const row = await db().prepare('SELECT hash FROM uploads WHERE key=? AND workspace_id=?').bind(attachment.key, workspaceId).first<{
    hash: string;
}>(); if (!row || row.hash !== attachment.hash)
    throw new DomainError('Upload this file to the current workspace before saving.'); }
