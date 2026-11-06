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

승인된 스캐폴드와 세부 구현 계획을 문서화했습니다. 현재 코드는 SvelteKit 3, Svelte 5, TypeScript, Tailwind CSS 4, shadcn-svelte 기반의 빈 프로젝트이며 기본 경로(`/`)는 빈 페이지입니다. 위 기능은 구현할 목표입니다.

구현은 실행 기반 → rhwp·Harness·OpenRouter 실제 연동 검증 → DB·파일·버전 → 인증 → 직접 편집 → AI 대화 편집 → 버전 트리·비교·복원 → 새 문서·선택 영역·참고 자료 → 모바일 → 운영·백업 순서로 진행합니다.

핵심 연동 단계에서는 HWP와 HWPX를 각각 열고 수정하고 저장한 뒤 다시 열어 본문·표·그림·서식을 확인합니다. 로컬에서 확인한 rhwp MCP 조작 경험을 바탕으로, 서비스의 전체 연결과 라즈베리파이 ARM64 실행을 별도로 검증합니다.

## 개발 문서

- [승인된 프로젝트 스캐폴드와 설계](docs/architecture.md)
- [세부 코드 작성 계획](docs/implementation-plan.md)
- [라즈베리파이 운영 계획](deployment/rpi_server.md)
- [Git 설정과 소스 관리](docs/git.md)

직접 작성하거나 수정하는 코드와 설정의 들여쓰기는 반드시 공백 4개를 사용합니다. 작업 지침은 [AGENTS.md](AGENTS.md), 편집기 설정은 [.editorconfig](.editorconfig)에 있습니다.

## 실행

Node.js 22.17 이상과 pnpm이 필요합니다.

```sh
pnpm install
pnpm dev
```

## 검증 및 빌드

```sh
pnpm check
pnpm build
pnpm preview
```

## UI 컴포넌트 추가

shadcn-svelte 설정은 `components.json`, 테마는 `src/app.css`에 있습니다.
컴포넌트는 필요할 때 추가합니다.

```sh
pnpm exec shadcn-svelte add button
```

SvelteKit 3의 `#lib` 경로 별칭을 사용하며 설정은 `vite.config.ts`에 있습니다.
배포 어댑터는 기본 `adapter-auto`로 구성되어 있습니다.

## 소스 관리

기본 Git 브랜치는 `main`을 사용합니다. `.gitignore`에는 환경 변수, 실행 데이터, 백업, 로컬 서버 접속 정보와 빌드 결과를 제외하도록 설정했습니다. `.gitattributes`는 텍스트 파일의 LF 줄바꿈과 문서·이미지 파일의 바이너리 처리를 정의합니다.

공개 소스 저장소는 [Longcat2957/hwpx-cowork](https://github.com/Longcat2957/hwpx-cowork)이며, `origin`으로 연결했습니다. `main` 브랜치로 Git 저장소 초기화를 완료하고, 저장소 로컬 줄바꿈·공백 검사 설정을 적용했습니다. 설정 명령은 [Git 설정 문서](docs/git.md)에 있습니다. 웹 서비스의 실제 운영 배포는 구현 10단계에서 진행합니다.

소스 코드의 Git 이력과 서비스 안의 문서 버전은 각각 관리합니다. 서비스 문서의 브랜치·복원점은 SQLite와 문서 파일 저장소로 구현합니다.
