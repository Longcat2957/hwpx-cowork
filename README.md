# hwpx-cowork

사내 구성원이 HWP/HWPX 문서를 웹에서 직접 편집하거나, AI와 대화하며 수정하는 서비스입니다. PC와 모바일을 지원하며 모바일에서는 AI 지시와 결과 확인을 중심으로 사용합니다.

rhwp가 문서 편집을 담당하고, 이 프로젝트는 사용자·문서·버전·AI 작업을 관리합니다. AI 실행은 DeepSeek Harness가 담당하며, 모든 모델 호출은 OpenRouter의 `deepseek/deepseek-v4.1-flash-1017`로 고정합니다. 요약 같은 보조 호출에도 같은 모델을 사용합니다.

## 서비스 구조와 사용 방식

SvelteKit 웹 서버는 화면과 API를 제공하고, 별도 Worker가 SQLite에 저장된 AI 작업을 실행합니다. 브라우저를 닫아도 작업은 계속됩니다. 라즈베리파이 5에서 운영하며 사용자·버전·작업의 관계는 SQLite에, 실제 문서와 첨부파일은 파일시스템에 저장합니다.

- 문서 목록에는 문서 하나가 표시되며, 내부에 사용자별 브랜치와 세션별 버전을 보관합니다.
- 다른 사용자는 별도 브랜치에서 편집하고, 같은 사용자는 기존 브랜치에서 계속 작업합니다.
- 대화 세션의 수정 전 상태를 보관해 세션 단위로 되돌릴 수 있습니다.
- AI는 임시 작업본을 수정합니다. 실행 중 직접 편집이 겹치면 두 결과를 보관하고 사용자가 선택합니다.
- 자신의 작업 결과를 적용하는 것과 모든 구성원이 보는 대표 버전으로 지정하는 것은 별도 동작입니다.
- 초대받은 구성원은 문서·버전·문서 대화를 열람하고 자신의 브랜치에서 편집합니다.

## 현재 상태와 구현 순서

초기 스캐폴드에서 의존성과 빈 파일 81개를 준비한 뒤, 프런트엔드 화면과 개발용 mock을 구현했습니다. SvelteKit 3·Svelte 5·TypeScript·Tailwind CSS 4, 설치된 shadcn-svelte UI 63개 묶음과 `@lucide/svelte`를 사용합니다. 문서·작업·구성원 목록은 공식 Data Table 가이드를 바탕으로 공통화하고 `@tanstack/svelte-table` 9.3.1을 추가했습니다.

**F1~F7의 프런트 화면과 mock을 구현했고, 단위 테스트 11개와 데스크톱·모바일 브라우저 검증 14개를 통과했습니다. F8의 실제 기기·한글 IME 수동 확인은 남아 있습니다.** 백엔드·실제 연동 B1~B10은 이어서 진행합니다. 목표와 현재 검증 범위는 [세부 코드 작성 계획](docs/implementation-plan.md)에 구분합니다.

| 순서 | 구현 내용 | 현재 상태 |
| --- | --- | --- |
| F1 | 타입 계약, 앱별 gateway, mock 데이터·시나리오, 이벤트 커서 | 구현, 상태 전환 단위 테스트 11개 통과 |
| F2 | 사이드바·공통 레이아웃, 로그인·초대 화면 | UI 구현, 주요 브라우저 흐름 검증 통과 |
| F3 | 문서 목록·검색·정렬·페이지 이동, 업로드·생성 화면 | UI와 mock 구현, 주요 브라우저 흐름 검증 통과 |
| F4 | 문서·대화 분할, 모바일 전환, 읽기 전용 샘플, rhwp 어댑터 | UI 구현, 실제 Studio·문서 열기/저장 미검증 |
| F5 | 대화 이력·첨부·작업 진행·취소·재시도 화면 | UI와 mock 구현, 주요 브라우저 흐름 검증 통과 |
| F6 | 버전·비교·복원·충돌 선택·대표 버전 화면 | UI와 mock 구현, 실제 파일 보존 미검증 |
| F7 | 관리자 구성원·초대·보관 설정 화면 | UI와 mock 구현, 실제 관리 기능 미구현 |
| F8 | 반응형·접근성·mock 전체 흐름 검토 | 자동 검증 통과, 실제 기기·IME 수동 확인 남음 |

