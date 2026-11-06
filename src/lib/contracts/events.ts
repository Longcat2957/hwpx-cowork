import type { JobApplyStatus, JobStatus } from './job.js';

export interface JobEvent {
    id: string;
    sequence: number;
    jobId: string;
    kind: 'job.created' | 'job.updated' | 'job.result';
    createdAt: string;
    data: {
        status: JobStatus;
        applyStatus: JobApplyStatus;
        progress: number;
    };
}

export type EventListener = (event: JobEvent) => void;
