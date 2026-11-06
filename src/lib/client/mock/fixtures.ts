import type { GatewaySnapshot } from '../gateway.js';
import type { Scenario } from './scenarios.js';

export const FIXTURE_TIME = '2026-11-06T01:00:00.000Z';

/** A fresh fixture graph for each app context; no mutable shared state. */
export function createFixtures(scenario: Scenario = 'default'): GatewaySnapshot {
    const state: GatewaySnapshot = {
        currentUser: null,
        members: [
            {
                id: 'admin',
                name: '이서연',
                email: 'admin@deepet.local',
                role: 'admin',
                status: 'active',
                initials: '서연',
                color: '#7c3aed'
            },
            {
                id: 'minji',
                name: '김민지',
                email: 'minji@deepet.local',
                role: 'member',
                status: 'active',
                initials: '민지',
                color: '#2563eb'
            },
            {
                id: 'junho',
                name: '박준호',
                email: 'junho@deepet.local',
                role: 'member',
                status: 'active',
                initials: '준호',
                color: '#059669'
            },
            {
                id: 'sora',
                name: '김소라',
                email: 'sora@deepet.local',
                role: 'member',
                status: 'invited',
                initials: '소라',
                color: '#d97706',
                invitationToken: 'demo-invite'
            }
        ],
        documents: [
            {
                id: 'doc-brief',
                title: '2027 신사업 추진 제안서',
                format: 'hwpx',
                size: 248320,
                ownerId: 'minji',
                createdAt: '2026-11-04T00:00:00.000Z',
                updatedAt: '2026-11-06T00:40:00.000Z',
                representativeVersionId: 'v-brief-2',
                description: '추진 배경과 실행 계획을 함께 검토하는 문서'
            },
            {
                id: 'doc-guide',
                title: '팀 온보딩 가이드',
                format: 'hwpx',
                size: 180224,
                ownerId: 'admin',
                createdAt: '2026-11-02T00:00:00.000Z',
                updatedAt: '2026-11-05T08:00:00.000Z',
                representativeVersionId: 'v-guide-1',
                description: '새로운 동료를 위한 업무 안내와 체크리스트'
            },
            {
                id: 'doc-meeting',
                title: '11월 프로젝트 회의록',
                format: 'hwp',
                size: 98304,
                ownerId: 'junho',
                createdAt: '2026-11-05T01:00:00.000Z',
                updatedAt: '2026-11-06T00:20:00.000Z',
                representativeVersionId: 'v-meeting-1',
                description: '이번 주 결정 사항과 다음 일정 정리'
            }
        ],
        branches: [],
        versions: [],
        sessions: [],
        messages: [],
        jobs: [],
        attachments: [],
        settings: { retentionDays: 30 },
        scenario,
        notice: null,
        connection: scenario === 'disconnected' ? 'disconnected' : 'connected',
        loading: scenario === 'loading',
        error:
            scenario === 'error'
                ? '예시 데이터를 불러오지 못했습니다. 기본 화면으로 돌아가 다시 확인해 주세요.'
                : scenario === 'forbidden'
                  ? '이 화면에 접근할 권한이 없습니다.'
                  : null
    };
    state.currentUser = state.members.find((member) => member.id === 'minji')!;
    if (scenario === 'empty') {
        state.documents = [];
        return state;
    }
    const contents: Record<string, string> = {
        'doc-brief':
            '2027 신사업 추진 제안서\n\n1. 추진 배경\n고객의 문서 업무를 줄이고 팀의 협업 속도를 높입니다.\n\n2. 추진 방향\n사용자가 익숙한 문서 형식을 유지하면서 검토와 수정을 함께 진행합니다.\n\n3. 실행 계획\n11월에는 요구사항을 검토하고 12월에는 시범 운영을 시작합니다.',
        'doc-guide':
            '팀 온보딩 가이드\n\n새로운 동료를 환영합니다.\n첫 주에는 팀 소개와 업무 도구 사용법을 익힙니다.\n\n체크리스트\n계정 초대 수락, 팀 문서 확인, 담당자와 첫 미팅을 진행합니다.',
        'doc-meeting':
            '11월 프로젝트 회의록\n\n참석: 김민지, 박준호, 이서연\n\n결정 사항\n문서 목록과 편집 화면을 먼저 검토합니다.\n\n다음 할 일\n김민지: 제안서 정리\n박준호: 회의 결과 공유'
    };
    for (const document of state.documents) {
        const slug = document.id.replace('doc-', '');
        const id = `v-${slug}-1`;
        const branchId = `branch-${slug}-${document.ownerId}`;
        state.versions.push({
            id,
            documentId: document.id,
            branchId,
            parentVersionId: null,
            sourceVersionId: null,
            authorId: document.ownerId,
            title: '첫 문서',
            summary: '검토를 시작한 문서입니다.',
            content: contents[document.id],
            createdAt: document.createdAt,
            kind: 'initial'
        });
        state.branches.push({
            id: branchId,
            documentId: document.id,
            userId: document.ownerId,
            headVersionId: id,
            baseVersionId: id,
            revision: 1,
            savedRevision: 1,
            content: contents[document.id]
        });
    }
    const brief = state.branches.find((branch) => branch.documentId === 'doc-brief')!;
    const revised = `${brief.content}\n\n기대 효과\n반복 작업을 줄여 검토에 집중할 수 있습니다.`;
    state.versions.push({
        id: 'v-brief-2',
        documentId: 'doc-brief',
        branchId: brief.id,
        parentVersionId: 'v-brief-1',
        sourceVersionId: null,
        authorId: 'minji',
        title: '추진 방향 정리',
        summary: '기대 효과를 추가하고 실행 계획을 정리했습니다.',
        content: revised,
        createdAt: '2026-11-05T08:00:00.000Z',
        kind: 'session'
    });
    brief.headVersionId = 'v-brief-2';
    brief.content = revised;
    brief.revision = 2;
    brief.savedRevision = 2;
    state.versions.push({
        id: 'v-brief-junho-1',
        documentId: 'doc-brief',
        branchId: 'branch-brief-junho',
        parentVersionId: 'v-brief-2',
        sourceVersionId: 'v-brief-2',
        authorId: 'junho',
        title: '일정 검토 의견',
        summary: '박준호의 브랜치에 시범 운영 일정 의견을 추가했습니다.',
        content: `${revised}\n\n검토 의견: 시범 운영은 두 팀에서 시작합니다.`,
        createdAt: '2026-11-06T00:40:00.000Z',
        kind: 'manual'
    });
    state.branches.push({
        id: 'branch-brief-junho',
        documentId: 'doc-brief',
        userId: 'junho',
        headVersionId: 'v-brief-junho-1',
        baseVersionId: 'v-brief-2',
        revision: 1,
        savedRevision: 1,
        content: state.versions.at(-1)!.content
    });
    state.sessions = [
        {
            id: 'session-brief-minji',
            documentId: 'doc-brief',
            branchId: brief.id,
            userId: 'minji',
            title: '추진 방향과 기대 효과 정리',
            createdAt: '2026-11-05T07:00:00.000Z',
            updatedAt: '2026-11-05T08:00:00.000Z'
        },
        {
            id: 'session-brief-junho',
            documentId: 'doc-brief',
            branchId: 'branch-brief-junho',
            userId: 'junho',
            title: '시범 운영 일정 검토',
            createdAt: '2026-11-06T00:00:00.000Z',
            updatedAt: '2026-11-06T00:40:00.000Z'
        }
    ];
    state.messages = [
        {
            id: 'message-1',
            sessionId: 'session-brief-minji',
            role: 'user',
            content: '제안서의 추진 방향을 간결하게 정리하고 기대 효과를 추가해 주세요.',
            createdAt: '2026-11-05T07:10:00.000Z',
            userId: 'minji',
            jobId: null,
            attachmentIds: []
        },
        {
            id: 'message-2',
            sessionId: 'session-brief-minji',
            role: 'assistant',
            content:
                '추진 방향과 기대 효과를 정리한 예시입니다. 검토한 결과를 대표 버전으로 지정할 수 있습니다.',
            createdAt: '2026-11-05T07:11:00.000Z',
            userId: 'minji',
            jobId: null,
            attachmentIds: []
        },
        {
            id: 'message-3',
            sessionId: 'session-brief-junho',
            role: 'user',
            content: '시범 운영을 두 팀에서 먼저 진행하는 일정으로 검토해 주세요.',
            createdAt: '2026-11-06T00:10:00.000Z',
            userId: 'junho',
            jobId: null,
            attachmentIds: []
        },
        {
            id: 'message-4',
            sessionId: 'session-brief-junho',
            role: 'assistant',
            content:
                '일정 검토 의견을 박준호님의 작업본에 정리했습니다. 이 대화와 버전은 모든 구성원이 볼 수 있습니다.',
            createdAt: '2026-11-06T00:11:00.000Z',
            userId: 'junho',
            jobId: null,
            attachmentIds: []
        }
    ];
    state.jobs = [
        {
            id: 'job-example-complete',
            documentId: 'doc-brief',
            branchId: brief.id,
            userId: 'minji',
            sessionId: 'session-brief-minji',
            prompt: '추진 방향과 기대 효과를 정리해 주세요.',
            status: 'succeeded',
            applyStatus: 'applied',
            progress: 100,
            baseRevision: 1,
            resultVersionId: 'v-brief-2',
            createdAt: '2026-11-05T07:10:00.000Z',
            updatedAt: '2026-11-05T07:11:00.000Z',
            error: null,
            attachmentIds: []
        }
    ];
    for (const slug of ['guide', 'meeting']) {
        const documentId = `doc-${slug}`;
        const base = state.versions.find((version) => version.id === `v-${slug}-1`)!;
        state.branches.push({
            id: `branch-${slug}-minji`,
            documentId,
            userId: 'minji',
            headVersionId: base.id,
            baseVersionId: base.id,
            revision: 1,
            savedRevision: 1,
            content: base.content
        });
        state.sessions.push({
            id: `session-${slug}-minji`,
            documentId,
            branchId: `branch-${slug}-minji`,
            userId: 'minji',
            title: slug === 'guide' ? '온보딩 안내 정리' : '회의 결정 사항 요약',
            createdAt: '2026-11-06T00:20:00.000Z',
            updatedAt: '2026-11-06T00:30:00.000Z'
        });
    }
    state.jobs.push(
        {
            id: 'job-queued',
            documentId: 'doc-brief',
            branchId: brief.id,
            userId: 'minji',
            sessionId: 'session-brief-minji',
            prompt: '추진 배경을 더 읽기 쉽게 정리해 주세요.',
            status: 'queued',
            applyStatus: 'none',
            progress: 0,
            baseRevision: 2,
            resultVersionId: null,
            createdAt: '2026-11-06T00:30:00.000Z',
            updatedAt: '2026-11-06T00:30:00.000Z',
            error: null,
            attachmentIds: []
        },
        {
            id: 'job-failed',
            documentId: 'doc-guide',
            branchId: 'branch-guide-minji',
            userId: 'minji',
            sessionId: 'session-guide-minji',
            prompt: '첫 주 체크리스트를 정리해 주세요.',
            status: 'failed',
            applyStatus: 'none',
            progress: 30,
            baseRevision: 1,
            resultVersionId: null,
            createdAt: '2026-11-06T00:21:00.000Z',
            updatedAt: '2026-11-06T00:25:00.000Z',
            error: '예시 연결 오류입니다. 다시 요청할 수 있습니다.',
            attachmentIds: []
        },
        {
            id: 'job-running',
            documentId: 'doc-meeting',
            branchId: 'branch-meeting-minji',
            userId: 'minji',
            sessionId: 'session-meeting-minji',
            prompt: '회의 결정 사항과 담당자별 할 일을 요약해 주세요.',
            status: 'running',
            applyStatus: 'none',
            progress: 45,
            baseRevision: 1,
            resultVersionId: null,
            createdAt: '2026-11-06T00:22:00.000Z',
            updatedAt: '2026-11-06T00:26:00.000Z',
            error: null,
            attachmentIds: []
        }
    );
    for (const job of state.jobs.filter((item) => item.id !== 'job-example-complete')) {
        state.messages.push({
            id: `message-${job.id}`,
            sessionId: job.sessionId,
            role: 'user',
            content: job.prompt,
            createdAt: job.createdAt,
            userId: job.userId,
            jobId: job.id,
            attachmentIds: []
        });
    }
    if (scenario === 'conflict') {
        const content = `${brief.content}\n\n직접 편집: 내부 검토 일정을 하루 앞당깁니다.`;
        brief.content = content;
        brief.revision = 3;
        const resultId = 'v-brief-ai-conflict';
        state.versions.push({
            id: resultId,
            documentId: 'doc-brief',
            branchId: brief.id,
            parentVersionId: 'v-brief-2',
            sourceVersionId: null,
            authorId: 'minji',
            title: 'AI 수정 결과',
            summary: '일정과 기대 효과를 정리한 별도 예시 결과입니다.',
            content: `${revised}\n\nAI 예시: 시범 운영 후 팀 의견을 수집합니다.`,
            createdAt: FIXTURE_TIME,
            kind: 'ai'
        });
        state.jobs.push({
            id: 'job-conflict',
            documentId: 'doc-brief',
            branchId: brief.id,
            userId: 'minji',
            sessionId: 'session-brief-minji',
            prompt: '일정과 기대 효과를 정리해 주세요.',
            status: 'succeeded',
            applyStatus: 'pending',
            progress: 100,
            baseRevision: 2,
            resultVersionId: resultId,
            createdAt: '2026-11-06T00:50:00.000Z',
            updatedAt: FIXTURE_TIME,
            error: null,
            attachmentIds: []
        });
    }
    return state;
}
