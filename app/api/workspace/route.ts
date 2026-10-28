import { access, body, checkAttachment, db, failure, identity, json, limit, save, snapshot } from '@/lib/server';
import { DomainError, execute, hash } from '@/lib/domain';
import { seedWorkspace } from '@/lib/seed';
import { commandSchema } from '@/lib/validation';
export async function GET(req: Request) {
    try {
        const id = new URL(req.url).searchParams.get('id');
        if (id)
            return json(snapshot(await access(req, id)));
        const user = identity(req);
        const spaces = user ? await db().prepare('SELECT w.id,w.mode,w.updated_at,m.role FROM workspaces w JOIN memberships m ON m.workspace_id=w.id WHERE m.user_id=? ORDER BY w.updated_at DESC').bind(user.id).all() : { results: [] };
        return json({ user, workspaces: spaces.results });
    }
    catch (e) {
        return failure(e);
    }
}
export async function POST(req: Request) {
    try {
        const input = await body(req);
        if (input.action === 'demo.start' || input.action === 'workspace.create') {
            await limit(req, 'create', 20);
            const user = identity(req);
            const demo = input.action === 'demo.start';
            if (!demo && !user)
                throw new DomainError('Sign in to create a private workspace.', 401);
            const token = crypto.randomUUID() + crypto.randomUUID(), id = crypto.randomUUID(), now = new Date().toISOString();
            const owner = demo ? await hash(token) : user!.id;
            const state = seedWorkspace();
            if (!demo)
                state.name = 'My brand workspace';
            const inserts = [db().prepare('INSERT INTO workspaces (id,owner,mode,state,revision,created_at,updated_at) VALUES (?,?,?,?,0,?,?)').bind(id, owner, demo ? 'demo' : 'private', JSON.stringify(state), now, now)];
            if (!demo)
                inserts.push(db().prepare('INSERT INTO memberships (id,workspace_id,user_id,role,display_name) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), id, user!.id, 'admin', user!.name));
            await db().batch(inserts);
            return json({ id }, 201, demo ? { 'Set-Cookie': `proofline_demo=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}` } : {});
        }
        await limit(req, 'write', 500);
        const a = await access(req, input.workspaceId);
        if (input.revision !== a.row.revision)
            throw new DomainError('This workspace changed. Refresh before applying your change.', 409);
        const command = commandSchema.parse(input.command);
        if (command.action === 'demo.round3' && a.row.mode !== 'demo') throw new DomainError('Demonstration fixtures are available only in sample workspaces.', 403);
        if (command.action === 'draft.create' || command.action === 'draft.save')
            await checkAttachment(a.row.id, command.draft.attachment);
        const result = await execute(a.state, a.actor, command);
        await save(a);
        return json({ ...snapshot(a), ...result });
    }
    catch (e) {
        return failure(e);
    }
}
