import { expect, test, type Page } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();
const briefTitle = '2027 신사업 추진 제안서';

test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    pageErrors.set(page, errors);
    page.on('pageerror', (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
    expect(pageErrors.get(page), '브라우저 실행 오류가 없어야 합니다.').toEqual([]);
});

async function openPreview(page: Page, path: string) {
    await page.goto(path);
    // The development server renders HTML before its client modules finish hydrating.
    await page.waitForLoadState('networkidle');
}

async function setPreview(page: Page, options: { user?: string; scenario?: string }) {
    await page.getByRole('button', { name: '미리보기 설정', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '미리보기 설정', exact: true });
    await expect(dialog).toBeVisible();
    if (options.scenario) {
        await dialog.getByLabel('샘플 상황').selectOption(options.scenario);
    }
    if (options.user) {
        await dialog.getByLabel('샘플 계정').selectOption(options.user);
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();
}

async function navigateFromSidebar(page: Page, name: string) {
    const link = page.getByRole('link', { name, exact: true }).first();
    if (!(await link.isVisible())) {
        await page.getByRole('button', { name: '메뉴 열기 또는 닫기' }).click();
    }
    await page.getByRole('link', { name, exact: true }).first().click();
    await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
}

async function showChat(page: Page) {
    const tab = page.getByRole('tab', { name: '대화', exact: true });
    if (await tab.isVisible()) await tab.click();
    await expect(page.getByRole('region', { name: '문서 AI 대화' })).toBeVisible();
}

async function expectNoViewportOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(
        overflow,
        '표와 패널은 페이지 전체를 가로로 밀어내지 않아야 합니다.'
    ).toBeLessThanOrEqual(1);
}

test('문서 검색과 새 문서가 화면 이동 뒤에도 같은 목록에 반영된다', async ({ page }) => {
    await openPreview(page, '/documents');
    const search = page.getByRole('textbox', { name: '문서 이름 검색' });
    await search.fill('없는 문서 이름');
    await expect(page.getByText('검색 결과가 없습니다', { exact: true })).toBeVisible();
    await search.fill('온보딩');
    await expect(page.getByRole('link', { name: /팀 온보딩 가이드/ })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(briefTitle) })).toHaveCount(0);
    await search.clear();

    await page.getByRole('button', { name: '새 문서', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '새 문서', exact: true });
    await dialog.getByLabel('문서 이름').fill('프런트 검토 기록');
    await dialog.getByRole('button', { name: '문서 만들기', exact: true }).click();
    await expect(page.getByRole('heading', { name: '프런트 검토 기록', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: '문서 목록으로 돌아가기' }).click();
    await expect(page.getByRole('link', { name: /프런트 검토 기록/ })).toBeVisible();
    await expect(page.getByText('총 4개', { exact: true })).toBeVisible();
    await expectNoViewportOverflow(page);
});

test('작업 취소 확인과 취소 결과가 문서 대화에도 유지된다', async ({ page }) => {
    await openPreview(page, '/jobs');
    const row = page
        .getByRole('row')
        .filter({ hasText: '회의 결정 사항과 담당자별 할 일을 요약해 주세요.' });
    await expect(row.getByText('실행 중', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: '취소', exact: true }).click();
    let confirmation = page.getByRole('alertdialog', { name: '이 작업을 취소할까요?' });
    await confirmation.getByRole('button', { name: '계속 진행', exact: true }).click();
    await expect(row.getByText('실행 중', { exact: true })).toBeVisible();

    await row.getByRole('button', { name: '취소', exact: true }).click();
    confirmation = page.getByRole('alertdialog', { name: '이 작업을 취소할까요?' });
    await confirmation.getByRole('button', { name: '작업 취소', exact: true }).click();
    await expect(row.getByText('취소됨', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: /11월 프로젝트 회의록/ }).click();
    const detail = page.getByRole('dialog', { name: '작업 상세', exact: true });
    await detail.getByRole('link', { name: /문서에서 확인/ }).click();
    await expect(
        page.getByRole('heading', { name: '11월 프로젝트 회의록', level: 1 })
    ).toBeVisible();
    await showChat(page);
    const chat = page.getByRole('region', { name: '문서 AI 대화' });
    await expect(chat.getByText('취소됨', { exact: true })).toBeVisible();
    await expect(chat.getByRole('button', { name: '다시 요청', exact: true })).toBeVisible();
});

