// 화면 표시용 라벨과 형식. 업무 규칙 계산은 하지 않는다.
import type {
  ClsType,
  CmplType,
  Dow,
  EvalMode,
  EvalType,
  GrdStat,
  MinGrade,
  ProcType,
  Role,
  SchdType,
  SemType,
  StdStat,
  TimeSlot,
} from '../types'

export const DOWS: Dow[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
export const DOW_LABEL: Record<Dow, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
}

export const CLS_TYPE_LABEL: Record<ClsType, string> = { OFFLINE: '대면', ONLINE: '온라인' }

/** "09:00:00" → "09:00" */
export const hm = (t: string) => t.slice(0, 5)

/** 강의시간 칸 하나의 장소 (강의실명·온라인·미배정) */
export const placeOf = (s: TimeSlot) =>
  s.place ?? s.roomNm ?? (s.clsType === 'ONLINE' ? '온라인' : '미배정')

export const formatSlots = (slots: TimeSlot[]) =>
  slots.map((s) => `${DOW_LABEL[s.dow]} ${hm(s.startTm)}-${hm(s.endTm)}`).join(', ') || '-'
export const formatPlaces = (slots: TimeSlot[]) =>
  [...new Set(slots.map(placeOf))].join(', ') || '-'

export const CMPL_TYPE_LABEL: Record<CmplType, string> = {
  MAJOR_BASIC: '전공기초',
  MAJOR_REQ: '전공필수',
  MAJOR_ELEC: '전공선택',
  GEN_REQ: '교양필수',
  GEN_ELEC: '교양선택',
  TEACHING: '교직',
  FREE_ELEC: '일반선택',
  CHAPEL: '채플',
}
export const CMPL_TYPES = Object.keys(CMPL_TYPE_LABEL) as CmplType[]
export const cmplLabel = (c: string) => CMPL_TYPE_LABEL[c as CmplType] ?? c

export const EVAL_TYPE_LABEL: Record<EvalType, string> = { GRADE: '등급제', PASS_FAIL: 'P/F' }
export const EVAL_MODE_LABEL: Record<EvalMode, string> = {
  RELATIVE: '상대평가',
  ABSOLUTE: '절대평가',
  PASS_FAIL: 'P/F',
}

/** 선수과목 최소취득등급 (F 제외) */
export const MIN_GRADES: MinGrade[] = [
  'A+',
  'A0',
  'A-',
  'B+',
  'B0',
  'B-',
  'C+',
  'C0',
  'C-',
  'D+',
  'D0',
  'D-',
]

export const YR_LVLS = [1, 2, 3, 4]

export const SEM_TYPE_LABEL: Record<SemType, string> = {
  FIRST: '1학기',
  SUMMER: '여름학기',
  SECOND: '2학기',
  WINTER: '겨울학기',
}
export const SEM_TYPES = Object.keys(SEM_TYPE_LABEL) as SemType[]
export const semLabel = (s: { yr: number; semType: SemType }) =>
  `${s.yr}년 ${SEM_TYPE_LABEL[s.semType]}`

export const SCHD_TYPE_LABEL: Record<SchdType, string> = {
  CART: '장바구니',
  ENROLL: '수강신청',
  ADJUST: '정정',
  GRADE: '성적입력',
}
export const SCHD_TYPES = Object.keys(SCHD_TYPE_LABEL) as SchdType[]

export const GRD_STAT_LABEL: Record<GrdStat, string> = {
  NOT_ENTERED: '미입력',
  ENTERING: '입력중',
  SUBMITTED: '제출',
  CONFIRMED: '확정',
}

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: '학생',
  PROFESSOR: '교수',
  ADMIN: '관리자',
}

export const STD_STAT_LABEL: Record<StdStat, string> = {
  ATTENDING: '재학',
  ON_LEAVE: '휴학',
  GRADUATED: '졸업',
}

export const PROC_TYPE_LABEL: Record<ProcType, string> = { STUDENT: '학생', ADMIN: '관리자' }

const pad = (n: number) => String(n).padStart(2, '0')

/** 일시를 'YYYY-MM-DD HH:mm' 로 */
export const formatDateTime = (iso?: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local 값("2026-12-01T10:00") → 백엔드 LocalDateTime("2026-12-01T10:00:00") */
export const toLocalDateTime = (v: string) => (v.length === 16 ? `${v}:00` : v)

export const formatGpa = (n: number | null | undefined) => (n == null ? '-' : Number(n).toFixed(2))
