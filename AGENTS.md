# 프로젝트 작업 지침

- 직접 작성하거나 수정하는 코드와 설정의 들여쓰기는 반드시 공백 4개를 사용한다. 탭으로 들여쓰지 않는다.
- TypeScript, JavaScript, Svelte, JSON, YAML, SQL과 문서의 코드 예제에도 같은 들여쓰기 규칙을 적용한다.
- 승인된 프로젝트 구조와 요구사항은 `docs/architecture.md`를 기준으로 한다.
- 코드 작성 순서와 단계별 완료 기준은 `docs/implementation-plan.md`를 따른다.
- 레이아웃과 UI를 작성하기 전에 설치된 shadcn-svelte 컴포넌트와 공식 컴포넌트·블록 목록을 반드시 확인한다. 내비게이션 바, 사이드바, 대시보드 같은 큰 화면 구성도 기존 구현이 있는지 먼저 찾는다.
- 요구에 맞는 shadcn-svelte 컴포넌트나 블록이 있으면 이를 재사용·조합한다. 기존 제공 여부를 확인하기 전에 유사 UI를 직접 만들지 않는다. 기존 구성으로 충족할 수 없는 부분만 이유를 설명하고 최소한으로 작성한다.
- AI 실행은 DeepSeek Harness와 OpenRouter를 사용한다. 모든 LLM 호출의 모델은 `deepseek/deepseek-v4.1-flash-1017`로 고정한다.
- 대화 요약을 포함한 보조 LLM 호출에도 같은 모델을 사용하며, 다른 모델로 자동 전환하지 않는다.
- 설계를 변경할 때 `README.md`, `docs/architecture.md`, `docs/implementation-plan.md`의 관련 내용을 함께 갱신하고, 구현 목표와 실제 완료 상태를 구분한다.
- 소스 관리 규칙은 `docs/git.md`를 따른다. 환경 변수, 운영 데이터, 백업, 로컬 서버 접속 정보는 Git 추적 대상에서 제외한다.
- 서비스 내부의 사용자별 문서 브랜치와 세션 버전은 SQLite와 파일 저장소로 관리한다.
