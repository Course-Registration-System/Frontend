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

### 백엔드 연결

`/api` 로 시작하는 요청은 `vite.config.ts` 의 프록시 설정으로 백엔드(http://localhost:8080)에 전달됩니다. 화면에 보이는 데이터는 모두 백엔드에서 받아 오므로, 백엔드를 함께 띄워야 로그인과 각 화면이 동작합니다.

요청 경로·메서드·본문은 Backend 컨트롤러와 같고, 응답 타입은 `src/types/index.ts` 에 Backend DTO 이름 그대로 옮겨 두었습니다. 인증은 `Authorization: Bearer <accessToken>` 헤더로 보내고, 로그아웃은 저장한 토큰만 지웁니다. 오류는 ProblemDetail 의 `detail` 을 그대로 보여 줍니다.

학과·강의실은 조회 API 가 없어서 `src/lib/codes.ts` 에 백엔드 시드와 같은 값을 넣어 두었습니다.

업무 규칙(수강신청 검사, 총점·등급 계산, 기간 판단 등)은 백엔드가 처리합니다. 프론트는 서버가 거절하면 서버가 준 메시지를 그대로 보여 줍니다.

연결 확인: 백엔드와 프론트 개발 서버를 켠 뒤 http://localhost:5173/api/health 가 `{"status":"ok", ...}` 를 돌려주면 프록시가 동작하는 것입니다. 프록시 설정을 바꾸면 개발 서버를 다시 켜야 합니다.

### 시연 계정

백엔드 개발 시드 계정을 씁니다. 비밀번호는 모두 `test1234!` 입니다.

| 사용자번호 | 이름 | 역할 |
| --- | --- | --- |
| 90001 | 관리자 | 관리자 |
| 100002 | 이수진 | 교수 (시연 교수, 182번 데이터리터러시) |
| 20260001 | 서준우 | 학생 1학년 (시연 학생) |
| 20230003 | 박도윤 | 휴학생 (정규학기 신청 불가) |
| 2026710001 | 정대원 | 대학원생 조교 (162번·198번) |

앱 시각은 백엔드에서 2026-12-21 10:00(성적 입력 기간)으로 고정돼 있습니다. 장바구니·수강신청 화면은 `PUT /api/dev/clock` 으로 시각을 옮겨서 확인합니다.

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
│  ├─ LandingPage        랜딩 + 로그인 (USR-01)
│  ├─ student/           장바구니·수강신청(검색 탭 포함)·시간표·성적 조회
│  ├─ teaching/          담당 강의 목록, 강의 상세(수강생·계획서·조교·성적 탭), 강의 검색(열람)
│  └─ admin/             대시보드·사용자·학기·과목·강의 개설·수강신청 현황·성적 확정
├─ components   공용 컴포넌트 (레이아웃·사이드바·비밀번호 변경, 시간표 격자, 강의 검색, 모달 등)
├─ auth         로그인 사용자와 현재 기간 전역 상태, 역할별 메인 화면
├─ api          백엔드 호출 함수 (client.ts 공통 요청, index.ts 업무별 함수)
├─ lib          표시 형식, 기간별 버튼 노출
├─ hooks        공용 훅
└─ types        공용 타입
```

## 규칙

팀 규칙은 [Docs/TEAM_RULES.md](https://github.com/Course-Registration-System/Docs/blob/main/TEAM_RULES.md) 를 따릅니다. main 은 PR 로만 병합됩니다.
