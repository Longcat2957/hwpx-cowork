import type { FileMetadata } from './document.js';

export interface Attachment {
    id: string;
    documentId: string;
    sessionId: string | null;
    userId: string;
    name: string;
    size: number;
    type: string;
    createdAt: string;
    status: 'ready' | 'failed';
}

export interface AddAttachmentInput extends FileMetadata {
    documentId: string;
    sessionId?: string;
}
