export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type DocumentFormat = 'hwp' | 'hwpx';

export interface DocumentRecord {
    id: string;
    title: string;
    format: DocumentFormat;
    size: number;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    representativeVersionId: string;
    description: string;
}

export interface DocumentBranch {
    id: string;
    documentId: string;
    userId: string;
    headVersionId: string;
    baseVersionId: string;
    revision: number;
    savedRevision: number;
    content: string;
}

export interface CreateDocumentInput {
    title: string;
    format: DocumentFormat;
}

export interface FileMetadata {
    name: string;
    size: number;
    type?: string;
}

export type Document = DocumentRecord;
export type Branch = DocumentBranch;