[gateway.ts](src/lib/client/gateway.ts)는 화면이 사용하는 타입 계약, [context.ts](src/lib/client/context.ts)는 앱별 Svelte context, [mock/](src/lib/client/mock/)는 동기 메모리 구현과 예시 데이터·시나리오를 담당합니다. [contracts/](src/lib/contracts/)에는 문서·버전·세션·작업·이벤트와 인증·구성원·첨부·설정 타입을 작성했습니다. [events.ts](src/lib/client/events.ts)는 이벤트 커서와 중복 제거를 구현하며 [api.ts](src/lib/client/api.ts)는 후속 HTTP 연결용 빈 파일입니다. 공통 목록과 상태 표시는 [common/](src/lib/components/common/), 표시 형식은 [format.ts](src/lib/client/format.ts)에 있습니다.

[루트 레이아웃](src/routes/+layout.svelte)은 `import.meta.env.DEV`일 때만 앱별 mock gateway를 생성합니다. 개발 환경에서 `pnpm dev:web`으로 서비스 API·DB·Worker·환경 변수 파일·OpenRouter 키 없이 검토할 수 있습니다. 화면에 예시 데이터임을 표시하고 새로고침하면 초기화합니다. 기본·빈 목록·로딩·오류·접근 제한·충돌·연결 끊김 시나리오와 구성원 전환을 제공합니다. 운영 빌드는 백엔드 미연결 안내를 표시하며, 운영 요청 실패 시 mock으로 자동 전환하지 않습니다.

mock 작업은 사용자가 진행 동작을 누르면 대기→실행→완료 상태로 바뀝니다. 역할·작업 소유자 검사, 수정 번호를 확인한 결과 선택, 직접 편집본과 AI 결과 보관, 대표 버전 변경 분리를 구현했습니다. 이벤트 구독과 `setConnection`으로 끊긴 동안의 이벤트 재전달·중복 제거를 확인할 수 있습니다. 이는 브라우저 메모리에서 재현하는 상태 전환이며 실제 LLM·SSE·영속 저장·브라우저 종료 후 작업 지속을 수행하지 않습니다.

[rhwp-bridge.ts](src/lib/client/rhwp-bridge.ts)는 SDK를 브라우저에서만 불러오고 명시적으로 전달한 같은 출처의 Studio에 연결하는 어댑터입니다. [document-host.svelte](src/lib/components/editor/document-host.svelte)에 호스트와 로딩·오류 UI를 마련했지만 Studio는 아직 설정하지 않았습니다. 현재 문서는 실제 HWP 렌더링이 아닌 읽기 전용 샘플 텍스트입니다. 가짜 편집기나 문서 다운로드를 제공하지 않으며, 실제 파일이 없으면 다운로드할 수 없는 이유를 표시합니다. HWP/HWPX 열기→편집→저장→다시 열기와 서식 보존은 B2·B5에서 검증합니다.

서버 페이지 처리·API·인증·DB 스키마·서버 서비스·Worker·배포 파일은 초기 빈 상태를 유지합니다. 웹 Node 어댑터, Worker 별도 빌드, 포맷터와 테스트 도구를 준비한 것은 B1의 설정 준비이며 B1 완료를 뜻하지 않습니다. [.env.example](.env.example)은 변경하지 않은 설정 예시이고 이를 읽고 검증하는 서버 코드는 아직 없습니다.

프런트엔드 검토 후에는 B1 실행 기반 → B2 rhwp·Harness·OpenRouter 통합 검증 → B3 DB·파일·버전 → B4 인증 → B5 직접 편집 → B6 AI 대화 편집 → B7 버전 관리 → B8 새 문서·선택 영역·참고 자료 → B9 실제 모바일 흐름 → B10 운영·백업 순서로 이어갑니다. 라즈베리파이 ARM64 실기기와 실제 문서·AI 연결의 검증은 별도로 남아 있습니다.

## 개발 문서

- [승인된 프로젝트 스캐폴드와 설계](docs/architecture.md)
- [세부 코드 작성 계획](docs/implementation-plan.md)
- [라즈베리파이 운영 계획](deployment/rpi_server.md)
- [Git 설정과 소스 관리](docs/git.md)

직접 작성하거나 수정하는 코드와 설정의 들여쓰기는 반드시 공백 4개를 사용합니다. 작업 지침은 [AGENTS.md](AGENTS.md), 편집기 설정은 [.editorconfig](.editorconfig)에 있습니다.

