export type Role = 'admin' | 'creator' | 'reviewer';
export type Source = {
    id: string;
    title: string;
    excerpt: string;
    approvedWording: string;
    status: 'draft' | 'approved';
    version: number;
    expiresAt: string;
    product: string;
    market: string;
    owner: string;
};
export type Brand = {
    name: string;
    voice: string;
    bannedTerms: string[];
    preferredTerms: Record<string, string>;
    colors: string[];
    minContrast: number;
    version: number;
};
export type Finding = {
    id: string;
    category: 'claim' | 'tone' | 'terminology' | 'visual' | 'accessibility' | 'extraction';
    severity: 'blocker' | 'advisory';
    title: string;
    quote: string;
    explanation: string;
    suggestion?: string;
    sourceId?: string;
    sourceVersion?: number;
    outcome: 'contradicted' | 'unverified' | 'conflicting' | 'rule';
    resolution?: {
        by: string;
        reason: string;
        at: string;
    };
};
export type Attachment = {
    key: string;
    name: string;
    type: 'pdf' | 'image';
    size: number;
    hash: string;
    extractedText: string;
    pageCount?: number;
    width?: number;
    height?: number;
    ocrConfidence?: number;
    extractionConfirmed: boolean;
};
export type Review = {
    id: string;
    contentHash: string;
    policyVersion: number;
    sourceDigest: string;
    checkedAt: string;
    findings: Finding[];
    evidence: {
        quote: string;
        sourceId: string;
        sourceVersion: number;
        method: string;
    }[];
    engine: 'rules' | 'local-semantic';
    incomplete: boolean;
};
export type Approval = {
    by: string;
    name: string;
    at: string;
    reviewId: string;
    contentHash: string;
    sourceDigest: string;
    policyVersion: number;
    note: string;
};
export type Draft = {
    id: string;
    title: string;
    content: string;
    channel: string;
    intent: string;
    product: string;
    market: string;
    createdBy: string;
    createdName: string;
    createdAt: string;
    updatedAt: string;
    version: number;
    altText: string;
    foreground: string;
    background: string;
    attachment?: Attachment;
    review?: Review;
    approval?: Approval;
    submitted: boolean;
    revisions: {
        version: number;
        content: string;
        at: string;
        by: string;
        attachmentName?: string;
    }[];
    comments: {
        id: string;
        by: string;
        name: string;
        at: string;
        body: string;
        kind: 'comment' | 'changes';
    }[];
};
export type AuditEvent = {
    id: string;
    at: string;
    actor: string;
    action: string;
    detail: string;
    draftId?: string;
};
export type Workspace = {
    name: string;
    brand: Brand;
    sources: Source[];
    drafts: Draft[];
    events: AuditEvent[];
};
export type Actor = {
    id: string;
    name: string;
    role: Role;
};
export type SemanticMatch = {
    sentence: string;
    sourceId: string;
    score: number;
};
export type WorkspaceResponse = {
    id: string;
    revision: number;
    mode: 'demo' | 'private';
    state: Workspace;
    actor: Actor;
    signedIn: boolean;
};
