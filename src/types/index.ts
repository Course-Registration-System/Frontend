// 공용 도메인 타입. 백엔드 응답 형태가 확정되면 여기를 맞춘다.

export type Role = 'STUDENT' | 'PROFESSOR' | 'ADMIN'

export interface User {
  userNo: string
  name: string
  role: Role
  active: boolean
  deptName?: string
  /** 학생 학년 */
  grade?: number
  email?: string
  /** 학생 중 배정된 강의가 있는 조교 */
  isAssistant?: boolean
}

export interface UserForm {
  userNo: string
  name: string
  role: Role
  password?: string
  deptName?: string
  grade?: number
  email?: string
}

export type Term = '1' | '2' | 'SUMMER' | 'WINTER'

export interface Semester {
  id: string
  year: number
  term: Term
  current: boolean
}

export type PeriodType = 'CART' | 'REGISTER' | 'ADJUST' | 'GRADE_INPUT'

export interface Schedule {
  type: PeriodType
  startDate: string
  endDate: string
  targetGrades: number[]
}

/** 로그인한 학생 학년 기준의 현재 수강신청 기간 */
export interface CurrentPeriod {
  semesterId: string
  type: 'CART' | 'REGISTER' | 'ADJUST' | null
  startDate?: string
  endDate?: string
  today: string
}

export type Category = '전공필수' | '전공선택' | '교양필수' | '교양선택' | '채플'
export type GradingType = 'GRADE' | 'PF'
export type LetterGrade = 'A+' | 'A0' | 'B+' | 'B0' | 'C+' | 'C0' | 'D+' | 'D0' | 'F' | 'P'

export interface Prerequisite {
  courseCode: string
  courseName?: string
  minGrade: LetterGrade
}

export interface Course {
  code: string
  name: string
  credits: number
  category: Category
  deptName: string
  /** 권장 학년 */
  targetGrade: number
  gradingType: GradingType
  prerequisites: Prerequisite[]
}

export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'

export interface LectureTime {
  day: Day
  startPeriod: number
  endPeriod: number
  room: string
}

export type LectureStatus = 'OPEN' | 'CLOSED'
export type GradeStatus = 'NOT_ENTERED' | 'IN_PROGRESS' | 'SUBMITTED' | 'CONFIRMED'

export interface Ratios {
  midterm: number
  final: number
  assignment: number
  attendance: number
}

export interface Lecture {
  lecNo: number
  semesterId: string
  courseCode: string
  courseName: string
  section: string
  credits: number
  category: Category
  deptName: string
  targetGrade: number
  gradingType: GradingType
  professorNo: string
  professorName: string
  capacity: number
  enrolledCount: number
  times: LectureTime[]
  isEnglish: boolean
  excludeRelative: boolean
  status: LectureStatus
  gradeStatus: GradeStatus
  syllabusUrl: string | null
}

export interface LectureForm {
  semesterId: string
  courseCode: string
  section: string
  professorNo: string
  capacity: number
  isEnglish: boolean
  excludeRelative: boolean
  times: LectureTime[]
}

export interface LectureSearchParams {
  semesterId?: string
  deptName?: string
  targetGrade?: string
  category?: string
  courseName?: string
  professorName?: string
}

export interface Enrollment {
  enrollmentId: number
  lecture: Lecture
  isRetake: boolean
}

export interface Scores {
  midterm: number | null
  final: number | null
  assignment: number | null
  attendance: number | null
}

export interface GradeRow {
  enrollmentId: number
  studentNo: string
  name: string
  deptName: string
  grade: number
  scores: Scores
  pf: 'P' | 'F' | null
}

export interface GradeSheet {
  lecNo: number
  gradingType: GradingType
  ratios: Ratios | null
  excludeRelative: boolean
  gradeStatus: GradeStatus
  editable: boolean
  /** 입력 불가 사유 */
  lockedReason?: string
  rows: GradeRow[]
}

export interface TeachingLectureDetail {
  lecture: Lecture
  myRole: 'PROFESSOR' | 'ASSISTANT'
  ratios: Ratios | null
  studentsViewable: boolean
}

export interface RosterStudent {
  studentNo: string
  name: string
  deptName: string
  grade: number
  email: string
}

export interface TranscriptRow {
  courseCode: string
  courseName: string
  credits: number
  gradingType: GradingType
  letter: LetterGrade
  point: number | null
  isRetake: boolean
}

export interface Transcript {
  semesterId: string
  rows: TranscriptRow[]
  semesterGpa: number | null
  semesterCredits: number
  cumulativeGpa: number | null
  cumulativeCredits: number
}

export interface Dashboard {
  openLectureCount: number
  closedLectureCount: number
  totalEnrollments: number
  fullLectures: Lecture[]
}

export interface MaxCreditRow {
  studentNo: string
  name: string
  grade: number
  prevGpa: number | null
  maxCredits: number
}

export interface AdminEnrollmentStatus {
  lecture: Lecture
  editable: boolean
  students: (RosterStudent & { enrollmentId: number; isRetake: boolean })[]
}
