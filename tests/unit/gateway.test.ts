import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { GatewayErrorCode } from '#lib/contracts/auth.js';
import type { JobEvent } from '#lib/contracts/events.js';
import { GatewayError, type Gateway } from '#lib/client/gateway.js';
import { createEventCursor } from '#lib/client/events.js';
import { createMockGateway } from '#lib/client/mock/gateway.js';

function expectCode(action: () => unknown, code: GatewayErrorCode) {
    try {
        action();
        throw new Error('Expected GatewayError');
    } catch (error) {
        expect(error).toBeInstanceOf(GatewayError);
        expect((error as GatewayError).code).toBe(code);
    }
}

function setup() {
    const gateway = createMockGateway({ scenario: 'empty' });
    const documentId = gateway.createDocument({ title: '검토 문서', format: 'hwpx' });
    return { gateway, documentId };
}

function myBranch(gateway: Gateway, documentId: string) {
    const state = get(gateway);
    return state.branches.find(
        (branch) => branch.documentId === documentId && branch.userId === state.currentUser?.id
    )!;
}

function complete(gateway: Gateway, jobId: string) {
    gateway.advanceJob(jobId);
    gateway.advanceJob(jobId);
}

describe('isolated mock gateway', () => {
    it('isolates app contexts and restores deterministic fixtures and IDs', () => {
        const first = createMockGateway();
        const second = createMockGateway();
        const original = get(second);
        first.renameDocument('doc-brief', '나만 변경한 이름');
        first.switchUser('admin');
        first.updateSettings({ retentionDays: 60 });
        expect(get(second)).toEqual(original);
        first.reset();
        expect(get(first)).toEqual(original);
        const id = first.createDocument({ title: '첫 예시', format: 'hwp' });
        first.reset();
        expect(first.createDocument({ title: '첫 예시', format: 'hwp' })).toBe(id);
    });

    it('enforces active authentication, administrator access, and job ownership', () => {
        const { gateway, documentId } = setup();
        expectCode(() => gateway.updateSettings({ retentionDays: 40 }), 'FORBIDDEN');
        const jobId = gateway.submitJob({ documentId, prompt: '문장을 정리해 주세요.' });
        gateway.switchUser('junho');
        expectCode(() => gateway.cancelJob(jobId), 'FORBIDDEN');
        expectCode(() => gateway.advanceJob(jobId), 'FORBIDDEN');
        gateway.switchUser('admin');
        gateway.deactivateMember('junho');
        expectCode(() => gateway.switchUser('junho'), 'VALIDATION');
        gateway.logout();
        expectCode(
            () => gateway.createDocument({ title: '무단 생성', format: 'hwp' }),
            'UNAUTHENTICATED'
        );
    });

    it('keeps shared history readable while preventing edits in another user session', () => {
        const gateway = createMockGateway();
        expect(
            get(gateway).messages.some((message) => message.sessionId === 'session-brief-junho')
        ).toBe(true);
        const before = get(gateway);
        expectCode(
            () =>
                gateway.submitJob({
                    documentId: 'doc-brief',
                    sessionId: 'session-brief-junho',
                    prompt: '다른 사람 대화 변경'
                }),
            'FORBIDDEN'
        );
        expect(get(gateway)).toEqual(before);
        const id = gateway.createSession('doc-brief');
        expect(get(gateway).sessions.find((session) => session.id === id)?.branchId).toBe(
            'branch-brief-minji'
        );
        expect(
            get(gateway).branches.filter(
                (branch) => branch.documentId === 'doc-brief' && branch.userId === 'minji'
            )
        ).toHaveLength(1);
    });

    it('accepts only valid unused invitations and does not store passwords', () => {
        const gateway = createMockGateway({ currentUserId: null });
        expectCode(
            () => gateway.acceptInvitation('expired', { name: '소라', password: 'password' }),
            'INVITATION_EXPIRED'
        );
        const id = gateway.acceptInvitation('demo-invite', {
            name: '김소라',
            password: 'temporary-password'
        });
        expect(get(gateway).currentUser?.id).toBe(id);
        expect(get(gateway).currentUser?.status).toBe('active');
        expect(JSON.stringify(get(gateway))).not.toContain('temporary-password');
        expectCode(
            () => gateway.acceptInvitation('demo-invite', { name: '김소라', password: 'password' }),
            'INVITATION_USED'
        );
    });
});

