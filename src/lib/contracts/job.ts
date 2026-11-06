import type { DocumentSelection } from './session.js';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type JobApplyStatus = 'none' | 'pending' | 'applied' | 'kept';

export interface Job {
    id: string;
    documentId: string;
    branchId: string;
    userId: string;
    sessionId: string;
    prompt: string;
    status: JobStatus;
    applyStatus: JobApplyStatus;
    progress: number;
    baseRevision: number;
    resultVersionId: string | null;
    createdAt: string;
    updatedAt: string;
    error: string | null;
    attachmentIds: string[];
    selection?: DocumentSelection;
}

export interface SubmitJobInput {
    documentId: string;
    prompt: string;
    sessionId?: string;
    attachmentIds?: string[];
    selection?: DocumentSelection;
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    queued: '대기 중',
    running: '실행 중',
    succeeded: '완료',
    failed: '실패',
    cancelled: '취소됨'
};

export const JOB_APPLY_STATUS_LABELS: Record<JobApplyStatus, string> = {
    none: '결과 없음',
    pending: '결과 선택 대기',
    applied: '내 작업본에 적용',
    kept: '직접 편집본 유지'
};
