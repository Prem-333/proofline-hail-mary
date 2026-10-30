const site = 'https://proofline-hail-mary.mclaren720sfeelthesp.chatgpt.site';
const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!requestUrl || !requestToken) throw new Error('Run this script through the authorised GitHub workflow.');
const url = new URL(requestUrl); url.searchParams.set('audience', site);
const tokenResponse = await fetch(url, { headers: { Authorization: `Bearer ${requestToken}` }, signal: AbortSignal.timeout(15000) });
if (!tokenResponse.ok) throw new Error('GitHub could not issue a monitor identity.');
const { value: token } = await tokenResponse.json();
if (typeof token !== 'string') throw new Error('GitHub returned no monitor identity.');
console.log(`::add-mask::${token}`);
let after = '', processed = 0, affected = 0, conflicts = 0;
for (let batch = 0; batch < 300; batch++) {
    const res = await fetch(site + '/api/monitor?after=' + encodeURIComponent(after), { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Evidence monitor returned HTTP ${res.status}.`);
    const result = await res.json();
    processed += result.processed; affected += result.affected; conflicts += result.conflicts;
    if (!result.nextCursor) {
        console.log(`Checked ${processed} workspaces; ${affected} drafts need a review; ${conflicts} concurrent changes deferred. Completed ${result.checkedAt}.`);
        if (conflicts) throw new Error('Concurrent changes were preserved. Run the monitor again to retry those workspaces.');
        process.exit(0);
    }
    after = result.nextCursor;
}
throw new Error('Scan limit reached; no workspace records were overwritten without a revision check.');