## 실행

DeepSeek Harness의 실행 조건에 맞춰 Node.js 24.9 이상과 [package.json](package.json)에 지정한 pnpm이 필요합니다.

```sh
pnpm install
pnpm dev:web
```

VS Code에서는 [.vscode/tasks.json](.vscode/tasks.json)의 `dev:web` 작업으로 개발 서버를 실행할 수도 있습니다.

별도 터미널에서 Worker 개발 명령을 사용할 수 있습니다.

```sh
pnpm dev:worker
```

현재 [worker/index.ts](worker/index.ts)는 빈 파일입니다. Worker 실행은 할 일 없이 끝나며 개발 명령의 watch 모드만 변경을 기다립니다. 작업 처리나 상시 대기 기능은 아직 없습니다. `data/`와 SQLite 파일은 이후 실행 코드가 생성할 운영 데이터이며, 스캐폴드에 가짜 DB 파일을 만들지 않았습니다.

Worker 개발 실행에는 `tsx`를 사용합니다. 현재 설치된 Node.js 24.19 바이너리는 TypeScript 지원 없이 빌드되어 있어 `.ts` 파일 직접 실행을 지원하지 않습니다. 운영 실행은 Vite가 빌드한 JavaScript를 사용합니다.

## 검사·빌드·테스트 명령

```sh
pnpm lint
pnpm check
pnpm build
```

`pnpm check`는 웹과 Worker의 타입 검사, `pnpm build`는 웹과 Worker의 빌드를 묶습니다. 각각 `check:web`, `check:worker`, `build:web`, `build:worker`로 나누어 실행할 수 있습니다. 웹은 Node 어댑터로 [build/](build/)에, Worker는 [vite.worker.config.ts](vite.worker.config.ts)를 통해 [dist/worker/](dist/worker/)에 출력하도록 구성했습니다. 빌드 후 실행 명령은 다음과 같습니다.

```sh
pnpm start:web
pnpm start:worker
```

포맷 수정은 `pnpm format`, 공백 4개 규칙을 포함한 포맷 검사는 `pnpm lint`를 사용합니다. 자동 생성되는 [pnpm-lock.yaml](pnpm-lock.yaml)은 Prettier 검사에서 제외합니다.

```sh
pnpm test:unit
pnpm test:e2e
```

위 명령은 각각 Vitest와 Playwright용입니다. [gateway.test.ts](tests/unit/gateway.test.ts)의 상태 전환 테스트 11개를 통과했습니다. 앱별 격리·초기화, 권한, 초대, 브랜치·버전 보존, AI 결과 충돌·대표 버전 경합, 작업 순서·취소·재시도, 이벤트 커서·재연결을 검증합니다. [preview.spec.ts](tests/e2e/preview.spec.ts)의 7개 시나리오를 데스크톱·모바일 Chromium에서 실행해 14개를 통과했습니다. 문서 생성·검색, 작업 취소, 충돌 결과 선택과 대표 버전 유지, 로그인·초대, 관리자 설정, 모바일 이동·입력 보존을 확인했습니다. 실제 기기·IME 수동 확인과 백엔드 검증은 별도로 남아 있습니다. 브라우저 테스트를 처음 실행할 때는 `pnpm exec playwright install chromium`으로 브라우저를 준비합니다.

Drizzle 명령 `pnpm db:generate`, `pnpm db:migrate`도 준비했지만 [schema/](src/lib/server/db/schema/)와 [migrations/](migrations/)가 비어 있으므로 DB 구현 단계에서 스키마를 작성한 뒤 사용합니다.

초기 스캐폴드 검증에서는 포맷·타입 검사, 웹·Worker 빌드와 lockfile 고정 설치를 확인했습니다. Linux ARM64·Node.js 24.19에서 SQLite 메모리 DB 쿼리와 Harness SDK·rhwp 편집기 모듈 로딩도 확인했습니다. 이후 프런트엔드에서 [(app)/+layout.svelte](src/routes/(app)/+layout.svelte)의 자식 렌더링을 연결했습니다. 현재 `pnpm lint`, `pnpm check`(오류·경고 0개), 웹·Worker 빌드, 의존성 peer 검사와 lockfile 고정 설치가 통과했습니다. 운영 빌드의 `/documents`가 mock 문서 대신 미연결 안내를 표시하는 것도 확인했습니다. 라즈베리파이 실기기 및 문서·AI 연동은 아직 미검증입니다.

