import type { Readable } from 'svelte/store';
import type { InvitationInput, GatewayErrorCode } from '#lib/contracts/auth.js';
import type { Attachment, AddAttachmentInput } from '#lib/contracts/attachment.js';
import type {
    CreateDocumentInput,
    DocumentRecord,
    DocumentBranch,
    FileMetadata
} from '#lib/contracts/document.js';
import type { EventListener } from '#lib/contracts/events.js';
import type { Job, SubmitJobInput } from '#lib/contracts/job.js';
import type { Member } from '#lib/contracts/member.js';
import type { ChatSession, ChatMessage } from '#lib/contracts/session.js';
import type { AppSettings } from '#lib/contracts/settings.js';
import type { DocumentVersion } from '#lib/contracts/version.js';
import type { Scenario } from './mock/scenarios.js';

export interface GatewaySnapshot {
    currentUser: Member | null;
    members: Member[];
    documents: DocumentRecord[];
    branches: DocumentBranch[];
    versions: DocumentVersion[];
    sessions: ChatSession[];
    messages: ChatMessage[];
    jobs: Job[];
    attachments: Attachment[];
    settings: AppSettings;
    scenario: Scenario;
    notice: string | null;
    connection: 'connected' | 'disconnected';
    loading: boolean;
    error: string | null;
}

export class GatewayError extends Error {
    constructor(
        public readonly code: GatewayErrorCode,
        message: string
    ) {
        super(message);
        this.name = 'GatewayError';
    }
}

export interface Gateway extends Readable<GatewaySnapshot> {
    login(email: string, password: string): void;
    logout(): void;
    switchUser(userId: string): void;
    reset(scenario?: Scenario): void;
    dismissNotice(): void;
    acceptInvitation(token: string, input: InvitationInput): string;
    createDocument(input: CreateDocumentInput): string;
    renameDocument(id: string, title: string): void;
    uploadDocument(file: FileMetadata): string;
    submitJob(input: SubmitJobInput): string;
    advanceJob(id: string): void;
    cancelJob(id: string): void;
    retryJob(id: string): string;
    createSession(documentId: string): string;
    resolveJob(id: string, choice: 'apply' | 'keep', expectedRevision: number): void;
    markEdited(documentId: string, content?: string): void;
    saveDocument(documentId: string): string;
    restoreVersion(documentId: string, versionId: string): string;
    importVersion(documentId: string, versionId: string): string;
    setRepresentative(
        documentId: string,
        versionId: string,
        expectedRepresentativeId: string
    ): void;
    addAttachment(input: AddAttachmentInput): string;
    removeAttachment(id: string): void;
    inviteMember(input: { name: string; email: string }): string;
    deactivateMember(id: string): void;
    updateSettings(settings: AppSettings): void;
    subscribeEvents(afterSequence: number, listener: EventListener): () => void;
    setConnection(connection: 'connected' | 'disconnected'): void;
}
