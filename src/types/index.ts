// 백엔드 DTO 를 그대로 옮긴 타입. 필드 이름도 백엔드와 같다.
// 기준: api.md (2026-11-26, 백엔드 main #57 머지 시점)

/* ---------- 공통 enum ---------- */

export type Role = 'STUDENT' | 'PROFESSOR' | 'ADMIN'
export type AcctStat = 'ACTIVE' | 'INACTIVE'
/** 학적상태: 재학·휴학·졸업 */
export type StdStat = 'ATTENDING' | 'ON_LEAVE' | 'GRADUATED'
/** 1학기·여름·2학기·겨울 */
export type SemType = 'FIRST' | 'SUMMER' | 'SECOND' | 'WINTER'
/** 장바구니·수강신청·정정·성적입력 */
export type SchdType = 'CART' | 'ENROLL' | 'ADJUST' | 'GRADE'
export type CmplType =
  | 'MAJOR_BASIC'
  | 'MAJOR_REQ'
  | 'MAJOR_ELEC'
  | 'GEN_REQ'
  | 'GEN_ELEC'
  | 'TEACHING'
  | 'FREE_ELEC'
  | 'CHAPEL'
export type EvalType = 'GRADE' | 'PASS_FAIL'
export type Dow = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type ClsType = 'OFFLINE' | 'ONLINE'
export type LecStat = 'OPEN' | 'CLOSED'
export type GrdStat = 'NOT_ENTERED' | 'ENTERING' | 'SUBMITTED' | 'CONFIRMED'
export type EvalMode = 'RELATIVE' | 'ABSOLUTE' | 'PASS_FAIL'
export type ProcType = 'STUDENT' | 'ADMIN'
/** A+ ~ D- (선수과목 최소취득등급) */
export type MinGrade =
  'A+' | 'A0' | 'A-' | 'B+' | 'B0' | 'B-' | 'C+' | 'C0' | 'C-' | 'D+' | 'D0' | 'D-'

/** 등급 문자열. P/F 과목은 P 또는 F */
export type LetterGrade = MinGrade | 'F' | 'P'

/** 백엔드 ErrorCode enum (74개). ProblemDetail.code 로 온다 */
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_INACTIVE'
  | 'PASSWORD_MISMATCH'
  | 'USER_NOT_FOUND'
  | 'DEPARTMENT_NOT_FOUND'
  | 'DUPLICATE_USER_NO'
  | 'LECTURE_NOT_FOUND'
  | 'COURSE_NOT_FOUND'
  | 'SEMESTER_NOT_FOUND'
  | 'DUPLICATE_SEMESTER'
  | 'SEMESTER_IN_USE'
  | 'SCHEDULE_NOT_FOUND'
  | 'SCHEDULE_OVERLAP'
  | 'SCHEDULE_ORDER'
  | 'SCHEDULE_STARTED'
  | 'GRADES_NOT_CONFIRMED'
  | 'MAX_CREDIT_CLOSED'
  | 'PROFESSOR_NOT_FOUND'
  | 'CLASSROOM_NOT_FOUND'
  | 'DUPLICATE_SECTION'
  | 'LECTURE_OPEN_CLOSED'
  | 'ROOM_TIME_CONFLICT'
  | 'PROFESSOR_TIME_CONFLICT'
  | 'UPDATE_PERIOD_OVER'
  | 'TIME_CHANGE_CLOSED'
  | 'CAPACITY_BELOW_ENROLLED'
  | 'ROOM_REQUIRED'
  | 'LECTURE_CLOSED'
  | 'CLOSE_PERIOD_OVER'
  | 'NO_REGISTRATION_SEMESTER'
  | 'CART_CLOSED'
  | 'STUDENT_STATUS_NOT_ALLOWED'
  | 'GRADUATE_STUDENT_NOT_ALLOWED'
  | 'OTHER_SEMESTER_LECTURE'
  | 'DUPLICATE_CART'
  | 'CART_NOT_FOUND'
  | 'ENROLL_CLOSED'
  | 'ALREADY_ENROLLED_COURSE'
  | 'RETAKE_NOT_ALLOWED'
  | 'RETAKE_LIMIT_EXCEEDED'
  | 'LECTURE_FULL'
  | 'TIME_CONFLICT'
  | 'CREDIT_EXCEEDED'
  | 'PREREQUISITE_NOT_MET'
  | 'ENROLLMENT_NOT_FOUND'
  | 'DUPLICATE_COURSE_CODE'
  | 'INVALID_CHAPEL_COURSE'
  | 'PREREQUISITE_SELF'
  | 'PREREQUISITE_CYCLE'
  | 'COURSE_IN_USE'
  | 'PLAN_PERIOD_CLOSED'
  | 'INVALID_PLAN_FILE'
  | 'PLAN_FILE_TOO_LARGE'
  | 'WEIGHT_SUM_INVALID'
  | 'WEIGHTS_NOT_ALLOWED'
  | 'PLAN_NOT_FOUND'
  | 'ASSISTANT_NOT_GRADUATE'
  | 'ASSISTANT_NOT_ELIGIBLE'
  | 'DUPLICATE_ASSISTANT'
  | 'ASSISTANT_NOT_FOUND'
  | 'ASSISTANT_LECTURE_FINISHED'
  | 'ROSTER_NOT_OPEN'
  | 'GRADE_PERIOD_CLOSED'
  | 'GRADE_CONFIRMED'
  | 'WEIGHTS_NOT_SET'
  | 'NOT_ENROLLED_STUDENT'
  | 'GRADE_ALREADY_SUBMITTED'
  | 'GRADE_INCOMPLETE'
  | 'GRADE_TIE_AT_BOUNDARY'
  | 'GRADE_PERIOD_NOT_OVER'
  | 'GRADE_NOT_SUBMITTED'

