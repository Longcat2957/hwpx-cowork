import { writable } from 'svelte/store';
import {
    MAX_UPLOAD_BYTES,
    type DocumentBranch,
    type DocumentRecord,
    type FileMetadata
} from '#lib/contracts/document.js';
import { RETENTION_MIN_DAYS, RETENTION_MAX_DAYS } from '#lib/contracts/settings.js';
import type { EventListener, JobEvent } from '#lib/contracts/events.js';
import type { Job } from '#lib/contracts/job.js';
import type { Member } from '#lib/contracts/member.js';
import type { DocumentVersion, VersionKind } from '#lib/contracts/version.js';
import { createEventCursor } from '../events.js';
import { GatewayError, type Gateway, type GatewaySnapshot } from '../gateway.js';
import { createFixtures, FIXTURE_TIME } from './fixtures.js';
import type { Scenario } from './scenarios.js';

export interface MockGatewayOptions {
    scenario?: Scenario;
    currentUserId?: string | null;
}

export function createMockGateway(options: MockGatewayOptions = {}): Gateway {
    let state = createFixtures(options.scenario);
    if (options.currentUserId !== undefined) {
        state.currentUser =
            state.members.find(
                (member) => member.id === options.currentUserId && member.status === 'active'
            ) ?? null;
    }
    const store = writable<GatewaySnapshot>(structuredClone(state));
    let counter = 0;
    let sequence = 0;
    let eventLog: JobEvent[] = [];
    let jobSources = new Map<string, { content: string; headVersionId: string }>();
    let activeSessions = new Map<string, string>();
    const listeners = new Set<{
        cursor: ReturnType<typeof createEventCursor>;
        listener: EventListener;
    }>();

    function seedRuntime(): void {
        jobSources = new Map();
        activeSessions = new Map();
        for (const session of state.sessions) activeSessions.set(session.branchId, session.id);
        for (const job of state.jobs) {
            const branch = state.branches.find((item) => item.id === job.branchId);
            if (branch)
                jobSources.set(job.id, {
                    content: branch.content,
                    headVersionId: branch.headVersionId
                });
        }
    }

    seedRuntime();

    function stamp(): string {
        return new Date(new Date(FIXTURE_TIME).getTime() + ++counter * 60000).toISOString();
    }

    function nextId(prefix: string): string {
        return `${prefix}-preview-${++counter}`;
    }

    function fail(code: ConstructorParameters<typeof GatewayError>[0], message: string): never {
        throw new GatewayError(code, message);
    }

    function actor(admin = false): Member {
        const user = state.members.find(
            (member) => member.id === state.currentUser?.id && member.status === 'active'
        );
        if (!user) fail('UNAUTHENTICATED', '로그인이 필요합니다.');
        if (state.scenario === 'forbidden') fail('FORBIDDEN', '이 작업을 수행할 권한이 없습니다.');
        if (state.scenario === 'error' || state.loading)
            fail(
                'UNAVAILABLE',
                '지금은 요청을 처리할 수 없습니다. 기본 시나리오에서 다시 시도해 주세요.'
            );
        if (admin && user.role !== 'admin') fail('FORBIDDEN', '관리자만 변경할 수 있습니다.');
        return user;
    }

    function getDocument(id: string): DocumentRecord {
        const document = state.documents.find((item) => item.id === id);
        if (!document) fail('NOT_FOUND', '문서를 찾을 수 없습니다.');
        return document;
    }

    function getVersion(documentId: string, id: string): DocumentVersion {
        const version = state.versions.find(
            (item) => item.id === id && item.documentId === documentId
        );
        if (!version) fail('NOT_FOUND', '이 문서의 버전을 찾을 수 없습니다.');
        return version;
    }

    function branchFor(documentId: string): DocumentBranch {
        const user = actor();
        const document = getDocument(documentId);
        let branch = state.branches.find(
            (item) => item.documentId === documentId && item.userId === user.id
        );
        if (!branch) {
            const base = getVersion(documentId, document.representativeVersionId);
            branch = {
                id: nextId('branch'),
                documentId,
                userId: user.id,
                headVersionId: base.id,
                baseVersionId: base.id,
                revision: 1,
                savedRevision: 1,
                content: base.content
            };
            state.branches.push(branch);
        }
        return branch;
    }

    function ownedJob(id: string): Job {
        const user = actor();
        const job = state.jobs.find((item) => item.id === id);
        if (!job) fail('NOT_FOUND', '작업을 찾을 수 없습니다.');
        if (job.userId !== user.id) fail('FORBIDDEN', '다른 구성원의 작업은 변경할 수 없습니다.');
        return job;
    }

    function notifyEvents(): void {
        if (
            state.connection !== 'connected' ||
            !state.currentUser ||
            state.currentUser.status !== 'active'
        )
            return;
        for (const subscription of listeners) {
            for (const event of eventLog) {
                try {
                    subscription.cursor.accept(structuredClone(event), subscription.listener);
                } catch {
                    // A presentation subscriber must not roll back an already committed mutation.
                }
            }
        }
    }

    function commit<T>(change: () => T): T {
        const previous = state;
        const previousCounter = counter;
        const previousSequence = sequence;
        const previousLog = eventLog;
        const previousSources = jobSources;
        const previousSessions = activeSessions;
        state = structuredClone(state);
        eventLog = [...eventLog];
        jobSources = new Map(jobSources);
        activeSessions = new Map(activeSessions);
        let result: T;
        try {
            result = change();
            state.currentUser =
                state.members.find(
                    (member) => member.id === state.currentUser?.id && member.status === 'active'
                ) ?? null;
        } catch (error) {
            state = previous;
            counter = previousCounter;
            sequence = previousSequence;
            eventLog = previousLog;
            jobSources = previousSources;
            activeSessions = previousSessions;
            throw error;
        }
        store.set(structuredClone(state));
        notifyEvents();
        return result;
    }

    function emit(job: Job, kind: JobEvent['kind']): void {
        eventLog.push({
            id: `event-${++sequence}`,
            sequence,
            jobId: job.id,
            kind,
            createdAt: job.updatedAt,
            data: { status: job.status, applyStatus: job.applyStatus, progress: job.progress }
        });
    }

    function title(value: string): string {
        const normalized = value.trim();
        if (!normalized || normalized.length > 120)
            fail('VALIDATION', '제목은 1~120자로 입력해 주세요.');
        return normalized;
    }

    function validateFile(file: FileMetadata, attachment = false): string {
        const extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
        const supported = attachment
            ? ['hwp', 'hwpx', 'pdf', 'png', 'jpg', 'jpeg', 'webp']
            : ['hwp', 'hwpx'];
        if (!supported.includes(extension))
            fail(
                'VALIDATION',
                attachment
                    ? 'PDF, 이미지, HWP 또는 HWPX 파일을 선택해 주세요.'
                    : 'HWP 또는 HWPX 파일을 선택해 주세요.'
            );
        if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_UPLOAD_BYTES)
            fail('VALIDATION', '파일은 0바이트보다 크고 25MB 이하여야 합니다.');
        return extension;
    }

    function snapshot(
        branch: DocumentBranch,
        kind: VersionKind = 'manual',
        sourceVersionId: string | null = null
    ): string {
        const head = getVersion(branch.documentId, branch.headVersionId);
        if (head.content === branch.content && kind !== 'restore' && kind !== 'import') {
            branch.savedRevision = branch.revision;
            return head.id;
        }
        const version: DocumentVersion = {
            id: nextId('version'),
            documentId: branch.documentId,
            branchId: branch.id,
            parentVersionId: branch.headVersionId,
            sourceVersionId,
            authorId: branch.userId,
            title:
                kind === 'restore'
                    ? '세션 버전 복원'
                    : kind === 'import'
                      ? '다른 버전 가져오기'
                      : kind === 'session'
                        ? '대화 시작 복원점'
                        : '직접 편집 저장',
            summary: '미리보기에서 보관한 작업본입니다.',
            content: branch.content,
            createdAt: stamp(),
            kind
        };
        state.versions.push(version);
        branch.headVersionId = version.id;
        branch.savedRevision = branch.revision;
        getDocument(branch.documentId).updatedAt = version.createdAt;
        return version.id;
    }

    function newSession(documentId: string): string {
        const user = actor();
        const branch = branchFor(documentId);
        snapshot(branch, 'session');
        const createdAt = stamp();
        const id = nextId('session');
        const number =
            state.sessions.filter(
                (session) => session.documentId === documentId && session.userId === user.id
            ).length + 1;
        state.sessions.push({
            id,
            documentId,
            branchId: branch.id,
            userId: user.id,
            title: `새 대화 ${number}`,
            createdAt,
            updatedAt: createdAt
        });
        activeSessions.set(branch.id, id);
        return id;
    }

    function newDocument(input: { title: string; format: 'hwp' | 'hwpx' }, size = 0): string {
        const user = actor();
        const documentTitle = title(input.title);
        if (input.format !== 'hwp' && input.format !== 'hwpx')
            fail('VALIDATION', '지원하지 않는 문서 형식입니다.');
        const id = nextId('document');
        const branchId = nextId('branch');
        const versionId = nextId('version');
        const createdAt = stamp();
        const content = `${documentTitle}\n\n이 문서는 화면 검토용 예시입니다. 실제 파일은 서버에 저장되지 않습니다.`;
        state.documents.unshift({
            id,
            title: documentTitle,
            format: input.format,
            size,
            ownerId: user.id,
            createdAt,
            updatedAt: createdAt,
            representativeVersionId: versionId,
            description: '이번 미리보기에서 만든 예시 문서'
        });
        state.versions.push({
            id: versionId,
            documentId: id,
            branchId,
            parentVersionId: null,
            sourceVersionId: null,
            authorId: user.id,
            title: '첫 문서',
            summary: '미리보기 문서를 만들었습니다.',
            content,
            createdAt,
            kind: 'initial'
        });
        state.branches.push({
            id: branchId,
            documentId: id,
            userId: user.id,
            headVersionId: versionId,
            baseVersionId: versionId,
            revision: 1,
            savedRevision: 1,
            content
        });
        state.notice =
            '예시 문서를 만들었습니다. 실제 문서 파일은 생성하거나 업로드하지 않았습니다.';
        return id;
    }

    function applyResult(job: Job, branch: DocumentBranch): void {
        if (!job.resultVersionId) fail('CONFLICT', '아직 적용할 결과가 없습니다.');
        snapshot(branch);
        branch.content = getVersion(job.documentId, job.resultVersionId).content;
        branch.headVersionId = job.resultVersionId;
        branch.revision += 1;
        branch.savedRevision = branch.revision;
        job.applyStatus = 'applied';
        getDocument(job.documentId).updatedAt = stamp();
    }

    function changeVersion(
        documentId: string,
        versionId: string,
        kind: 'restore' | 'import'
    ): string {
        const branch = branchFor(documentId);
        const source = getVersion(documentId, versionId);
        snapshot(branch);
        branch.content = source.content;
        branch.revision += 1;
        if (kind === 'import') branch.baseVersionId = source.id;
        const id = snapshot(branch, kind, source.id);
        state.notice =
            kind === 'restore'
                ? '선택한 예시 버전으로 복원했습니다. 이전 이력은 유지됩니다.'
                : '선택한 예시 버전을 내 브랜치로 가져왔습니다.';
        return id;
    }

    const gateway: Gateway = {
        subscribe: store.subscribe,
        login(email, password) {
            commit(() => {
                if (password.length < 4)
                    fail('VALIDATION', '미리보기 비밀번호는 4자 이상 입력해 주세요.');
                const user = state.members.find(
                    (member) =>
                        member.email.toLowerCase() === email.trim().toLowerCase() &&
                        member.status === 'active'
                );
                if (!user) fail('UNAUTHENTICATED', '로그인 정보를 확인해 주세요.');
                state.currentUser = user;
                state.notice = '예시 계정으로 로그인했습니다. 실제 인증은 수행하지 않습니다.';
            });
        },
        logout() {
            commit(() => {
                state.currentUser = null;
                state.notice = '미리보기에서 로그아웃했습니다.';
            });
            listeners.clear();
        },
        switchUser(userId) {
            commit(() => {
                const user = state.members.find(
                    (member) => member.id === userId && member.status === 'active'
                );
                if (!user) fail('VALIDATION', '활성 예시 계정을 선택해 주세요.');
                state.currentUser = user;
                state.notice = `${user.name}의 화면을 미리 봅니다.`;
            });
        },
        reset(scenario = 'default') {
            state = createFixtures(scenario);
            counter = 0;
            sequence = 0;
            eventLog = [];
            seedRuntime();
            for (const subscription of listeners) subscription.cursor = createEventCursor();
            store.set(structuredClone(state));
        },
        dismissNotice() {
            commit(() => {
                state.notice = null;
            });
        },
        acceptInvitation(token, input) {
            return commit(() => {
                if (token === 'expired')
                    fail(
                        'INVITATION_EXPIRED',
                        '초대가 만료되었습니다. 관리자에게 새 초대를 요청해 주세요.'
                    );
                if (token === 'used')
                    fail('INVITATION_USED', '이미 사용한 초대입니다. 로그인해 주세요.');
                const user = state.members.find((member) => member.invitationToken === token);
                if (!user) fail('NOT_FOUND', '유효하지 않은 초대입니다.');
                if (user.status !== 'invited') fail('INVITATION_USED', '이미 사용한 초대입니다.');
                if (input.password.length < 8)
                    fail('VALIDATION', '비밀번호는 8자 이상 입력해 주세요.');
                user.name = title(input.name);
                user.initials = user.name.slice(-2);
                user.status = 'active';
                state.currentUser = user;
                state.notice = '예시 초대를 수락했습니다. 실제 계정은 생성하지 않습니다.';
                return user.id;
            });
        },
        createDocument(input) {
            return commit(() => newDocument(input));
        },
        renameDocument(id, value) {
            commit(() => {
                actor();
                const document = getDocument(id);
                document.title = title(value);
                document.updatedAt = stamp();
            });
        },
        uploadDocument(file) {
            return commit(() => {
                const format = validateFile(file) as 'hwp' | 'hwpx';
                return newDocument(
                    { title: file.name.replace(/\.(hwp|hwpx)$/i, ''), format },
                    file.size
                );
            });
        },
        createSession(documentId) {
            return commit(() => newSession(documentId));
        },
        submitJob(input) {
            return commit(() => {
                const user = actor();
                const branch = branchFor(input.documentId);
                const prompt = input.prompt.trim();
                if (!prompt || prompt.length > 10000)
                    fail('VALIDATION', '요청 내용을 1~10,000자로 입력해 주세요.');
                if (
                    input.selection &&
                    (input.selection.revision !== branch.revision || !input.selection.text.trim())
                )
                    fail('CONFLICT', '선택 영역이 변경되었습니다. 문서에서 다시 선택해 주세요.');
                const attachmentIds = [...new Set(input.attachmentIds ?? [])];
                for (const id of attachmentIds) {
                    const attachment = state.attachments.find(
                        (item) =>
                            item.id === id &&
                            item.documentId === input.documentId &&
                            item.userId === user.id &&
                            item.status === 'ready'
                    );
                    if (!attachment) fail('FORBIDDEN', '사용할 수 없는 첨부파일입니다.');
                }
                const sessionId = input.sessionId ?? newSession(input.documentId);
                const session = state.sessions.find(
                    (item) => item.id === sessionId && item.documentId === input.documentId
                );
                if (!session) fail('NOT_FOUND', '대화 세션을 찾을 수 없습니다.');
                if (session.userId !== user.id || session.branchId !== branch.id)
                    fail(
                        'FORBIDDEN',
                        '다른 구성원의 대화는 읽기만 가능합니다. 내 대화를 시작해 주세요.'
                    );
                const id = nextId('job');
                const createdAt = stamp();
                const job: Job = {
                    id,
                    documentId: input.documentId,
                    branchId: branch.id,
                    userId: user.id,
                    sessionId,
                    prompt,
                    status: 'queued',
                    applyStatus: 'none',
                    progress: 0,
                    baseRevision: branch.revision,
                    resultVersionId: null,
                    createdAt,
                    updatedAt: createdAt,
                    error: null,
                    attachmentIds,
                    selection: input.selection ? structuredClone(input.selection) : undefined
                };
                activeSessions.set(branch.id, sessionId);
                state.jobs.unshift(job);
                jobSources.set(id, {
                    content: branch.content,
                    headVersionId: branch.headVersionId
                });
                state.messages.push({
                    id: nextId('message'),
                    sessionId,
                    role: 'user',
                    content: prompt,
                    createdAt,
                    userId: user.id,
                    jobId: id,
                    attachmentIds
                });
                session.updatedAt = createdAt;
                if (session.title.startsWith('새 대화')) session.title = prompt.slice(0, 32);
                state.notice =
                    '예시 작업을 대기열에 추가했습니다. 실제 AI 요청은 전송하지 않습니다.';
                emit(job, 'job.created');
                return id;
            });
        },
        advanceJob(id) {
            commit(() => {
                const job = ownedJob(id);
                if (job.status !== 'queued' && job.status !== 'running')
                    fail('CONFLICT', '이미 종료된 작업입니다.');
                const earlier = state.jobs.some(
                    (item) =>
                        item.id !== id &&
                        item.branchId === job.branchId &&
                        (item.status === 'queued' || item.status === 'running') &&
                        item.createdAt < job.createdAt
                );
                if (earlier) fail('CONFLICT', '같은 브랜치의 앞선 작업을 먼저 완료해 주세요.');
                job.updatedAt = stamp();
                if (job.status === 'queued') {
                    job.status = 'running';
                    job.progress = 45;
                } else {
                    const branch = state.branches.find((item) => item.id === job.branchId)!;
                    const source = jobSources.get(id) ?? {
                        content: branch.content,
                        headVersionId: branch.headVersionId
                    };
                    const resultId = nextId('version');
                    state.versions.push({
                        id: resultId,
                        documentId: job.documentId,
                        branchId: job.branchId,
                        parentVersionId: source.headVersionId,
                        sourceVersionId: null,
                        authorId: job.userId,
                        title: 'AI 수정 결과 · 예시',
                        summary: job.prompt,
                        content: `${source.content}\n\n[AI 수정 예시]\n${job.prompt}\n요청에 따른 결과를 검토하는 예시 내용입니다.`,
                        createdAt: job.updatedAt,
                        kind: 'ai'
                    });
                    job.resultVersionId = resultId;
                    job.status = 'succeeded';
                    job.progress = 100;
                    job.applyStatus = 'pending';
                    const canApply =
                        branch.revision === job.baseRevision &&
                        activeSessions.get(branch.id) === job.sessionId;
                    if (canApply) applyResult(job, branch);
                    state.messages.push({
                        id: nextId('message'),
                        sessionId: job.sessionId,
                        role: 'assistant',
                        content: canApply
                            ? '예시 수정 결과를 내 작업본에 적용했습니다. 대표 버전은 변경하지 않았습니다.'
                            : '직접 편집이 있어 예시 AI 결과를 별도로 보관했습니다. 두 결과를 확인하고 선택해 주세요.',
                        createdAt: job.updatedAt,
                        userId: job.userId,
                        jobId: job.id,
                        attachmentIds: []
                    });
                    const session = state.sessions.find((item) => item.id === job.sessionId);
                    if (session) session.updatedAt = job.updatedAt;
                    state.notice =
                        '예시 작업을 완료했습니다. 실제 모델 호출이나 파일 수정은 수행하지 않았습니다.';
                }
                emit(job, job.status === 'succeeded' ? 'job.result' : 'job.updated');
            });
        },
        cancelJob(id) {
            commit(() => {
                const job = ownedJob(id);
                if (job.status !== 'queued' && job.status !== 'running')
                    fail('CONFLICT', '진행 중인 작업만 취소할 수 있습니다.');
                job.status = 'cancelled';
                job.updatedAt = stamp();
                emit(job, 'job.updated');
            });
        },
        retryJob(id) {
            const job = ownedJob(id);
            if (job.status !== 'failed' && job.status !== 'cancelled')
                fail('CONFLICT', '실패하거나 취소된 작업만 다시 요청할 수 있습니다.');
            return gateway.submitJob({
                documentId: job.documentId,
                prompt: job.prompt,
                sessionId: job.sessionId,
                attachmentIds: job.attachmentIds,
                selection: job.selection
            });
        },
        resolveJob(id, choice, expectedRevision) {
            commit(() => {
                const job = ownedJob(id);
                const branch = state.branches.find((item) => item.id === job.branchId)!;
                if (job.status !== 'succeeded' || job.applyStatus !== 'pending')
                    fail('CONFLICT', '선택 대기 중인 결과가 아닙니다.');
                if (branch.revision !== expectedRevision)
                    fail(
                        'CONFLICT',
                        '결과를 확인하는 동안 작업본이 변경되었습니다. 다시 확인해 주세요.'
                    );
                if (choice === 'apply') applyResult(job, branch);
                else if (choice === 'keep') {
                    snapshot(branch);
                    job.applyStatus = 'kept';
                } else fail('VALIDATION', '유효하지 않은 결과 선택입니다.');
                job.updatedAt = stamp();
                emit(job, 'job.result');
            });
        },
        markEdited(documentId, content) {
            commit(() => {
                const branch = branchFor(documentId);
                branch.content =
                    content ?? `${branch.content}\n\n직접 편집 예시 ${branch.revision + 1}`;
                branch.revision += 1;
                getDocument(documentId).updatedAt = stamp();
            });
        },
        saveDocument(documentId) {
            return commit(() => {
                const id = snapshot(branchFor(documentId));
                state.notice =
                    '미리보기 작업본을 보관했습니다. 실제 파일 저장은 수행하지 않습니다.';
                return id;
            });
        },
        restoreVersion(documentId, versionId) {
            return commit(() => changeVersion(documentId, versionId, 'restore'));
        },
        importVersion(documentId, versionId) {
            return commit(() => changeVersion(documentId, versionId, 'import'));
        },
        setRepresentative(documentId, versionId, expectedRepresentativeId) {
            commit(() => {
                actor();
                const document = getDocument(documentId);
                getVersion(documentId, versionId);
                if (document.representativeVersionId !== expectedRepresentativeId)
                    fail('CONFLICT', '대표 버전이 변경되었습니다. 최신 버전을 확인해 주세요.');
                document.representativeVersionId = versionId;
                document.updatedAt = stamp();
                state.notice = '예시 대표 버전을 변경했습니다. 각 구성원의 작업본은 유지됩니다.';
            });
        },
        addAttachment(input) {
            return commit(() => {
                const user = actor();
                getDocument(input.documentId);
                validateFile(input, true);
                if (
                    input.sessionId &&
                    !state.sessions.some(
                        (session) =>
                            session.id === input.sessionId &&
                            session.documentId === input.documentId &&
                            session.userId === user.id
                    )
                )
                    fail('FORBIDDEN', '내 문서 대화에만 첨부할 수 있습니다.');
                const id = nextId('attachment');
                state.attachments.push({
                    id,
                    documentId: input.documentId,
                    sessionId: input.sessionId ?? null,
                    userId: user.id,
                    name: input.name,
                    size: input.size,
                    type: input.type ?? '',
                    createdAt: stamp(),
                    status: 'ready'
                });
                return id;
            });
        },
        removeAttachment(id) {
            commit(() => {
                const user = actor();
                const attachment = state.attachments.find((item) => item.id === id);
                if (!attachment) fail('NOT_FOUND', '첨부파일을 찾을 수 없습니다.');
                if (attachment.userId !== user.id)
                    fail('FORBIDDEN', '다른 구성원의 첨부파일은 변경할 수 없습니다.');
                if (state.messages.some((message) => message.attachmentIds.includes(id)))
                    fail('CONFLICT', '대화에서 사용한 첨부파일은 이력에 보관됩니다.');
                state.attachments = state.attachments.filter((item) => item.id !== id);
            });
        },
        inviteMember(input) {
            return commit(() => {
                actor(true);
                const name = title(input.name);
                const email = input.email.trim().toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                    fail('VALIDATION', '이메일 주소를 확인해 주세요.');
                if (state.members.some((member) => member.email.toLowerCase() === email))
                    fail('CONFLICT', '이미 등록하거나 초대한 이메일입니다.');
                const id = nextId('member');
                state.members.push({
                    id,
                    name,
                    email,
                    role: 'member',
                    status: 'invited',
                    initials: name.slice(-2),
                    color: '#0891b2',
                    invitationToken: `invite-${id}`
                });
                state.notice =
                    '예시 초대를 추가했습니다. 실제 초대 링크나 이메일은 발송하지 않습니다.';
                return id;
            });
        },
        deactivateMember(id) {
            commit(() => {
                const admin = actor(true);
                if (id === admin.id)
                    fail('VALIDATION', '현재 관리자 계정은 비활성화할 수 없습니다.');
                const member = state.members.find((item) => item.id === id);
                if (!member) fail('NOT_FOUND', '구성원을 찾을 수 없습니다.');
                member.status = 'disabled';
                state.notice = '예시 구성원을 비활성화했습니다.';
            });
        },
        updateSettings(settings) {
            commit(() => {
                actor(true);
                if (
                    !Number.isInteger(settings.retentionDays) ||
                    settings.retentionDays < RETENTION_MIN_DAYS ||
                    settings.retentionDays > RETENTION_MAX_DAYS
                )
                    fail('VALIDATION', '보관 기간은 1~3650일의 정수로 입력해 주세요.');
                state.settings = { retentionDays: settings.retentionDays };
                state.notice = '예시 설정을 변경했습니다. 실제 이력 삭제는 수행하지 않습니다.';
            });
        },
        subscribeEvents(afterSequence, listener) {
            actor();
            if (!Number.isInteger(afterSequence) || afterSequence < 0)
                fail('VALIDATION', '이벤트 위치가 올바르지 않습니다.');
            const subscription = { cursor: createEventCursor(afterSequence), listener };
            listeners.add(subscription);
            notifyEvents();
            return () => {
                listeners.delete(subscription);
            };
        },
        setConnection(connection) {
            commit(() => {
                actor();
                state.connection = connection;
                if (state.scenario === 'disconnected' && connection === 'connected')
                    state.scenario = 'default';
            });
        }
    };
    return gateway;
}
