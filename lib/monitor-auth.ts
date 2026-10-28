const issuer = 'https://token.actions.githubusercontent.com';
export const MONITOR_AUDIENCE = 'https://proofline-hail-mary.dainty-shark-5340.chatgpt.site';
const repository = 'Prem-333/proofline-hail-mary';
const repositoryId = '1431184259';
type SigningKey = JsonWebKey & { kid?: string };
let cached: { at: number; keys: SigningKey[] } | undefined;
const decode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

export async function verifyMonitorToken(token: string, options: { now?: number; getKeys?: () => Promise<SigningKey[]> } = {}) {
    const now = options.now ?? Date.now();
    if (!token || token.length > 16000) throw new Error('Monitor authentication required.');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid monitor token.');
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0]))), claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Invalid signing algorithm.');
    if (claims.iss !== issuer || claims.aud !== MONITOR_AUDIENCE || claims.repository !== repository || claims.repository_id !== repositoryId || claims.ref !== 'refs/heads/main' || claims.workflow_ref !== `${repository}/.github/workflows/evidence-monitor.yml@refs/heads/main` || !['schedule', 'workflow_dispatch'].includes(claims.event_name)) throw new Error('This workflow is not authorised to run the monitor.');
    if (![claims.exp, claims.iat, claims.nbf].every(Number.isFinite) || claims.exp * 1000 <= now || claims.nbf * 1000 > now + 30000 || claims.iat * 1000 > now + 30000 || now - claims.iat * 1000 > 600000) throw new Error('Monitor token expired or not yet valid.');
    let keys: SigningKey[];
    if (options.getKeys) keys = await options.getKeys();
    else {
        if (!cached || now - cached.at > 300000 || !cached.keys.some(k => k.kid === header.kid)) {
            const res = await fetch(issuer + '/.well-known/jwks', { signal: AbortSignal.timeout(10000) });
            if (!res.ok) throw new Error('Signing keys unavailable.');
            const jwks = await res.json() as { keys: SigningKey[] };
            cached = { at: now, keys: jwks.keys };
        }
        keys = cached.keys;
    }
    const jwk = keys.find(k => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) throw new Error('Unknown signing key.');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]))) throw new Error('Invalid monitor signature.');
    return { runId: String(claims.run_id || '') };
}