/** 오류 응답 (RFC 9457 ProblemDetail + code). 프론트는 code 로 경우를 나눈다 */
export interface ProblemDetail {
  type?: string
  title?: string
  status: number
  detail?: string
  instance?: string
  code?: ErrorCode
}

/* ---------- 인증·사용자 (USR) ---------- */

export interface LoginResponse {
  accessToken: string
  user: MyInfo
}

/** ta 가 true 면 학생 메뉴에 강의 운영 메뉴를 더 보여 준다 */
export interface MyInfo {
  usrNo: string
  usrNm: string
  role: Role
  ta: boolean
}

export interface UserResponse {
  usrNo: string
  usrNm: string
  email: string | null
  role: Role
  acctStat: AcctStat
  deptNo: number
  deptNm: string
  yrLvl: number | null
  stdStat: StdStat | null
  office: string | null
}

/**
 * 계정 등록. usrNo 는 숫자만(학부생 8, 대학원생 10, 교수 6자리), role 은 STUDENT·PROFESSOR 만.
 * yrLvl 은 학생이면 필수, stdStat 은 비우면 ATTENDING, office 는 교수만
 */
export interface UserCreateRequest {
  usrNo: string
  password: string
  usrNm: string
  email?: string | null
  role: Exclude<Role, 'ADMIN'>
  deptNo: number
  yrLvl?: number | null
  stdStat?: StdStat | null
  office?: string | null
}

/** 계정 수정. 학생이면 yrLvl·stdStat 필수, 역할에 맞지 않는 값은 서버가 무시 */
export type UserUpdateRequest = Omit<UserCreateRequest, 'usrNo' | 'password' | 'role'>

/* ---------- 학기·학사일정 (ACA-01) ---------- */

export interface SemesterResponse {
  semNo: number
  yr: number
  semType: SemType
  regular: boolean
  current: boolean
}

export interface SemesterRequest {
  yr: number
  semType: SemType
}

/** tgtYrLvl 이 null 이면 전 학년. 일시는 "2026-12-01T10:00:00" 형식 */
export interface ScheduleResponse {
  schdNo: number
  semNo: number
  schdType: SchdType
  tgtYrLvl: number | null
  startDtm: string
  endDtm: string
}

export type ScheduleRequest = Omit<ScheduleResponse, 'schdNo' | 'semNo'>

export interface MaxCreditItem {
  stdNo: string
  usrNm: string
  yrLvl: number
  stdStat: StdStat
  maxCrdt: number
}

/** graduated: 이번 실행에서 졸업 처리된 학생 수, counts: 최대학점별 학생 수 */
export interface MaxCreditResult {
  semNo: number
  regular: boolean
  graduated: number
  counts: Record<string, number>
}

export interface DashboardResponse {
  semNo: number
  openLectureCount: number
  fullLectures: {
    lecNo: number
    crsNm: string
    sectNo: number
    profNm: string
    cap: number
    enrlCnt: number
  }[]
  unassignedLectureCount: number
  missingPlanLectures: {
    lecNo: number
    crsNm: string
    sectNo: number
    profNo: string
    profNm: string
    profEmail: string | null
    noPlanFile: boolean
    noWeights: boolean
  }[]
}

/* ---------- 과목 (ACA-02) ---------- */

export interface PrerequisiteResponse {
  prereqCrsCd: string
  prereqCrsNm: string
  minReqGrd: MinGrade
}

/** minReqGrd 를 빼면 D- */
export interface PrerequisiteRequest {
  prereqCrsCd: string
  minReqGrd?: MinGrade
}

export interface CourseResponse {
  crsCd: string
  crsNm: string
  deptNo: number
  deptNm: string
  crdt: number
  cmplType: CmplType
  evalType: EvalType
  rcmdYrLvl: number | null
  prerequisites: PrerequisiteResponse[]
}