## 의존성과 UI 컴포넌트

| 용도 | 설치 버전 |
| --- | --- |
| 웹 Node 어댑터 | `@sveltejs/adapter-node` 6.0.1 |
| DeepSeek Harness와 SDK | `@deepseek-ai/dsh`, `@deepseek-ai/dsh-sdk-client` 0.2.2-rc.1 |
| rhwp 웹 편집기 | `@rhwp/editor` 0.8.7 |
| SQLite·ORM | `better-sqlite3` 13.0.3, `drizzle-orm` 0.45.4 |
| 입력 검증 | `zod` 4.6.7 |
| 목록 검색·정렬·페이지 이동 | `@tanstack/svelte-table` 9.3.1 |

Harness와 SDK는 같은 명시 버전으로 맞췄습니다. 이 버전 고정은 설치 재현성을 위한 것으로, 문서 편집·OpenRouter·MCP·ARM64 통합 호환성은 B2에서 확인합니다. 아직 모델 요청을 실행하는 코드는 없으며 모든 LLM 호출에 `deepseek/deepseek-v4.1-flash-1017`을 적용하는 정책도 구현 대상입니다.

[pnpm-workspace.yaml](pnpm-workspace.yaml)에는 필요한 설치 스크립트 허용 목록과 의존성 호환 버전을 기록했습니다. OpenTelemetry API는 Harness와 관련 패키지의 공통 범위인 `1.9.1`을 사용하고, UI 내부의 Runed `0.35.1`·`0.37.1` 참조는 SvelteKit 3를 지원하는 `0.38.0`으로 맞췄습니다. `pnpm peers check`에서 충돌이 없음을 확인했습니다.

shadcn-svelte 설정은 [components.json](components.json), 테마는 [src/app.css](src/app.css), 설치된 63개 UI 묶음은 [src/lib/components/ui/](src/lib/components/ui/)에 있습니다. 전체 설치에 사용한 명령은 다음과 같습니다.

```sh
pnpm exec shadcn-svelte add --all
```

아이콘은 `@lucide/svelte`에서 가져옵니다. SvelteKit 3의 `#lib` 경로 별칭을 사용하며 웹과 Worker 설정은 [vite.config.ts](vite.config.ts), [vite.worker.config.ts](vite.worker.config.ts)에 있습니다.

레이아웃 구현 전에 공식 원본을 확인했고, [sidebar-07](https://shadcn-svelte.com/blocks/sidebar#sidebar-07)과 [login-01](https://shadcn-svelte.com/blocks/login#login-01)의 구성을 설치된 Sidebar·Breadcrumb·Sheet·Card·Field 등으로 재사용했습니다. Blocks 전체를 CLI로 설치한 것은 아닙니다. 문서 작업 공간은 Resizable, 대화는 Message·Bubble·MessageScroller·Attachment·Trace를 사용하고, 버전 패널에는 [sidebar-11](https://shadcn-svelte.com/blocks/sidebar#sidebar-11)의 접기 패턴을 적용했습니다. [공통 Data Table](src/lib/components/common/data-table.svelte)은 공식 가이드에 따라 TanStack Table v9로 구성했습니다. 문서 브랜치·버전 관계와 결과 선택 등 서비스 고유 동작만 별도 코드로 연결했습니다.

## 소스 관리

기본 Git 브랜치는 `main`을 사용합니다. `.gitignore`에는 환경 변수, 실행 데이터, 백업, 로컬 서버 접속 정보와 빌드 결과를 제외하도록 설정했습니다. `.gitattributes`는 텍스트 파일의 LF 줄바꿈과 문서·이미지 파일의 바이너리 처리를 정의합니다.

공개 소스 저장소는 [Longcat2957/hwpx-cowork](https://github.com/Longcat2957/hwpx-cowork)이며, `origin`으로 연결했습니다. `main` 브랜치로 Git 저장소 초기화를 완료하고, 저장소 로컬 줄바꿈·공백 검사 설정을 적용했습니다. 설정 명령은 [Git 설정 문서](docs/git.md)에 있습니다. 웹 서비스의 실제 운영 배포는 B10에서 진행합니다.

소스 코드의 Git 이력과 서비스 안의 문서 버전은 각각 관리합니다. 서비스 문서의 브랜치·복원점은 SQLite와 문서 파일 저장소로 구현합니다.
