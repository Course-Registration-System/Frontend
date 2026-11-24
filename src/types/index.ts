// 백엔드 DTO 를 그대로 옮긴 타입. 필드 이름도 백엔드와 같다.
// 기준: Backend main + PR #41(조교) #45(수강생) #46(성적 입력) #47(계획서), feat/grade-confirm(성적 확정)

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

/** 오류 응답 (Spring ProblemDetail + code) */
export interface ProblemDetail {
  status: number
  detail?: string
  code?: string
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

export interface UserCreateRequest {
  usrNo: string
  password: string
  usrNm: string
  email: string | null
  role: Role
  deptNo: number
  yrLvl: number | null
  stdStat: StdStat | null
  office: string | null
}

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

export interface PrerequisiteRequest {
  prereqCrsCd: string
  minReqGrd: MinGrade
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

export interface CourseCreateRequest {
  crsCd: string
  crsNm: string
  deptNo: number
  crdt: number
  cmplType: CmplType
  evalType: EvalType
  rcmdYrLvl: number | null
  prerequisites: PrerequisiteRequest[]
}

export type CourseUpdateRequest = Omit<CourseCreateRequest, 'crsCd' | 'prerequisites'>

/* ---------- 강의 (ACA-03, REG-01, LEC) ---------- */

/** 강의시간 한 칸. 시각은 "09:00" 또는 "09:00:00". place 는 강의실명·"온라인"·"미배정" */
export interface TimeSlot {
  dow: Dow
  startTm: string
  endTm: string
  clsType: ClsType
  roomCd: string | null
  roomNm?: string | null
  /** main 의 강의 관리 응답에는 아직 없을 수 있다 */
  place?: string
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

export interface GradeCounts {
  enrolled: number
  aCnt: number | null
  abCnt: number | null
  aLimit: number
  abLimit: number | null
}

export interface GradeSheetStudent {
  stdNo: string
  usrNm: string
  retake: boolean
  midScr: number | null
  finScr: number | null
  hwScr: number | null
  attScr: number | null
  /** 원점수 총점 (서버 계산) */
  rawTotal: number | null
  group: 'A' | 'B' | 'OTHER' | null
  /** 최종점수 (서버 계산) */
  totScr: number | null
  ltrGrd: string | null
  grdPt: number | null
  entered: boolean
}

/** GRD-01. editable: 지금 저장·제출할 수 있는지, tieAtBoundary: 경계 동점자가 있어 제출 불가 */
export interface GradeSheetResponse {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  grdStat: GrdStat
  editable: boolean
  evalMode: EvalMode
  weights: PlanWeights | null
  counts: GradeCounts | null
  tieAtBoundary: boolean
  students: GradeSheetStudent[]
}

export interface GradeInput {
  stdNo: string
  midScr: number | null
  finScr: number | null
  hwScr: number | null
  attScr: number | null
}

export interface GradeRow {
  lecNo: number
  crsCd: string
  crsNm: string
  crdt: number
  cmplType: CmplType
  evalType: EvalType
  ltrGrd: string
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

/** GRD-02. gradeEnd 부터 확정 가능, counts 는 성적상태별 강의 수 */
export interface GradeStatusResponse {
  semNo: number
  yr: number
  semType: SemType
  gradeEnd: string | null
  confirmable: boolean
  counts: Partial<Record<GrdStat, number>>
  lectures: GradeStatusLecture[]
}

/* ---------- 화면용 ---------- */

/** 학생 화면의 지금 기간. 신청 대상 학기의 학사일정과 서버 시각으로 정한다 */
export interface CurrentPeriod {
  semNo: number
  type: 'CART' | 'ENROLL' | 'ADJUST' | null
  startDtm?: string
  endDtm?: string
}
