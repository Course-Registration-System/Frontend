import type { Category, Day, GradeStatus, LectureTime, PeriodType, Term } from '../types'

export const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const DAY_LABEL: Record<Day, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
}

/** 1교시 = 09:00 시작, 교시당 50분 수업 (가정) */
export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const periodStart = (p: number) => `${String(8 + p).padStart(2, '0')}:00`
export const periodEnd = (p: number) => `${String(8 + p).padStart(2, '0')}:50`

export const formatTimes = (times: LectureTime[]) =>
  times.map((t) => `${DAY_LABEL[t.day]} ${t.startPeriod}-${t.endPeriod}교시`).join(', ')
export const formatRooms = (times: LectureTime[]) =>
  [...new Set(times.map((t) => t.room))].join(', ')

export const CATEGORIES: Category[] = ['전공필수', '전공선택', '교양필수', '교양선택', '채플']
export const DEPARTMENTS = ['컴퓨터공학과', '경영학과', '교양학부']

const TERM_LABEL: Record<Term, string> = {
  '1': '1학기',
  '2': '2학기',
  SUMMER: '여름학기',
  WINTER: '겨울학기',
}
export const TERMS = Object.keys(TERM_LABEL) as Term[]
export const termLabel = (t: Term) => TERM_LABEL[t]
/** 예: 2026-2 를 '2026년 2학기' 로 */
export const semesterLabel = (id: string) => {
  const [y, t] = id.split('-')
  return `${y}년 ${TERM_LABEL[t as Term] ?? t}`
}

export const PERIOD_LABEL: Record<PeriodType, string> = {
  CART: '장바구니',
  REGISTER: '수강신청',
  ADJUST: '정정',
  GRADE_INPUT: '성적입력',
}

export const GRADE_STATUS_LABEL: Record<GradeStatus, string> = {
  NOT_ENTERED: '미입력',
  IN_PROGRESS: '입력중',
  SUBMITTED: '제출',
  CONFIRMED: '확정',
}

export const ROLE_LABEL = { STUDENT: '학생', PROFESSOR: '교수', ADMIN: '관리자' } as const
