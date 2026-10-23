import { access, body, db, failure, identity, json, limit } from '@/lib/server';
import { DomainError, hash, requireRole } from '@/lib/domain';
export async function GET(req: Request) { try {
    const id = new URL(req.url).searchParams.get('workspace') || '';
    const a = await access(req, id);
    if (a.row.mode === 'demo')
        return json({ members: [], demo: true });
    const result = await db().prepare('SELECT display_name,role FROM memberships WHERE workspace_id=?').bind(id).all();
    return json({ members: result.results });
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) {
    try {
        const input = await body(req);
        await limit(req, 'invite', 30);
        if (input.action === 'join') {
            const user = identity(req);
            if (!user)
                throw new DomainError('Sign in before joining a workspace.', 401);
            if (typeof input.token !== 'string' || input.token.length > 200)
                throw new DomainError('Invalid invitation.');
            const digest = await hash(input.token);
            const invite = await db().prepare('SELECT * FROM invitations WHERE hash=? AND expires_at>? AND (used_by IS NULL OR used_by=?)').bind(digest, new Date().toISOString(), user.id).first<any>();
            if (!invite)
                throw new DomainError('This invitation is expired or already used.', 404);
            const results = await db().batch([
                db().prepare('UPDATE invitations SET used_by=? WHERE hash=? AND (used_by IS NULL OR used_by=?)').bind(user.id, digest, user.id),
                db().prepare('INSERT INTO memberships (id,workspace_id,user_id,role,display_name) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM invitations WHERE hash=? AND used_by=?) AND NOT EXISTS (SELECT 1 FROM memberships WHERE workspace_id=? AND user_id=?)').bind(crypto.randomUUID(), invite.workspace_id, user.id, invite.role, user.name, digest, user.id, invite.workspace_id, user.id),
            ]);
            if (results[0].meta.changes !== 1)
                throw new DomainError('This invitation was already used.', 409);
            return json({ id: invite.workspace_id });
        }
        const a = await access(req, input.workspaceId);
        requireRole(a.actor, ['admin']);
        if (a.row.mode !== 'private')
            throw new DomainError('Invitations are available in signed-in workspaces.');
        if (!['creator', 'reviewer'].includes(input.role))
            throw new DomainError('Choose a creator or reviewer role.');
        const token = crypto.randomUUID() + crypto.randomUUID();
        await db().prepare('INSERT INTO invitations (hash,workspace_id,role,expires_at) VALUES (?,?,?,?)').bind(await hash(token), a.row.id, input.role, new Date(Date.now() + 86400000).toISOString()).run();
        return json({ url: `${new URL(req.url).origin}/?invite=${token}`, expiresIn: '24 hours' });
    }
    catch (e) {
        return failure(e);
    }
}