/** 과목 등록. evalType 을 빼면 등급제(채플이면 P/F), rcmdYrLvl 을 빼면 권장학년 없음 */
export interface CourseCreateRequest {
  crsCd: string
  crsNm: string
  deptNo: number
  crdt: number
  cmplType: CmplType
  evalType?: EvalType
  rcmdYrLvl?: number | null
  prerequisites?: PrerequisiteRequest[]
}

/** 수정(통째 교체). evalType 은 필수, rcmdYrLvl 을 빼면 null 로 지워지므로 현재 값을 채워 보낸다 */
export interface CourseUpdateRequest {
  crsNm: string
  deptNo: number
  crdt: number
  cmplType: CmplType
  evalType: EvalType
  rcmdYrLvl: number | null
}

export interface CourseSearchParams {
  deptNo?: number
  cmplType?: CmplType
  /** 과목명·과목코드 일부 */
  keyword?: string
}

/* ---------- 강의 (ACA-03, REG-01, LEC) ---------- */

/**
 * 강의시간 한 칸(TimeSlotResponse). 시각은 "09:00" 또는 "09:00:00". place 는 강의실명·"온라인"·"미배정".
 * 강의 검색·담당 강의 응답(LectureSearchSlot)에는 roomNm 이 없다
 */
export interface TimeSlot {
  dow: Dow
  startTm: string
  endTm: string
  clsType: ClsType
  roomCd: string | null
  roomNm?: string | null
  place: string
}

export interface TimeSlotRequest {
  dow: Dow
  startTm: string
  endTm: string
  clsType: ClsType
  /** 비우면 강의실 미배정 */
  roomCd: string | null
}

export interface LectureResponse {
  lecNo: number
  crsCd: string
  crsNm: string
  crdt: number
  semNo: number
  profNo: string
  profNm: string
  sectNo: number
  cap: number
  enrlCnt: number
  lecStat: LecStat
  engLec: boolean
  relGrdExmp: boolean
  timeSlots: TimeSlot[]
}

export interface LectureCreateRequest {
  crsCd: string
  semNo: number
  profNo: string
  sectNo: number
  cap: number
  engLec: boolean
  relGrdExmp: boolean
  timeSlots: TimeSlotRequest[]
}

export type LectureUpdateRequest = Omit<LectureCreateRequest, 'crsCd' | 'semNo' | 'sectNo'>

/** REG-01 검색 결과 한 줄. planFile 이 있으면 계획서가 등록된 강의 */
export interface LectureSearchItem {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  crdt: number
  cmplType: CmplType
  evalType: EvalType
  rcmdYrLvl: number | null
  profNm: string
  engLec: boolean
  cap: number
  enrlCnt: number
  remaining: number
  full: boolean
  planFile: string | null
  timeSlots: TimeSlot[]
}

export interface LectureSearchResponse {
  semNo: number
  page: number
  size: number
  total: number
  items: LectureSearchItem[]
}

export interface LectureSearchParams {
  semNo?: number
  deptNo?: number
  yrLvl?: number
  cmplType?: CmplType
  crsNm?: string
  profNm?: string
  page?: number
  size?: number
}

export interface TeachingLectureItem {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  cap: number
  enrlCnt: number
  lecStat: LecStat
  timeSlots: TimeSlot[]
}

export interface TeachingLectureListResponse {
  semNo: number
  yr: number
  semType: SemType
  lectures: TeachingLectureItem[]
}

/** LEC-02 수강생, LEC-04 조교 한 명 */
export interface TeachingStudent {
  stdNo: string
  usrNm: string
  deptNm: string
  yrLvl: number
  email: string | null
}

export interface TeachingStudentListResponse {
  lecNo: number
  students: TeachingStudent[]
}

export interface TeachingAssistantListResponse {
  lecNo: number
  assistants: TeachingStudent[]
}

export interface PlanWeights {
  midWt: number
  finWt: number
  hwWt: number
  attWt: number
}

/** LEC-03. deadline 은 등록·수정 마감(장바구니 시작), editable 은 지금 고칠 수 있는지 */
export interface LecturePlanResponse {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  evalType: EvalType
  hasPlanFile: boolean
  weights: PlanWeights | null
  deadline: string | null
  editable: boolean
}

/* ---------- 장바구니·수강신청 (REG) ---------- */

export interface CartItem {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  crdt: number
  cmplType: CmplType
  profNm: string
  cap: number
  enrlCnt: number
  /** 이 강의를 장바구니에 담은 학생 수 */
  cartCnt: number
  timeSlots: TimeSlot[]
}

/** cartCredits: 담은 학점(채플 제외), maxCredit: 수강 가능 학점 */
export interface CartResponse {
  semNo: number
  items: CartItem[]
  cartCredits: number
  maxCredit: number
}

