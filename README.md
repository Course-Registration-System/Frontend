# Frontend

수강신청 및 성적 관리 시스템 Frontend

## 기술 스택

| 구분 | 내용 |
| --- | --- |
| 언어 | TypeScript |
| 프레임워크 | React 19 |
| 빌드/개발 서버 | Vite 8 |
| 린트 | oxlint |
| 포맷터 | Prettier |

## 실행 방법

1. Node.js 22 이상 설치 (`node -v` 로 확인)
2. 의존성 설치
   ```bash
   npm install
   ```
3. 개발 서버 실행
   ```bash
   npm run dev
   ```
4. http://localhost:5173 접속

### 목 서버 모드 (기본)

백엔드 없이도 화면이 동작하도록 `src/mock` 의 인메모리 서버가 `/api` 요청을 대신 처리합니다. 업무 규칙(수강신청 검사 7종, 기간별 버튼 상태, 성적상태 전이)을 단위업무기술서 기준으로 흉내 냅니다. 데이터는 브라우저 localStorage 에 저장됩니다.

- 데모 계정 (비밀번호 모두 `1234`): 학생·조교 `20230001`, 1학년 학생 `20250004`, 교수 `P1001`, 관리자 `A0001`, 비활성 `20190099`
- 화면 맨 위 어두운 바에서 "오늘 날짜"를 바꾸면 장바구니·수강신청·정정·성적입력 기간을 바로 오갈 수 있습니다. "데이터 초기화"로 처음 상태로 되돌립니다.

### 실제 백엔드 연결

프로젝트 루트에 `.env.local` 을 만들고 아래처럼 적은 뒤 개발 서버를 다시 띄웁니다.

```
VITE_USE_MOCK=false
```

`/api` 로 시작하는 요청은 `vite.config.ts` 의 프록시 설정으로 백엔드(http://localhost:8080)에 전달됩니다. 요청 경로와 응답 형태는 `src/api/index.ts` 와 `src/types/index.ts` 에 모여 있으니, 백엔드 명세가 정해지면 이 두 파일을 맞추면 됩니다. 인증은 `Authorization: Bearer <token>` 헤더로 보냅니다.

## 그 외 명령

```bash
npm run build     # 프로덕션 빌드 (dist/)
npm run lint      # 린트
npm run format    # 코드 포맷 (Prettier). PR 올리기 전에 한 번
npm run preview   # 빌드 결과 미리보기
```

CI 에서 `npm run format:check` 가 돌아 포맷이 어긋나면 실패합니다. VS Code 는 Prettier 확장을 설치하고 "Format on Save" 를 켜면 저장할 때 자동 적용됩니다.

## 폴더 구조

```
src
├─ pages
│  ├─ LoginPage          로그인 (USR-01)
│  ├─ student/           시간표·강의 검색·장바구니·수강신청 내역·성적 조회
│  ├─ teaching/          담당 강의 목록, 강의 상세(수강생·계획서·조교·성적 탭), 강의 검색(열람)
│  └─ admin/             대시보드·사용자·학기·과목·강의 개설·수강신청 현황·성적 확정
├─ components   공용 컴포넌트 (레이아웃·사이드바, 시간표 격자, 강의 검색, 모달 등)
├─ auth         로그인 사용자와 현재 기간 전역 상태
├─ api          백엔드 호출 함수 (client.ts 공통 요청, index.ts 업무별 함수)
├─ mock         목 서버와 시드 데이터 (백엔드 연동 후 삭제 가능)
├─ lib          표시 형식, 성적 계산, 기간별 버튼 상태
├─ hooks        공용 훅
└─ types        공용 타입
```

화면 목록과 경로는 「프론트엔드 화면 목록·화면 흐름도」 문서를 따릅니다. 문서에 근거가 없어 임의로 정한 값(교시 시간, 등급 구간, 상대평가 비율, 재수강 기준, 최대학점 산정 기준)은 `src/lib/grades.ts`, `src/lib/format.ts`, `src/mock/server.ts` 에 `가정` 주석으로 표시해 두었습니다.

## 규칙

팀 규칙은 [Docs/TEAM_RULES.md](https://github.com/Course-Registration-System/Docs/blob/main/TEAM_RULES.md) 를 따릅니다. main 은 PR 로만 병합됩니다.