describe('document and job preservation', () => {
    it('applies unchanged AI results to a workcopy without changing representative or other branches', () => {
        const { gateway, documentId } = setup();
        const representative = get(gateway).documents[0].representativeVersionId;
        gateway.switchUser('junho');
        gateway.createSession(documentId);
        const other = structuredClone(myBranch(gateway, documentId));
        gateway.switchUser('minji');
        const id = gateway.submitJob({ documentId, prompt: '명확하게 정리해 주세요.' });
        complete(gateway, id);
        const job = get(gateway).jobs.find((item) => item.id === id)!;
        expect(job.status).toBe('succeeded');
        expect(job.applyStatus).toBe('applied');
        expect(myBranch(gateway, documentId).headVersionId).toBe(job.resultVersionId);
        expect(get(gateway).documents[0].representativeVersionId).toBe(representative);
        expect(get(gateway).branches.find((branch) => branch.id === other.id)).toEqual(other);
    });

    it('preserves both results during conflicts and rejects a stale result choice atomically', () => {
        const { gateway, documentId } = setup();
        const representative = get(gateway).documents[0].representativeVersionId;
        const id = gateway.submitJob({ documentId, prompt: '표현을 개선해 주세요.' });
        gateway.advanceJob(id);
        gateway.markEdited(documentId, '직접 작성한 첫 결과');
        gateway.advanceJob(id);
        const revision = myBranch(gateway, documentId).revision;
        expect(get(gateway).jobs[0].applyStatus).toBe('pending');
        expect(myBranch(gateway, documentId).content).toBe('직접 작성한 첫 결과');
        gateway.markEdited(documentId, '선택 중 추가한 내용');
        const before = get(gateway);
        expectCode(() => gateway.resolveJob(id, 'apply', revision), 'CONFLICT');
        expect(get(gateway)).toEqual(before);
        gateway.resolveJob(id, 'apply', myBranch(gateway, documentId).revision);
        const state = get(gateway);
        expect(state.jobs[0].applyStatus).toBe('applied');
        expect(state.versions.some((version) => version.content === '선택 중 추가한 내용')).toBe(
            true
        );
        expect(state.versions.some((version) => version.id === state.jobs[0].resultVersionId)).toBe(
            true
        );
        expect(state.documents[0].representativeVersionId).toBe(representative);
    });

    it('retains AI output when the direct result is chosen and blocks automatic application after a new session', () => {
        const { gateway, documentId } = setup();
        const jobId = gateway.submitJob({ documentId, prompt: '검토해 주세요.' });
        gateway.createSession(documentId);
        complete(gateway, jobId);
        expect(get(gateway).jobs[0].applyStatus).toBe('pending');
        const direct = myBranch(gateway, documentId).content;
        const resultId = get(gateway).jobs[0].resultVersionId;
        gateway.resolveJob(jobId, 'keep', myBranch(gateway, documentId).revision);
        expect(myBranch(gateway, documentId).content).toBe(direct);
        expect(get(gateway).jobs[0].applyStatus).toBe('kept');
        expect(get(gateway).versions.some((version) => version.id === resultId)).toBe(true);
    });

    it('preserves immutable history during restore/import and checks representative changes', () => {
        const gateway = createMockGateway();
        const before = get(gateway);
        const originalVersions = structuredClone(before.versions);
        gateway.markEdited('doc-brief', '복원 직전의 미저장 내용');
        const branchId = myBranch(gateway, 'doc-brief').id;
        const restored = gateway.restoreVersion('doc-brief', 'v-brief-1');
        expect(myBranch(gateway, 'doc-brief').id).toBe(branchId);
        expect(
            get(gateway).versions.some((version) => version.content === '복원 직전의 미저장 내용')
        ).toBe(true);
        gateway.importVersion('doc-brief', 'v-brief-junho-1');
        expect(myBranch(gateway, 'doc-brief').id).toBe(branchId);
        for (const version of originalVersions)
            expect(get(gateway).versions.find((item) => item.id === version.id)).toEqual(version);
        gateway.setRepresentative('doc-brief', restored, 'v-brief-2');
        const current = get(gateway);
        expectCode(
            () => gateway.setRepresentative('doc-brief', 'v-brief-junho-1', 'v-brief-2'),
            'CONFLICT'
        );
        expect(get(gateway)).toEqual(current);
    });

    it('serializes jobs within one branch while allowing other documents and preserving cancelled jobs', () => {
        const { gateway, documentId } = setup();
        const sessionId = gateway.createSession(documentId);
        const first = gateway.submitJob({ documentId, sessionId, prompt: '첫 요청' });
        const second = gateway.submitJob({ documentId, sessionId, prompt: '둘째 요청' });
        expectCode(() => gateway.advanceJob(second), 'CONFLICT');
        const otherDocumentId = gateway.createDocument({ title: '다른 문서', format: 'hwp' });
        const otherJob = gateway.submitJob({
            documentId: otherDocumentId,
            prompt: '다른 문서 요청'
        });
        gateway.advanceJob(otherJob);
        expect(get(gateway).jobs.find((job) => job.id === otherJob)?.status).toBe('running');
        gateway.cancelJob(first);
        const count = get(gateway).versions.length;
        expectCode(() => gateway.advanceJob(first), 'CONFLICT');
        expect(get(gateway).versions).toHaveLength(count);
        const retry = gateway.retryJob(first);
        expect(retry).not.toBe(first);
        expect(get(gateway).jobs.find((job) => job.id === first)?.status).toBe('cancelled');
        gateway.advanceJob(second);
    });

    it('rejects wrong-document attachments and stale selections without partially creating work', () => {
        const { gateway, documentId } = setup();
        const otherDocumentId = gateway.createDocument({ title: '다른 문서', format: 'hwp' });
        const attachmentId = gateway.addAttachment({
            documentId: otherDocumentId,
            name: '참고.pdf',
            size: 1000
        });
        const before = get(gateway);
        expectCode(
            () =>
                gateway.submitJob({
                    documentId,
                    prompt: '참고해 주세요.',
                    attachmentIds: [attachmentId]
                }),
            'FORBIDDEN'
        );
        expectCode(
            () =>
                gateway.submitJob({
                    documentId,
                    prompt: '선택 수정',
                    selection: { text: '옛 선택', revision: 0 }
                }),
            'CONFLICT'
        );
        expect(get(gateway)).toEqual(before);
    });
});