export interface EnrollmentResponse {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  crdt: number
  cmplType: CmplType
  profNm: string
  retake: boolean
  enrlDtm: string
  timeSlots: TimeSlot[]
}

export interface TimetableResponse {
  semNo: number
  lectures: EnrollmentResponse[]
  totalCredits: number
}

export interface EnrolledStudent {
  stdNo: string
  stdNm: string
  yrLvl: number
  retake: boolean
  procType: ProcType
  enrlDtm: string
}

export interface EnrollmentStatusResponse {
  lecNo: number
  cap: number
  enrlCnt: number
  remaining: number
  students: EnrolledStudent[]
}

/* ---------- 성적 (GRD) ---------- */

/** 상대평가 구역. A 구역 상한, A+B 구역 상한(교직이면 null). 인원은 소수점 아래 버림 */
export interface GradeBands {
  enrolled: number
  aLimit: number
  abLimit: number | null
}

export interface GradeSheetStudent {
  stdNo: string
  usrNm: string
  retake: boolean
  /** 원점수 0~100 (소수 셋째 자리까지). P/F 과목은 null */
  midScr: number | null
  finScr: number | null
  hwScr: number | null
  attScr: number | null
  /** 원점수 총점 (네 항목이 다 있을 때, 버림) */
  totScr: number | null
  /** 최종점수 */
  fnlScr: number | null
  ltrGrd: LetterGrade | null
  /** 평점 (등급제만) */
  grdPt: number | null
  /** 등급제는 네 항목 모두, P/F 는 P·F 가 들어갔는지 */
  entered: boolean
}

/** GRD-01. editable: 지금 저장·제출할 수 있는지(성적 입력 기간 안, 확정 전, 폐강 아님) */
export interface GradeSheetResponse {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  grdStat: GrdStat
  editable: boolean
  evalMode: EvalMode
  /** 등록 전이면 null (P/F 과목은 비율을 쓰지 않음) */
  weights: PlanWeights | null
  /** 상대평가가 아니면 null */
  bands: GradeBands | null
  students: GradeSheetStudent[]
}

/**
 * 저장할 학생 한 명. 넣은 값으로 그 학생 값을 통째로 바꾸고 null 은 비움.
 * 등급제는 네 원점수만, P/F 과목은 ltrGrd(P·F)만 보낸다
 */
export interface GradeInput {
  stdNo: string
  midScr?: number | null
  finScr?: number | null
  hwScr?: number | null
  attScr?: number | null
  ltrGrd?: 'P' | 'F' | null
}

export interface GradeRow {
  lecNo: number
  crsCd: string
  crsNm: string
  crdt: number
  cmplType: CmplType
  evalType: EvalType
  ltrGrd: LetterGrade
  /** 등급제만, P/F 는 null */
  gradePoint: number | null
  retake: boolean
  /** 누적 평점·학점에 들어가는지 (재수강 전 성적이면 false) */
  counted: boolean
}

export interface SemesterGrades {
  semNo: number
  yr: number
  semType: SemType
  grades: GradeRow[]
  gpa: number | null
}

export interface GradeReportResponse {
  semesters: SemesterGrades[]
  cumulativeGpa: number | null
  earnedCredits: number
}

export interface GradeStatusLecture {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  profNo: string
  profNm: string
  profEmail: string | null
  enrlCnt: number
  grdStat: GrdStat
  cnfmDtm: string | null
}

/**
 * GRD-02. gradeEnd 부터 확정 가능.
 * counts 는 grdStat 필터와 상관없이 학기 전체(폐강 제외)의 상태별 강의 수이고 네 상태가 항상 있다
 */
export interface GradeStatusResponse {
  semNo: number
  yr: number
  semType: SemType
  gradeEnd: string | null
  confirmable: boolean
  counts: Record<GrdStat, number>
  lectures: GradeStatusLecture[]
}

/** 확정 결과. 요청 순서와 상관없이 강의번호 순 */
export interface GradeConfirmResponse {
  confirmed: { lecNo: number; crsNm: string; grdStat: GrdStat; cnfmDtm: string }[]
}

/* ---------- 시스템·시연용 ---------- */

/** time 은 앱의 현재 시각(시연용으로 고정했으면 그 시각) */
export interface HealthResponse {
  status: string
  time: string
}

export type DemoScenario = 's1_grade_close' | 's2_enroll_day' | 's3_adjust'

/* ---------- 화면용 ---------- */

/** 학생 화면의 지금 기간. 신청 대상 학기의 학사일정과 서버 시각으로 정한다 */
export interface CurrentPeriod {
  semNo: number
  type: 'CART' | 'ENROLL' | 'ADJUST' | null
  startDtm?: string
  endDtm?: string
}
