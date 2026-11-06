export type Scenario =
    'default' | 'empty' | 'loading' | 'error' | 'forbidden' | 'conflict' | 'disconnected';

export const SCENARIO_LABELS: Record<Scenario, string> = {
    default: '기본 화면',
    empty: '빈 목록',
    loading: '불러오는 중',
    error: '오류 상태',
    forbidden: '접근 제한',
    conflict: '결과 충돌',
    disconnected: '연결 끊김'
};

export const SCENARIOS: { id: Scenario; label: string; description: string }[] = [
    {
        id: 'default',
        label: SCENARIO_LABELS.default,
        description: '문서와 대화가 준비된 예시입니다.'
    },
    { id: 'empty', label: SCENARIO_LABELS.empty, description: '문서가 없는 첫 화면을 확인합니다.' },
    {
        id: 'loading',
        label: SCENARIO_LABELS.loading,
        description: '데이터를 기다리는 화면을 확인합니다.'
    },
    { id: 'error', label: SCENARIO_LABELS.error, description: '조회와 저장 실패를 확인합니다.' },
    {
        id: 'forbidden',
        label: SCENARIO_LABELS.forbidden,
        description: '접근이 제한된 상태를 확인합니다.'
    },
    {
        id: 'conflict',
        label: SCENARIO_LABELS.conflict,
        description: '직접 편집과 AI 결과 중 선택합니다.'
    },
    {
        id: 'disconnected',
        label: SCENARIO_LABELS.disconnected,
        description: '진행 상황 연결이 끊어진 화면입니다.'
    }
];
