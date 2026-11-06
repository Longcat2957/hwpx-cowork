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

승인된 구조에 따라 의존성 설치와 빈 파일 스캐폴드를 준비했습니다. SvelteKit 3·Svelte 5·TypeScript·Tailwind CSS 4를 유지하며, shadcn-svelte 전체 추가 명령으로 설치한 UI 컴포넌트 63개 묶음과 공식 Lucide Svelte 패키지 `@lucide/svelte`를 사용할 수 있습니다.

애플리케이션·Worker·운영 구조용 빈 파일 81개를 추가했습니다. 페이지, API, 인증, DB, 문서·버전 서비스, Worker와 배포 파일은 빈 상태이며, 디렉터리만 정의된 곳에는 빈 `.gitkeep`을 두었습니다. 기본 경로(`/`)도 빈 페이지입니다. 설치된 UI 코드와 개발·빌드 설정을 제외한 서비스 기능은 아직 구현하지 않았습니다.

웹의 Node 어댑터, Worker 별도 빌드, 타입 검사, 공백 4개 포맷터, Vitest·Playwright·Drizzle 설정을 준비했습니다. 이는 1단계의 설정 준비 상태이며, 필수 환경 설정 검증·상태 확인 API·Worker 시작과 종료 및 대기 루프가 남아 있으므로 1단계 완료를 뜻하지 않습니다. `.env.example`에는 설정 예시만 있고 이를 읽고 검증하는 서비스 코드는 아직 없습니다. 테스트와 DB 스키마도 비어 있습니다.

구현은 실행 기반 → rhwp·Harness·OpenRouter 실제 연동 검증 → DB·파일·버전 → 인증 → 직접 편집 → AI 대화 편집 → 버전 트리·비교·복원 → 새 문서·선택 영역·참고 자료 → 모바일 → 운영·백업 순서로 진행합니다.

핵심 연동 단계에서는 HWP와 HWPX를 각각 열고 수정하고 저장한 뒤 다시 열어 본문·표·그림·서식을 확인합니다. 로컬에서 확인한 rhwp MCP 조작 경험을 바탕으로, 서비스의 전체 연결과 라즈베리파이 ARM64 실행을 별도로 검증합니다.

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

위 명령은 각각 Vitest와 Playwright용입니다. 현재 [tests/](tests/)에는 빈 디렉터리 보존 파일만 있으며 검증 사례는 아직 작성하지 않았습니다. 테스트 설정 준비를 서비스 동작 검증 완료로 보지 않습니다.

Drizzle 명령 `pnpm db:generate`, `pnpm db:migrate`도 준비했지만 [schema/](src/lib/server/db/schema/)와 [migrations/](migrations/)가 비어 있으므로 DB 구현 단계에서 스키마를 작성한 뒤 사용합니다.

스캐폴드 검증에서 `pnpm lint`, `pnpm check`, 웹·Worker 빌드와 lockfile 고정 설치를 확인했습니다. 현재 Linux ARM64·Node.js 24.19 환경에서 SQLite 메모리 DB 쿼리와 Harness SDK·rhwp 편집기 모듈 로딩도 확인했습니다. 라즈베리파이 실기기 및 문서·AI 연동 검증은 아직 수행하지 않았습니다. 빈 [(app)/+layout.svelte](src/routes/(app)/+layout.svelte) 때문에 하위 화면을 렌더링하지 않는다는 SvelteKit 경고가 표시됩니다. 화면 구현 단계에서 자식 렌더링을 연결합니다.

## 의존성과 UI 컴포넌트

| 용도 | 설치 버전 |
| --- | --- |
| 웹 Node 어댑터 | `@sveltejs/adapter-node` 6.0.1 |
| DeepSeek Harness와 SDK | `@deepseek-ai/dsh`, `@deepseek-ai/dsh-sdk-client` 0.2.2-rc.1 |
| rhwp 웹 편집기 | `@rhwp/editor` 0.8.7 |
| SQLite·ORM | `better-sqlite3` 13.0.3, `drizzle-orm` 0.45.4 |
| 입력 검증 | `zod` 4.6.7 |

Harness와 SDK는 같은 명시 버전으로 맞췄습니다. 이 버전 고정은 설치 재현성을 위한 것으로, 문서 편집·OpenRouter·MCP·ARM64 통합 호환성은 2단계에서 확인합니다. 아직 모델 요청을 실행하는 코드는 없으며 모든 LLM 호출에 `deepseek/deepseek-v4.1-flash-1017`을 적용하는 정책도 구현 대상입니다.

[pnpm-workspace.yaml](pnpm-workspace.yaml)에는 필요한 설치 스크립트 허용 목록과 의존성 호환 버전을 기록했습니다. OpenTelemetry API는 Harness와 관련 패키지의 공통 범위인 `1.9.1`을 사용하고, UI 내부의 Runed `0.35.1`·`0.37.1` 참조는 SvelteKit 3를 지원하는 `0.38.0`으로 맞췄습니다. `pnpm peers check`에서 충돌이 없음을 확인했습니다.

shadcn-svelte 설정은 [components.json](components.json), 테마는 [src/app.css](src/app.css), 설치된 63개 UI 묶음은 [src/lib/components/ui/](src/lib/components/ui/)에 있습니다. 전체 설치에 사용한 명령은 다음과 같습니다.

```sh
pnpm exec shadcn-svelte add --all
```

아이콘은 `@lucide/svelte`에서 가져옵니다. SvelteKit 3의 `#lib` 경로 별칭을 사용하며 웹과 Worker 설정은 [vite.config.ts](vite.config.ts), [vite.worker.config.ts](vite.worker.config.ts)에 있습니다.

## 소스 관리

기본 Git 브랜치는 `main`을 사용합니다. `.gitignore`에는 환경 변수, 실행 데이터, 백업, 로컬 서버 접속 정보와 빌드 결과를 제외하도록 설정했습니다. `.gitattributes`는 텍스트 파일의 LF 줄바꿈과 문서·이미지 파일의 바이너리 처리를 정의합니다.

공개 소스 저장소는 [Longcat2957/hwpx-cowork](https://github.com/Longcat2957/hwpx-cowork)이며, `origin`으로 연결했습니다. `main` 브랜치로 Git 저장소 초기화를 완료하고, 저장소 로컬 줄바꿈·공백 검사 설정을 적용했습니다. 설정 명령은 [Git 설정 문서](docs/git.md)에 있습니다. 웹 서비스의 실제 운영 배포는 구현 10단계에서 진행합니다.

소스 코드의 Git 이력과 서비스 안의 문서 버전은 각각 관리합니다. 서비스 문서의 브랜치·복원점은 SQLite와 문서 파일 저장소로 구현합니다.
