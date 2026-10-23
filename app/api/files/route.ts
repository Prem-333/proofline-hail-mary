import { access, bucket, db, failure, json, limit, sameOrigin } from '@/lib/server';
import { DomainError, hash, requireRole } from '@/lib/domain';
export async function POST(req: Request) {
    try {
        sameOrigin(req);
        await limit(req, 'files', 30);
        const id = new URL(req.url).searchParams.get('workspace') || '';
        const a = await access(req, id);
        requireRole(a.actor, ['admin', 'creator']);
        if (Number(req.headers.get('content-length') || 0) > 10500000)
            throw new DomainError('Files must be 10 MB or smaller.', 413);
        const form = await req.formData();
        const file = form.get('file');
        if (!(file instanceof File) || file.size > 10485760 || file.size === 0)
            throw new DomainError('Choose a PDF, PNG or JPEG up to 10 MB.');
        const bytes = await file.arrayBuffer();
        const magic = new Uint8Array(bytes.slice(0, 8));
        const isPdf = new TextDecoder().decode(magic).startsWith('%PDF-');
        const isPng = magic[0] === 137 && magic[1] === 80 && magic[2] === 78 && magic[3] === 71;
        const isJpeg = magic[0] === 255 && magic[1] === 216 && magic[2] === 255;
        if (!isPdf && !isPng && !isJpeg)
            throw new DomainError('The file contents are not a supported PDF, PNG or JPEG.');
        const mime = isPdf ? 'application/pdf' : isPng ? 'image/png' : 'image/jpeg';
        const key = `${id}/${crypto.randomUUID()}`, digest = await hash(bytes);
        const name = file.name.slice(0, 160);
        const result = await db().prepare('INSERT INTO uploads (key,workspace_id,bytes,hash,mime,name,created_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(bytes),0) FROM uploads WHERE workspace_id=?)+?<=41943040 AND (SELECT COUNT(*) FROM uploads WHERE workspace_id=?)<12').bind(key, id, file.size, digest, mime, name, new Date().toISOString(), id, file.size, id).run();
        if (result.meta.changes !== 1)
            throw new DomainError('Workspace file limit reached (12 files / 40 MB).');
        try {
            await bucket().put(key, bytes, { httpMetadata: { contentType: mime } });
        }
        catch (e) {
            await db().prepare('DELETE FROM uploads WHERE key=?').bind(key).run();
            throw e;
        }
        return json({ key, hash: digest, name, size: file.size, type: isPdf ? 'pdf' : 'image' }, 201);
    }
    catch (e) {
        return failure(e);
    }
}
export async function GET(req: Request) {
    try {
        const key = new URL(req.url).searchParams.get('key') || '';
        const id = key.split('/')[0];
        await access(req, id);
        const object = await bucket().get(key);
        if (!object)
            throw new DomainError('File not found.', 404);
        return new Response(object.body as BodyInit, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': 'inline' } });
    }
    catch (e) {
        return failure(e);
    }
}
