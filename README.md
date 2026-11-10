# Frontend

수강신청 및 성적 관리 시스템 Frontend

## 기술 스택

| 구분 | 내용 |
| --- | --- |
| 언어 | TypeScript |
| 프레임워크 | React 19 |
| 빌드/개발 서버 | Vite 8 |
| 린트 | oxlint |

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

`/api` 로 시작하는 요청은 `vite.config.ts` 의 프록시 설정으로 백엔드(http://localhost:8080)에 전달됩니다. 백엔드를 먼저 띄워 두면 첫 화면에서 연결 상태를 확인할 수 있습니다.

## 그 외 명령

```bash
npm run build     # 프로덕션 빌드 (dist/)
npm run lint      # 린트
npm run preview   # 빌드 결과 미리보기
```

## 폴더 구조 (예정)

```
src
├─ pages        화면 단위 (로그인, 강의 검색, 수강신청, 시간표, 성적, 교수, 관리자)
├─ components   공용 컴포넌트
├─ api          백엔드 호출 함수
└─ types        공용 타입
```

## 규칙

팀 규칙은 [Docs/TEAM_RULES.md](https://github.com/Course-Registration-System/Docs/blob/main/TEAM_RULES.md) 를 따릅니다. main 은 PR 로만 병합됩니다.