describe('event cursor and reconnection', () => {
    it('replays only events after the cursor and delivers missed events once after reconnection', () => {
        const { gateway, documentId } = setup();
        const events: JobEvent[] = [];
        const stop = gateway.subscribeEvents(0, (event) => events.push(event));
        const jobId = gateway.submitJob({ documentId, prompt: '이벤트 확인' });
        expect(events.map((event) => event.sequence)).toEqual([1]);
        gateway.setConnection('disconnected');
        complete(gateway, jobId);
        expect(events).toHaveLength(1);
        gateway.setConnection('connected');
        expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
        gateway.dismissNotice();
        expect(events).toHaveLength(3);
        stop();
        const resumed: JobEvent[] = [];
        const stopResume = gateway.subscribeEvents(2, (event) => resumed.push(event));
        expect(resumed.map((event) => event.sequence)).toEqual([3]);
        const cursor = createEventCursor(2);
        const accepted: JobEvent[] = [];
        expect(cursor.accept(events[2], (event) => accepted.push(event))).toBe(true);
        expect(cursor.accept(events[2], (event) => accepted.push(event))).toBe(false);
        expect(cursor.accept(events[0], (event) => accepted.push(event))).toBe(false);
        expect(accepted).toHaveLength(1);
        stopResume();
    });
});
