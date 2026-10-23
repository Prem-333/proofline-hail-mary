import type { Workspace } from './types';
export function seedWorkspace(): Workspace {
    const expires = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    return {
        name: 'Luma brand studio',
        brand: { name: 'Luma Analytics', voice: 'Clear, measured and useful. Explain benefits without hype. Qualify numbers and keep the invitation friendly.',
            bannedTerms: ['revolutionary', 'game-changing', 'unmatched'], preferredTerms: { 'Luma AI': 'Luma Analytics', 'users': 'customers' },
            colors: ['#12665f', '#152c37', '#ffffff', '#b18a4e'], minContrast: 4.5, version: 1 },
        sources: [
            { id: 'fact-reporting', title: 'Reporting study · approved claim', excerpt: 'An internal study of selected reporting tasks measured 18% less reporting time using Luma Analytics. Results apply to the measured tasks, not every customer or workflow.', approvedWording: 'Our internal study measured 18% less reporting time on selected tasks.', status: 'approved', version: 1, expiresAt: expires, product: 'Luma Analytics', market: 'Global', owner: 'Brand team' },
            { id: 'fact-trial', title: 'Current trial terms', excerpt: 'Luma Analytics offers a 14-day trial. No credit card is required to start the trial.', approvedWording: 'Start your 14-day trial. No credit card required.', status: 'approved', version: 1, expiresAt: expires, product: 'Luma Analytics', market: 'Global', owner: 'Product marketing' },
            { id: 'fact-offer', title: 'Launch promotion · expired', excerpt: 'A 40% discount on the annual plan applied only during the launch promotion.', approvedWording: 'Save 40% on the annual plan during the launch promotion.', status: 'approved', version: 1, expiresAt: '2025-01-01', product: 'Luma Analytics', market: 'Global', owner: 'Revenue operations' },
        ], drafts: [], events: [],
    };
}
export const sampleDraft = {
    title: 'A clearer way to report', channel: 'LinkedIn', product: 'Luma Analytics', market: 'Global',
    intent: 'Introduce faster reporting and invite potential customers to try the product.',
    content: 'Luma AI is a revolutionary way to report. Guaranteed 30% less reporting time for every team. Start your 14-day trial. No credit card required.',
    altText: '', foreground: '#152c37', background: '#ffffff',
};
