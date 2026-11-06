export interface ChatSession {
    id: string;
    documentId: string;
    branchId: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
    userId: string;
    jobId: string | null;
    attachmentIds: string[];
}

export interface DocumentSelection {
    text: string;
    revision: number;
}

export type Message = ChatMessage;
