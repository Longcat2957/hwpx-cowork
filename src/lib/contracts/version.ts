export type VersionKind = 'initial' | 'session' | 'manual' | 'restore' | 'import' | 'ai';

export interface DocumentVersion {
    id: string;
    documentId: string;
    branchId: string;
    parentVersionId: string | null;
    sourceVersionId: string | null;
    authorId: string;
    title: string;
    summary: string;
    content: string;
    createdAt: string;
    kind: VersionKind;
}

export type Version = DocumentVersion;
