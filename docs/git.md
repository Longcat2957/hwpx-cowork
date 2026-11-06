# Git 설정과 소스 관리

이 문서는 소스 코드와 개발 문서의 Git 관리 규칙을 정리한다. 서비스 내부 HWP/HWPX 문서의 사용자별 브랜치와 세션 복원은 [설계 문서](architecture.md)의 SQLite·파일 저장 구조로 구현한다.

## 현재 상태

`.gitignore`와 `.gitattributes`를 마련했고, `git init -b main`으로 저장소 초기화를 완료했다. 저장소 로컬 설정으로 `core.autocrlf=false`, `core.eol=lf`, `core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,tab-in-indent`를 적용했다. 공개 저장소 [Longcat2957/hwpx-cowork](https://github.com/Longcat2957/hwpx-cowork)를 `origin`으로 연결하고, 소스와 개발 문서를 첫 커밋으로 관리한다.

Git 작성자 이름은 GitHub 프로필의 `Longcat`, 이메일은 GitHub 비공개 주소인 `91525066+Longcat2957@users.noreply.github.com`을 저장소에만 설정했다. 전역 Git 설정은 변경하지 않았다. 다음 명령은 새 작업 경로에 저장소를 처음 만들 때 참고한다.

## 최초 설정

프로젝트 루트에서 `main` 브랜치로 초기화하고, 이 저장소에만 줄바꿈과 공백 검사 설정을 적용한다.

```sh
git init -b main
git config --local core.autocrlf false
git config --local core.eol lf
git config --local core.whitespace blank-at-eol,blank-at-eof,space-before-tab,tab-in-indent
git status --short --branch
```

첫 커밋을 만들 때는 실제 작성자 정보로 아래 이름과 이메일을 바꿔 설정한다. 전역 Git 설정은 변경하지 않는다.

```sh
git config --local user.name "본인 이름"
git config --local user.email "본인 이메일"
git add .
git diff --cached --check
git diff --cached --stat
git commit -m "chore: initialize scaffold and project plans"
```

기존 공개 저장소를 새 작업 경로에 받으려면 다음 명령을 사용한다.

```sh
git clone https://github.com/Longcat2957/hwpx-cowork.git
cd hwpx-cowork
```

## 추적할 파일과 제외할 파일

| 추적 대상 | 내용 |
| --- | --- |
| 소스·설정 | `src/`, 향후 `worker/`, `config/`, 마이그레이션과 실행 스크립트 |
| 의존성 | `package.json`과 생성 후의 `pnpm-lock.yaml` |
| 개발 문서 | `README.md`, `AGENTS.md`, `docs/`, 공통 배포 계획 |
| 예제 설정 | 실제 키가 없는 `.env.example`, 향후 Caddy·systemd 설정 |
| 테스트 자료 | 공유 가능한 `tests/fixtures/`의 HWP·HWPX·이미지 등 |

| 제외 대상 | 이유 |
| --- | --- |
| `.env`, `.env.*` | 실제 API 키와 환경별 비밀 설정. `.env.example`은 추적 |
| `data/`, SQLite 파일과 관련 임시 파일 | 사용자 문서, 첨부, 작업 상태, Harness 실행 기록 |
| `backups/` | 운영 데이터의 백업 |
| `deployment/*.local.md` | 실제 서버 접속 정보 |
| 의존성·빌드·검증 결과 | `node_modules/`, `.svelte-kit/`, `build/`, `dist/`, 테스트 결과·커버리지 |
| 로그·OS 임시 파일 | 실행 중 생성되는 로컬 파일 |

기존 서버 접속 정보는 `deployment/rpi_server.local.md`에 보존했다. 새로 저장소를 받는 환경에서는 필요한 접속 정보를 로컬에 별도로 준비한다.

`.gitattributes`는 텍스트 파일에 LF 줄바꿈을 적용하고 HWP·HWPX·PDF·이미지 같은 파일을 바이너리로 취급한다. 문서 파일 전체를 확장자로 무시하지 않으므로 공유 가능한 테스트 자료를 추적할 수 있다.

## 작업 규칙

- 기본 브랜치는 `main`을 사용한다. 변경 규모에 따라 작업 브랜치를 만들 수 있다.
- 직접 작성하거나 수정하는 코드와 설정은 공백 4개로 들여쓴다. `.editorconfig`를 따르며 포맷터 검사는 구현 1단계에서 연결한다.
- `git diff --check`는 탭·줄 끝 공백 등을 확인하는 보조 검사다. 공백 4개 규칙 전체를 검사하는 포맷터를 대체하지 않는다.
- 변경 내용과 관련 검증 결과를 확인한 후 의미 있는 작업 단위로 커밋한다.
- 환경 변수, 운영 중인 사용자 문서·첨부와 로컬 접속 정보는 커밋에 포함하지 않는다.
- 실제 구현 단계가 완료되면 계획 문서에 결과와 남은 제약을 반영한다.