test('충돌 결과를 나중에 선택하거나 적용해도 대표 버전은 자동 변경되지 않는다', async ({
    page
}) => {
    await openPreview(page, '/documents');
    await setPreview(page, { scenario: 'conflict' });
    await page.getByRole('link', { name: new RegExp(briefTitle) }).click();
    await expect(page.getByRole('heading', { name: briefTitle, level: 1 })).toBeVisible();
    await showChat(page);
    const compare = page.getByRole('button', { name: '결과 비교·선택', exact: true });
    await compare.click();
    let dialog = page.getByRole('dialog', { name: '내 편집본과 AI 결과 선택', exact: true });
    await expect(dialog.getByText(/직접 편집: 내부 검토 일정을 하루 앞당깁니다/)).toBeVisible();
    await expect(dialog.getByText(/AI 예시: 시범 운영 후 팀 의견을 수집합니다/)).toBeVisible();
    await dialog.getByRole('button', { name: '나중에 선택', exact: true }).click();
    await expect(compare).toBeVisible();
    await compare.click();
    dialog = page.getByRole('dialog', { name: '내 편집본과 AI 결과 선택', exact: true });
    await dialog.getByRole('button', { name: 'AI 결과로 바꾸기', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(compare).toHaveCount(0);

    await page.getByRole('link', { name: '문서 목록으로 돌아가기' }).click();
    const document = page.getByRole('row').filter({ hasText: briefTitle });
    await expect(document).toContainText('추진 방향 정리');
    await expect(document).not.toContainText('AI 수정 결과');
    await document.getByRole('link', { name: new RegExp(briefTitle) }).click();
    await page.getByRole('button', { name: '버전', exact: true }).click();
    const versions = page.getByRole('dialog', { name: '문서 버전', exact: true });
    await expect(
        versions.getByRole('heading', { name: '추진 방향 정리', exact: true })
    ).toBeVisible();
    await expect(
        versions.getByRole('button', { name: '대표 버전 지정', exact: true })
    ).toBeDisabled();
});

test('로그인 실패를 안내하고 샘플 로그인과 초대 만료·사용 상태를 처리한다', async ({ page }) => {
    await openPreview(page, '/login');
    await page.getByLabel('이메일', { exact: true }).fill('unknown@deepet.local');
    await page.getByLabel('비밀번호', { exact: true }).fill('preview1234');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('로그인 정보를 확인해 주세요.');
    await page.getByRole('button', { name: '샘플 계정 채우기', exact: true }).click();
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.getByRole('heading', { name: '문서', exact: true, level: 1 })).toBeVisible();

    const userMenu = page.getByRole('button', { name: '김민지 사용자 메뉴', exact: true });
    if (!(await userMenu.isVisible())) {
        await page.getByRole('button', { name: '메뉴 열기 또는 닫기' }).click();
    }
    await userMenu.click();
    await page.getByRole('menuitem', { name: '로그아웃', exact: true }).click();
    await expect(page.getByRole('heading', { name: '다시 만나 반갑습니다' })).toBeVisible();
    await page.getByRole('link', { name: '초대 수락 화면 미리보기' }).click();
    await expect(page.getByLabel('이메일', { exact: true })).toHaveValue('sora@deepet.local');
    await page.getByRole('link', { name: '만료', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('초대 유효 기간이 지났습니다.');
    await page.getByRole('link', { name: '사용됨', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('이미 수락한 초대입니다.');
});

test('관리자 초대와 비활성화는 확인을 거치고 생성된 초대를 수락할 수 있다', async ({ page }) => {
    await openPreview(page, '/admin/members');
    await expect(page.getByText('관리자만 확인할 수 있습니다', { exact: true })).toBeVisible();
    await setPreview(page, { user: 'admin' });
    await page.getByRole('textbox', { name: '이름 또는 이메일 검색' }).fill('junho@');
    const member = page.getByRole('row').filter({ hasText: '박준호' });
    await member.getByRole('button', { name: '박준호 비활성화', exact: true }).click();
    let confirmation = page.getByRole('alertdialog', { name: '박준호 구성원을 비활성화할까요?' });
    await confirmation.getByRole('button', { name: '취소', exact: true }).click();
    await expect(member.getByText('활성', { exact: true })).toBeVisible();
    await member.getByRole('button', { name: '박준호 비활성화', exact: true }).click();
    confirmation = page.getByRole('alertdialog', { name: '박준호 구성원을 비활성화할까요?' });
    await confirmation.getByRole('button', { name: '비활성화', exact: true }).click();
    await expect(member.getByText('비활성', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '구성원 초대', exact: true }).click();
    const invite = page.getByRole('dialog');
    await invite.getByLabel('이름', { exact: true }).fill('한지우');
    await invite.getByLabel('이메일', { exact: true }).fill('minji@deepet.local');
    await invite.getByRole('button', { name: '샘플 초대 만들기', exact: true }).click();
    await expect(invite.getByRole('alert')).toContainText('이미 등록하거나 초대한 이메일입니다.');
    await invite.getByLabel('이메일', { exact: true }).fill('jiwoo@deepet.local');
    await invite.getByRole('button', { name: '샘플 초대 만들기', exact: true }).click();
    await expect(invite.getByText('샘플 초대가 준비되었습니다', { exact: true })).toBeVisible();
    await invite.getByRole('link', { name: /초대 화면 열기/ }).click();
    await expect(page.getByLabel('이메일', { exact: true })).toHaveValue('jiwoo@deepet.local');
    await page.getByLabel('이름', { exact: true }).fill('한지우');
    await page.getByLabel('비밀번호', { exact: true }).fill('preview1234');
    await page.getByRole('button', { name: '초대 수락하고 시작하기', exact: true }).click();
    await expect(page.getByRole('heading', { name: '문서', exact: true, level: 1 })).toBeVisible();
    const newUser = page.getByRole('button', { name: '한지우 사용자 메뉴', exact: true });
    if (!(await newUser.isVisible())) {
        await page.getByRole('button', { name: '메뉴 열기 또는 닫기' }).click();
    }
    await expect(newUser).toBeVisible();
});

test('보관 기간 검증·취소·저장과 실패 피드백을 구분한다', async ({ page }) => {
    await openPreview(page, '/admin/settings');
    await expect(page.getByText('관리자만 변경할 수 있습니다', { exact: true })).toBeVisible();
    await setPreview(page, { user: 'admin' });
    const days = page.getByRole('spinbutton', { name: '기본 보관 기간' });
    await expect(days).toHaveValue('30');
    await days.fill('0');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: '보관 기간은' })).toHaveText(
        '보관 기간은 1~3650일의 정수로 입력해 주세요.'
    );
    await days.fill('45');
    await page.getByRole('button', { name: '취소', exact: true }).click();
    await expect(days).toHaveValue('30');
    await days.fill('45');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByText('현재 샘플 설정: 45일', { exact: true })).toBeVisible();
    await expect(
        page.getByText('샘플 설정을 저장했습니다. 실제 이력 정리는 실행하지 않습니다.', {
            exact: true
        })
    ).toBeVisible();

    await setPreview(page, { scenario: 'error', user: 'admin' });
    await days.fill('90');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(
        page.getByRole('alert').filter({ hasText: '지금은 요청을 처리할 수 없습니다.' })
    ).toBeVisible();
    await expect(page.getByText('현재 샘플 설정: 90일', { exact: true })).toHaveCount(0);
});

test('반응형 메뉴 이동과 대화 탭 전환이 입력을 보존하며 화면을 넘치게 하지 않는다', async ({
    page
}) => {
    await openPreview(page, '/documents');
    await expectNoViewportOverflow(page);
    await navigateFromSidebar(page, '작업');
    await expectNoViewportOverflow(page);
    await navigateFromSidebar(page, '문서');
    await page.getByRole('link', { name: new RegExp(briefTitle) }).click();
    await expect(page.getByRole('heading', { name: briefTitle, level: 1 })).toBeVisible();
    await showChat(page);
    const draft = page.getByRole('textbox', { name: 'AI 작업 지시' });
    await draft.fill('실행 계획을 검토한 뒤 의견을 정리해 주세요.');
    const documentTab = page.getByRole('tab', { name: '문서', exact: true });
    if (await documentTab.isVisible()) {
        await documentTab.click();
        await expect(page.getByRole('article', { name: '문서 샘플 미리보기' })).toBeVisible();
        await page.getByRole('tab', { name: '대화', exact: true }).click();
    }
    await expect(draft).toHaveValue('실행 계획을 검토한 뒤 의견을 정리해 주세요.');
    await expectNoViewportOverflow(page);
    const previewButton = page.getByRole('button', { name: '미리보기 설정', exact: true });
    await previewButton.click();
    await expect(page.getByRole('dialog', { name: '미리보기 설정', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('dialog', { name: '미리보기 설정', exact: true })
    ).not.toBeVisible();
    await expect(previewButton).toBeFocused();
});
