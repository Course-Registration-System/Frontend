# Frontend

수강신청 및 성적 관리 시스템 Frontend

## 기술 스택

| 구분 | 내용 |
| --- | --- |
| 언어 | TypeScript 7 |
| 프레임워크 | React 19, React Router 7 |
| 빌드/개발 서버 | Vite 8 |
| 린트·포맷 | oxlint, Prettier |
| 배포 | Vercel  |

## 실행 방법

1. 백엔드 상태 확인: 아래 주소가 `{"status":"ok", ...}` 를 돌려주면 서버가 켜져 있습니다.
   ```bash
   curl http://54.153.191.79:8080/api/health
   ```
2. https://frontend-pied-omega-23.vercel.app 접속
3. 아래 시연 계정으로 로그인


## 시연 계정

비밀번호는 모두 `test1234!` 입니다. 

| 로그인 ID | 이름 | 역할 |
| --- | --- | --- |
| `90001` | 관리자 | 관리자 |
| `100002` | 이수진 | 교수 |
| `20260001` | 서준우 | 학생 1학년 |
| `20230003` | 박도윤 | 학생 4학년, 휴학 (계절학기만 신청 가능) |
| `2026710001` | 정대원 | 대학원생 조교 |

앱 시각은 2026-12-21 10:00 으로 고정돼 있습니다. 해당시기는 성적 입력 기간 및 2026 겨울학기 정정 기간입니다.

## 폴더 구조

```
src
├─ pages
│  ├─ LandingPage      로그인(공통)
│  ├─ student/         학생용:수강신청(검색·장바구니·신청 목록), 시간표, 성적 조회
│  ├─ teaching/        교수용: 담당 강의 목록, 강의 상세(수강생·계획서·조교·성적 탭)
│  └─ admin/           관리자용: 대시보드, 사용자, 학기·학사일정, 과목, 강의 개설, 수강신청 현황, 성적 확정
├─ components          레이아웃(상단 바·메뉴), 공용 UI
├─ auth                로그인 사용자·현재 기간 상태 관리
├─ api                 업무별 API 함수
├─ lib                 표시 형식, 기간 계산, 학과·강의실 코드
├─ hooks               useAsync (조회 공통 훅)
└─ types               백엔드 DTO 타입
```

## 규칙

팀 규칙은 [Docs/TEAM_RULES.md](https://github.com/Course-Registration-System/Docs/blob/main/TEAM_RULES.md) 를 따릅니다. main 은 PR 로만 병합됩니다.
