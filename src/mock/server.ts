// 목 서버: request() 가 보낸 메서드·경로를 받아 백엔드처럼 응답한다.
// 업무 규칙(검사 7종, 기간 판정, 성적 상태 전이)을 단위업무기술서 기준으로 흉내 낸다.
import { ApiError } from '../api/client'
import {
  gradeAtLeast,
  letterOf,
  pointOf,
  relativeRatio,
  sumRatios,
  totalScore,
} from '../lib/grades'
import { DAY_LABEL, semesterLabel } from '../lib/format'
import type {
  Course,
  GradeRow,
  GradeSheet,
  Lecture,
  LectureForm,
  LetterGrade,
  MaxCreditRow,
  Ratios,
  RosterStudent,
  Schedule,
  Semester,
  Term,
  Transcript,
  User,
  UserForm,
} from '../types'
import { createSeed, DB_VERSION, SAMPLE_PDF, type Db, type DbLecture, type DbUser } from './db'

const STORAGE_KEY = 'crs.mockdb'

// 모듈 끝에서 초기화한다 (아래 상수들이 먼저 선언되어야 함)
let db: Db

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.version === DB_VERSION) {
        // 새로고침하면 blob URL 은 사라지므로 샘플 PDF 로 대체한다
        for (const l of parsed.lectures)
          if (l.syllabusUrl?.startsWith('blob:')) l.syllabusUrl = SAMPLE_PDF
        return parsed
      }
    }
  } catch {
    /* 저장소 사용 불가 */
  }
  const seed = createSeed()
  seed.maxCredits['2026-2'] = computeMaxCredits(seed, '2026-2')
  return seed
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* 저장소 사용 불가 */
  }
}

// ---- 데모 제어 (화면 상단 데모 바에서 사용) ----
export const mockControl = {
  today: () => db.today,
  setToday: (d: string) => {
    db.today = d
    save()
  },
  schedules: () => db.schedules[currentSemester().id] ?? [],
  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* 무시 */
    }
    db = load()
  },
}

// ---- 공통 헬퍼 ----
const fail = (status: number, message: string): never => {
  throw new ApiError(status, message)
}
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

const currentSemester = () => db.semesters.find((s) => s.current) ?? db.semesters[0]
const TERM_ORDER: Record<Term, number> = { '1': 1, SUMMER: 2, '2': 3, WINTER: 4 }
const semOrder = (id: string) => {
  const s = db.semesters.find((x) => x.id === id)
  if (!s) return 0
  return s.year * 10 + TERM_ORDER[s.term]
}

const userOf = (no: string) => db.users.find((u) => u.userNo === no)
const courseOf = (code: string) =>
  db.courses.find((c) => c.code === code) ?? fail(404, '과목을 찾을 수 없습니다.')
const lectureOf = (lecNo: number) =>
  db.lectures.find((l) => l.lecNo === lecNo) ?? fail(404, '강의를 찾을 수 없습니다.')

const enrolledIn = (lecNo: number) =>
  db.enrollments.filter((e) => e.lecNo === lecNo && e.status === 'ENROLLED')

function publicUser(u: DbUser): User {
  const { password: _pw, ...rest } = u
  void _pw
  const cur = currentSemester().id
  return {
    ...rest,
    isAssistant:
      u.role === 'STUDENT' &&
      db.lectures.some((l) => l.semesterId === cur && l.assistants.includes(u.userNo)),
  }
}

function view(l: DbLecture): Lecture {
  const c = courseOf(l.courseCode)
  return {
    lecNo: l.lecNo,
    semesterId: l.semesterId,
    courseCode: c.code,
    courseName: c.name,
    section: l.section,
    credits: c.credits,
    category: c.category,
    deptName: c.deptName,
    targetGrade: c.targetGrade,
    gradingType: c.gradingType,
    professorNo: l.professorNo,
    professorName: userOf(l.professorNo)?.name ?? '-',
    capacity: l.capacity,
    enrolledCount: enrolledIn(l.lecNo).length,
    times: l.times,
    isEnglish: l.isEnglish,
    excludeRelative: l.excludeRelative,
    status: l.status,
    gradeStatus: l.gradeStatus,
    syllabusUrl: l.syllabusUrl,
  }
}

const roster = (u: DbUser): RosterStudent => ({
  studentNo: u.userNo,
  name: u.name,
  deptName: u.deptName ?? '',
  grade: u.grade ?? 0,
  email: u.email ?? '',
})

// ---- 기간 판정 ----
const scheduleOf = (semId: string, type: Schedule['type']) =>
  (db.schedules[semId] ?? []).filter((s) => s.type === type)

function studentPeriod(grade: number) {
  const sem = currentSemester().id
  return (db.schedules[sem] ?? []).find(
    (s) =>
      s.type !== 'GRADE_INPUT' &&
      s.targetGrades.includes(grade) &&
      s.startDate <= db.today &&
      db.today <= s.endDate,
  )
}

function adjustEnded(semId: string) {
  const adj = scheduleOf(semId, 'ADJUST')
  if (adj.length === 0) return semOrder(semId) < semOrder(currentSemester().id)
  return adj.every((s) => db.today > s.endDate)
}

function gradeInputOpen(semId: string) {
  return scheduleOf(semId, 'GRADE_INPUT').some(
    (s) => s.startDate <= db.today && db.today <= s.endDate,
  )
}

// ---- 성적 헬퍼 ----
/** 확정된 과목별 최고 등급 (재수강 반영 전 이력 전체) */
function bestLetter(studentNo: string, courseCode: string): LetterGrade | null {
  let best: LetterGrade | null = null
  for (const e of db.enrollments) {
    if (e.studentNo !== studentNo || e.status !== 'ENROLLED' || !e.letter) continue
    const l = lectureOf(e.lecNo)
    if (l.courseCode !== courseCode || l.gradeStatus !== 'CONFIRMED') continue
    if (!best || gradeAtLeast(e.letter, best)) best = e.letter
  }
  return best
}

interface Taken {
  semesterId: string
  course: Course
  letter: LetterGrade
  isRetake: boolean
}
function takenCourses(studentNo: string): Taken[] {
  return db.enrollments
    .filter((e) => e.studentNo === studentNo && e.status === 'ENROLLED' && e.letter)
    .map((e) => ({ e, l: lectureOf(e.lecNo) }))
    .filter(({ l }) => l.gradeStatus === 'CONFIRMED')
    .map(({ e, l }) => ({
      semesterId: l.semesterId,
      course: courseOf(l.courseCode),
      letter: e.letter!,
      isRetake: e.isRetake,
    }))
}

function gpa(list: Taken[]) {
  const graded = list.filter((x) => x.course.gradingType === 'GRADE')
  const cr = graded.reduce((s, x) => s + x.course.credits, 0)
  if (!cr) return null
  const pts = graded.reduce((s, x) => s + (pointOf(x.letter) ?? 0) * x.course.credits, 0)
  return Math.round((pts / cr) * 100) / 100
}
const earned = (list: Taken[]) =>
  list.filter((x) => x.letter !== 'F').reduce((s, x) => s + x.course.credits, 0)

// 시드 시점에도 쓰므로 전역 db 대신 인자로 받은 src 만 본다
function computeMaxCredits(src: Db, semId: string): MaxCreditRow[] {
  const sem = src.semesters.find((s) => s.id === semId)!
  const seasonal = sem.term === 'SUMMER' || sem.term === 'WINTER'
  const order = (s: Semester) => s.year * 10 + TERM_ORDER[s.term]
  const prevRegular = src.semesters
    .filter((s) => (s.term === '1' || s.term === '2') && order(s) < order(sem))
    .sort((a, b) => order(b) - order(a))[0]
  return src.users
    .filter((u) => u.role === 'STUDENT' && u.active)
    .map((u) => {
      let prevGpa: number | null = null
      if (prevRegular) {
        const rows = src.enrollments
          .filter((e) => e.studentNo === u.userNo && e.status === 'ENROLLED' && e.letter)
          .map((e) => ({ e, l: src.lectures.find((l) => l.lecNo === e.lecNo)! }))
          .filter(({ l }) => l.semesterId === prevRegular.id)
          .map(({ e, l }) => ({ c: src.courses.find((c) => c.code === l.courseCode)!, e }))
          .filter(({ c }) => c.gradingType === 'GRADE')
        const cr = rows.reduce((s, r) => s + r.c.credits, 0)
        if (cr)
          prevGpa =
            Math.round(
              (rows.reduce((s, r) => s + (pointOf(r.e.letter!) ?? 0) * r.c.credits, 0) / cr) * 100,
            ) / 100
      }
      // 가정: 정규학기 기본 18학점, 직전 정규학기 평점 4.0 이상 21학점. 계절학기 6학점
      const maxCredits = seasonal ? 6 : prevGpa != null && prevGpa >= 4.0 ? 21 : 18
      return { studentNo: u.userNo, name: u.name, grade: u.grade ?? 0, prevGpa, maxCredits }
    })
}

const overlaps = (a: DbLecture, b: DbLecture) =>
  a.times.some((x) =>
    b.times.some(
      (y) => x.day === y.day && x.startPeriod <= y.endPeriod && y.startPeriod <= x.endPeriod,
    ),
  )

const isChapel = (l: DbLecture) => courseOf(l.courseCode).category === '채플'

function myEnrolledLectures(studentNo: string, semId: string) {
  return db.enrollments
    .filter((e) => e.studentNo === studentNo && e.status === 'ENROLLED')
    .map((e) => ({ e, l: lectureOf(e.lecNo) }))
    .filter(({ l }) => l.semesterId === semId && l.status === 'OPEN')
}

/** REG-03 검사 ③~⑧. 관리자 직권 추가는 중복 검사만 한다 */
function checkEnroll(studentNo: string, l: DbLecture, force = false) {
  const c = courseOf(l.courseCode)
  if (l.status !== 'OPEN') fail(400, '폐강된 강의입니다.')
  const mine = myEnrolledLectures(studentNo, l.semesterId)
  // ③ 같은 과목 중복
  if (mine.some(({ l: x }) => x.courseCode === l.courseCode))
    fail(400, `이미 같은 과목(${c.name})을 신청했습니다.`)
  // ④ 재수강 조건
  const best = bestLetter(studentNo, l.courseCode)
  if (best && (best === 'P' || gradeAtLeast(best, 'B0')))
    fail(400, `이미 ${best} 로 이수한 과목입니다. C+ 이하 과목만 재수강할 수 있습니다.`)
  const isRetake = best != null
  if (force) return isRetake
  // ⑤ 정원
  if (enrolledIn(l.lecNo).length >= l.capacity) fail(400, '정원이 마감된 강의입니다.')
  // ⑥ 시간 중복
  const clash = mine.find(({ l: x }) => overlaps(x, l))
  if (clash) {
    const cc = courseOf(clash.l.courseCode)
    fail(400, `시간이 겹치는 강의가 있습니다: ${cc.name} (${clash.l.section}분반)`)
  }
  // ⑦ 최대학점 (채플 제외)
  const max = db.maxCredits[l.semesterId]?.find((r) => r.studentNo === studentNo)?.maxCredits
  if (max == null) fail(400, '최대학점이 산정되지 않았습니다. 관리자에게 문의하세요.')
  const now = mine
    .filter(({ l: x }) => !isChapel(x))
    .reduce((s, { l: x }) => s + courseOf(x.courseCode).credits, 0)
  const add = isChapel(l) ? 0 : c.credits
  if (now + add > max!)
    fail(400, `최대 신청 가능 학점(${max}학점)을 넘습니다. 현재 ${now}학점 + ${add}학점`)
  // ⑧ 선수과목
  for (const p of c.prerequisites) {
    const got = bestLetter(studentNo, p.courseCode)
    if (!got || !gradeAtLeast(got, p.minGrade))
      fail(
        400,
        `선수과목 ${courseOf(p.courseCode).name}을(를) ${p.minGrade} 이상으로 이수해야 합니다.`,
      )
  }
  return isRetake
}

// ---- 성적표 ----
function gradeSheet(l: DbLecture): GradeSheet {
  const c = courseOf(l.courseCode)
  let lockedReason: string | undefined
  if (l.status === 'CLOSED') lockedReason = '폐강된 강의입니다.'
  else if (l.gradeStatus === 'CONFIRMED') lockedReason = '성적이 확정되어 수정할 수 없습니다.'
  else if (!gradeInputOpen(l.semesterId)) lockedReason = '성적 입력 기간이 아닙니다.'
  else if (c.gradingType === 'GRADE' && !l.ratios)
    lockedReason = '계획서 탭에서 반영 비율을 먼저 등록해야 합니다.'
  const rows: GradeRow[] = enrolledIn(l.lecNo).map((e) => {
    const u = userOf(e.studentNo)!
    return {
      enrollmentId: e.id,
      studentNo: u.userNo,
      name: u.name,
      deptName: u.deptName ?? '',
      grade: u.grade ?? 0,
      scores: e.scores,
      pf: e.pf,
    }
  })
  rows.sort((a, b) => a.studentNo.localeCompare(b.studentNo))
  return {
    lecNo: l.lecNo,
    gradingType: c.gradingType,
    ratios: l.ratios,
    excludeRelative: l.excludeRelative,
    gradeStatus: l.gradeStatus,
    editable: !lockedReason,
    lockedReason,
    rows,
  }
}

// ---- 라우터 ----
interface Ctx {
  params: Record<string, string>
  query: URLSearchParams
  body: unknown
  user: DbUser | null
}
type Handler = (ctx: Ctx) => unknown
const routes: { method: string; re: RegExp; keys: string[]; handler: Handler }[] = []
function route(method: string, path: string, handler: Handler) {
  const keys: string[] = []
  const re = new RegExp(
    '^' +
      path.replace(/:(\w+)/g, (_, k) => {
        keys.push(k)
        return '([^/]+)'
      }) +
      '$',
  )
  routes.push({ method, re, keys, handler })
}

const needUser = (c: Ctx) => c.user ?? fail(401, '로그인이 필요합니다.')
const needRole = (c: Ctx, ...roles: User['role'][]) => {
  const u = needUser(c)
  if (!roles.includes(u.role)) fail(403, '권한이 없습니다.')
  return u
}
const semParam = (c: Ctx) => c.query.get('semesterId') || currentSemester().id

// USR-01
route('POST', '/api/auth/login', ({ body }) => {
  const { userNo, password } = body as { userNo: string; password: string }
  const u = userOf(userNo?.trim())
  if (!u || u.password !== password) fail(401, '사용자번호 또는 비밀번호가 올바르지 않습니다.')
  if (!u!.active) fail(403, '비활성화된 계정입니다. 관리자에게 문의하세요.')
  return { token: `mock-${u!.userNo}`, user: publicUser(u!) }
})
route('GET', '/api/auth/me', (c) => publicUser(needUser(c)))
route('POST', '/api/auth/logout', () => undefined)

// 공통
route('GET', '/api/semesters', (c) => {
  needUser(c)
  return [...db.semesters].sort((a, b) => semOrder(b.id) - semOrder(a.id))
})
route('GET', '/api/periods/current', (c) => {
  const u = needUser(c)
  const p = u.role === 'STUDENT' ? studentPeriod(u.grade ?? 0) : undefined
  return {
    semesterId: currentSemester().id,
    type: p ? p.type : null,
    startDate: p?.startDate,
    endDate: p?.endDate,
    today: db.today,
  }
})

// REG-01
route('GET', '/api/lectures', (c) => {
  needUser(c)
  const q = c.query
  const sem = semParam(c)
  return db.lectures
    .filter((l) => l.semesterId === sem && l.status === 'OPEN')
    .map(view)
    .filter((l) => !q.get('deptName') || l.deptName === q.get('deptName'))
    .filter((l) => !q.get('targetGrade') || String(l.targetGrade) === q.get('targetGrade'))
    .filter((l) => !q.get('category') || l.category === q.get('category'))
    .filter((l) => !q.get('courseName') || l.courseName.includes(q.get('courseName')!))
    .filter((l) => !q.get('professorName') || l.professorName.includes(q.get('professorName')!))
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode) || a.section.localeCompare(b.section))
})

// REG-02 장바구니
const needPeriod = (u: DbUser, ...types: Schedule['type'][]) => {
  const p = studentPeriod(u.grade ?? 0)
  if (!p || !types.includes(p.type)) {
    const names = {
      CART: '장바구니',
      REGISTER: '수강신청',
      ADJUST: '정정',
      GRADE_INPUT: '성적입력',
    }
    fail(400, `${types.map((t) => names[t]).join('·')} 기간이 아닙니다.`)
  }
  return p!
}
route('GET', '/api/me/cart', (c) => {
  const u = needRole(c, 'STUDENT')
  const sem = semParam(c)
  return db.cart
    .filter((x) => x.studentNo === u.userNo)
    .map((x) => lectureOf(x.lecNo))
    .filter((l) => l.semesterId === sem && l.status === 'OPEN')
    .map(view)
})
route('POST', '/api/me/cart', (c) => {
  const u = needRole(c, 'STUDENT')
  needPeriod(u, 'CART')
  const { lecNo } = c.body as { lecNo: number }
  const l = lectureOf(lecNo)
  if (l.semesterId !== currentSemester().id || l.status !== 'OPEN')
    fail(400, '담을 수 없는 강의입니다.')
  if (db.cart.some((x) => x.studentNo === u.userNo && x.lecNo === lecNo))
    fail(400, '이미 장바구니에 담긴 강의입니다.')
  if (
    db.cart.some((x) => x.studentNo === u.userNo && lectureOf(x.lecNo).courseCode === l.courseCode)
  )
    fail(400, '같은 과목의 다른 분반이 이미 장바구니에 있습니다.')
  db.cart.push({ studentNo: u.userNo, lecNo })
})
route('DELETE', '/api/me/cart/:lecNo', (c) => {
  const u = needRole(c, 'STUDENT')
  needPeriod(u, 'CART')
  const lecNo = Number(c.params.lecNo)
  db.cart = db.cart.filter((x) => !(x.studentNo === u.userNo && x.lecNo === lecNo))
})
route('GET', '/api/me/max-credits', (c) => {
  const u = needRole(c, 'STUDENT')
  const row = db.maxCredits[semParam(c)]?.find((r) => r.studentNo === u.userNo)
  return { maxCredits: row?.maxCredits ?? null }
})

// REG-03 수강신청
route('GET', '/api/me/enrollments', (c) => {
  const u = needRole(c, 'STUDENT')
  return myEnrolledLectures(u.userNo, semParam(c)).map(({ e, l }) => ({
    enrollmentId: e.id,
    lecture: view(l),
    isRetake: e.isRetake,
  }))
})
route('POST', '/api/me/enrollments', (c) => {
  const u = needRole(c, 'STUDENT')
  // ② 기간
  const p = needPeriod(u, 'REGISTER', 'ADJUST')
  const { lecNo } = c.body as { lecNo: number }
  const l = lectureOf(lecNo)
  if (l.semesterId !== currentSemester().id) fail(400, '현재 학기 강의가 아닙니다.')
  if (p.type === 'REGISTER' && !db.cart.some((x) => x.studentNo === u.userNo && x.lecNo === lecNo))
    fail(400, '수강신청 기간에는 장바구니에 담은 강의만 신청할 수 있습니다.')
  const isRetake = checkEnroll(u.userNo, l)
  const e = {
    id: db.seq++,
    studentNo: u.userNo,
    lecNo,
    status: 'ENROLLED' as const,
    isRetake,
    scores: { midterm: null, final: null, assignment: null, attendance: null },
    pf: null,
    letter: null,
  }
  db.enrollments.push(e)
  db.cart = db.cart.filter((x) => !(x.studentNo === u.userNo && x.lecNo === lecNo))
  return { enrollmentId: e.id, lecture: view(l), isRetake }
})
route('DELETE', '/api/me/enrollments/:id', (c) => {
  const u = needRole(c, 'STUDENT')
  needPeriod(u, 'REGISTER', 'ADJUST')
  const e = db.enrollments.find((x) => x.id === Number(c.params.id) && x.studentNo === u.userNo)
  if (!e || e.status !== 'ENROLLED') fail(404, '신청 내역을 찾을 수 없습니다.')
  e!.status = 'CANCELLED'
})

// GRD-03 성적 조회
route('GET', '/api/me/grade-semesters', (c) => {
  const u = needRole(c, 'STUDENT')
  const ids = [...new Set(takenCourses(u.userNo).map((t) => t.semesterId))]
  return ids.sort((a, b) => semOrder(b) - semOrder(a))
})
route('GET', '/api/me/grades', (c): Transcript => {
  const u = needRole(c, 'STUDENT')
  const sem = semParam(c)
  const all = takenCourses(u.userNo)
  const thisSem = all.filter((t) => t.semesterId === sem)
  // 누적: 해당 학기까지, 같은 과목은 가장 최근 이력만 반영
  const upTo = all
    .filter((t) => semOrder(t.semesterId) <= semOrder(sem))
    .sort((a, b) => semOrder(b.semesterId) - semOrder(a.semesterId))
  const seen = new Set<string>()
  const latest = upTo.filter((t) => {
    if (seen.has(t.course.code)) return false
    seen.add(t.course.code)
    return true
  })
  return {
    semesterId: sem,
    rows: thisSem.map((t) => ({
      courseCode: t.course.code,
      courseName: t.course.name,
      credits: t.course.credits,
      gradingType: t.course.gradingType,
      letter: t.letter,
      point: pointOf(t.letter, t.course.gradingType),
      isRetake: t.isRetake,
    })),
    semesterGpa: gpa(thisSem),
    semesterCredits: earned(thisSem),
    cumulativeGpa: gpa(latest),
    cumulativeCredits: earned(latest),
  }
})

// LEC-01~04, GRD-01
function access(c: Ctx, lecNo: number) {
  const u = needUser(c)
  const l = lectureOf(lecNo)
  if (u.role === 'PROFESSOR' && l.professorNo === u.userNo)
    return { u, l, role: 'PROFESSOR' as const }
  if (u.role === 'STUDENT' && l.assistants.includes(u.userNo))
    return { u, l, role: 'ASSISTANT' as const }
  return fail(403, '담당 강의가 아닙니다.')
}
route('GET', '/api/teaching/lectures', (c) => {
  const u = needRole(c, 'PROFESSOR', 'STUDENT')
  const sem = semParam(c)
  return db.lectures
    .filter((l) => l.semesterId === sem)
    .filter((l) =>
      u.role === 'PROFESSOR' ? l.professorNo === u.userNo : l.assistants.includes(u.userNo),
    )
    .map(view)
})
route('GET', '/api/teaching/lectures/:lecNo', (c) => {
  const { l, role } = access(c, Number(c.params.lecNo))
  return {
    lecture: view(l),
    myRole: role,
    ratios: l.ratios,
    studentsViewable: adjustEnded(l.semesterId),
  }
})
route('GET', '/api/teaching/lectures/:lecNo/students', (c) => {
  const { l } = access(c, Number(c.params.lecNo))
  if (!adjustEnded(l.semesterId)) fail(403, '정정 기간이 끝난 뒤에 조회할 수 있습니다.')
  return enrolledIn(l.lecNo)
    .map((e) => roster(userOf(e.studentNo)!))
    .sort((a, b) => a.studentNo.localeCompare(b.studentNo))
})
route('PUT', '/api/teaching/lectures/:lecNo/syllabus', (c) => {
  const { l } = access(c, Number(c.params.lecNo))
  const file = (c.body as FormData).get('file')
  if (!(file instanceof File)) fail(400, '파일이 없습니다.')
  if ((file as File).type !== 'application/pdf') fail(400, 'PDF 파일만 올릴 수 있습니다.')
  l.syllabusUrl = URL.createObjectURL(file as File)
})
route('PUT', '/api/teaching/lectures/:lecNo/ratios', (c) => {
  const { l } = access(c, Number(c.params.lecNo))
  if (courseOf(l.courseCode).gradingType === 'PF') fail(400, 'P/F 과목은 반영 비율이 없습니다.')
  if (l.gradeStatus !== 'NOT_ENTERED')
    fail(400, '성적 입력이 시작되어 반영 비율을 바꿀 수 없습니다.')
  const r = c.body as Ratios
  const vals = [r.midterm, r.final, r.assignment, r.attendance]
  if (vals.some((v) => !Number.isInteger(v) || v < 0 || v > 100))
    fail(400, '비율은 0~100 사이 정수로 입력하세요.')
  if (sumRatios(r) !== 100) fail(400, `비율 합이 100%가 아닙니다 (현재 ${sumRatios(r)}%).`)
  l.ratios = r
})
route('GET', '/api/teaching/lectures/:lecNo/assistants', (c) => {
  const { l } = access(c, Number(c.params.lecNo))
  return l.assistants.map((no) => roster(userOf(no)!))
})
route('GET', '/api/teaching/students/:no', (c) => {
  needRole(c, 'PROFESSOR')
  const u = userOf(c.params.no)
  if (!u || u.role !== 'STUDENT' || !u.active) fail(404, '해당 학번의 학생이 없습니다.')
  return roster(u!)
})
route('POST', '/api/teaching/lectures/:lecNo/assistants', (c) => {
  const { l, role } = access(c, Number(c.params.lecNo))
  if (role !== 'PROFESSOR') fail(403, '교수만 조교를 지정할 수 있습니다.')
  const { studentNo } = c.body as { studentNo: string }
  const u = userOf(studentNo)
  if (!u || u.role !== 'STUDENT' || !u.active) fail(404, '해당 학번의 학생이 없습니다.')
  if (l.assistants.includes(studentNo)) fail(400, '이미 조교로 지정된 학생입니다.')
  if (enrolledIn(l.lecNo).some((e) => e.studentNo === studentNo))
    fail(400, '이 강의를 수강 중인 학생은 조교로 지정할 수 없습니다.')
  l.assistants.push(studentNo)
})
route('DELETE', '/api/teaching/lectures/:lecNo/assistants/:no', (c) => {
  const { l, role } = access(c, Number(c.params.lecNo))
  if (role !== 'PROFESSOR') fail(403, '교수만 조교를 삭제할 수 있습니다.')
  l.assistants = l.assistants.filter((x) => x !== c.params.no)
})
route('GET', '/api/teaching/lectures/:lecNo/grades', (c) =>
  gradeSheet(access(c, Number(c.params.lecNo)).l),
)
route('PUT', '/api/teaching/lectures/:lecNo/grades', (c) => {
  const { l } = access(c, Number(c.params.lecNo))
  const sheet = gradeSheet(l)
  if (!sheet.editable) fail(400, sheet.lockedReason!)
  const rows = c.body as Pick<GradeRow, 'enrollmentId' | 'scores' | 'pf'>[]
  for (const r of rows) {
    const e = db.enrollments.find((x) => x.id === r.enrollmentId && x.lecNo === l.lecNo)
    if (!e) continue
    const vals = Object.values(r.scores)
    if (vals.some((v) => v != null && (v < 0 || v > 100)))
      fail(400, '점수는 0~100 사이로 입력하세요.')
    e.scores = r.scores
    e.pf = r.pf
    e.letter = null
  }
  l.gradeStatus = 'IN_PROGRESS'
  return gradeSheet(l)
})
route('POST', '/api/teaching/lectures/:lecNo/grades/submit', (c) => {
  const { l } = access(c, Number(c.params.lecNo))
  const sheet = gradeSheet(l)
  if (!sheet.editable) fail(400, sheet.lockedReason!)
  if (l.gradeStatus !== 'IN_PROGRESS') fail(400, '저장한 뒤에 제출할 수 있습니다.')
  const es = enrolledIn(l.lecNo)
  const pf = sheet.gradingType === 'PF'
  const missing = es.filter((e) =>
    pf ? !e.pf : Object.values(e.scores).some((v) => v == null),
  ).length
  if (missing) fail(400, `성적을 입력하지 않은 수강생이 ${missing}명 있습니다.`)
  const letters = es.map((e) =>
    pf ? (e.pf as LetterGrade) : letterOf(totalScore(e.scores, l.ratios!)!),
  )
  if (!pf && !l.excludeRelative) {
    const r = relativeRatio(letters)
    if (!r.ok)
      fail(400, `상대평가 비율을 넘었습니다 (A ${r.aPct}% / 상한 30%, A+B ${r.abPct}% / 상한 70%).`)
  }
  es.forEach((e, i) => (e.letter = letters[i]))
  l.gradeStatus = 'SUBMITTED'
  return gradeSheet(l)
})

// 관리자
route('GET', '/api/admin/dashboard', (c) => {
  needRole(c, 'ADMIN')
  const ls = db.lectures.filter((l) => l.semesterId === semParam(c))
  const open = ls.filter((l) => l.status === 'OPEN')
  return {
    openLectureCount: open.length,
    closedLectureCount: ls.length - open.length,
    totalEnrollments: open.reduce((s, l) => s + enrolledIn(l.lecNo).length, 0),
    fullLectures: open.filter((l) => enrolledIn(l.lecNo).length >= l.capacity).map(view),
  }
})

// USR-02
route('GET', '/api/admin/users', (c) => {
  needRole(c, 'ADMIN')
  const kw = c.query.get('keyword') ?? ''
  const role = c.query.get('role')
  return db.users
    .filter((u) => !role || u.role === role)
    .filter((u) => !kw || u.userNo.includes(kw) || u.name.includes(kw))
    .map(publicUser)
})
function validateUser(f: UserForm) {
  if (!f.userNo?.trim() || !f.name?.trim()) fail(400, '사용자번호와 이름은 필수입니다.')
  if (f.role !== 'ADMIN' && !f.deptName) fail(400, '학과를 입력하세요.')
  if (f.role === 'STUDENT' && !(f.grade && f.grade >= 1 && f.grade <= 4))
    fail(400, '학년은 1~4 사이로 입력하세요.')
}
route('POST', '/api/admin/users', (c) => {
  needRole(c, 'ADMIN')
  const f = c.body as UserForm
  validateUser(f)
  if (userOf(f.userNo)) fail(400, '이미 있는 사용자번호입니다.')
  if (!f.password) fail(400, '초기 비밀번호를 입력하세요.')
  const u: DbUser = {
    userNo: f.userNo.trim(),
    name: f.name.trim(),
    role: f.role,
    active: true,
    password: f.password!,
    ...(f.role !== 'ADMIN' ? { deptName: f.deptName, email: f.email } : {}),
    ...(f.role === 'STUDENT' ? { grade: f.grade } : {}),
  }
  db.users.push(u)
  return publicUser(u)
})
route('PUT', '/api/admin/users/:no', (c) => {
  needRole(c, 'ADMIN')
  const u = userOf(c.params.no) ?? fail(404, '사용자를 찾을 수 없습니다.')
  const f = c.body as UserForm
  validateUser({ ...f, userNo: u.userNo, role: u.role })
  u.name = f.name.trim()
  if (u.role !== 'ADMIN') {
    u.deptName = f.deptName
    u.email = f.email
  }
  if (u.role === 'STUDENT') u.grade = f.grade
  if (f.password) u.password = f.password
  return publicUser(u)
})
route('POST', '/api/admin/users/:no/deactivate', (c) => {
  const me = needRole(c, 'ADMIN')
  if (me.userNo === c.params.no) fail(400, '본인 계정은 비활성화할 수 없습니다.')
  const u = userOf(c.params.no) ?? fail(404, '사용자를 찾을 수 없습니다.')
  u.active = false
})

// ACA-01
route('POST', '/api/admin/semesters', (c) => {
  needRole(c, 'ADMIN')
  const { year, term } = c.body as { year: number; term: Term }
  if (!year || year < 2000) fail(400, '연도를 확인하세요.')
  const id = `${year}-${term}`
  if (db.semesters.some((s) => s.id === id)) fail(400, '이미 등록된 학기입니다.')
  const s: Semester = { id, year, term, current: false }
  db.semesters.push(s)
  return s
})
route('POST', '/api/admin/semesters/:id/current', (c) => {
  needRole(c, 'ADMIN')
  if (!db.semesters.some((s) => s.id === c.params.id)) fail(404, '학기를 찾을 수 없습니다.')
  for (const s of db.semesters) s.current = s.id === c.params.id
})
route('GET', '/api/admin/semesters/:id/schedules', (c) => {
  needRole(c, 'ADMIN')
  return db.schedules[c.params.id] ?? []
})
route('PUT', '/api/admin/semesters/:id/schedules', (c) => {
  needRole(c, 'ADMIN')
  const list = c.body as Schedule[]
  for (const s of list) {
    if (!s.startDate || !s.endDate) fail(400, '시작일과 종료일을 모두 입력하세요.')
    if (s.startDate > s.endDate) fail(400, '시작일이 종료일보다 늦을 수 없습니다.')
    if (!s.targetGrades.length) fail(400, '대상학년을 하나 이상 고르세요.')
  }
  db.schedules[c.params.id] = list
})
route('GET', '/api/admin/semesters/:id/max-credits', (c) => {
  needRole(c, 'ADMIN')
  return db.maxCredits[c.params.id] ?? []
})
route('POST', '/api/admin/semesters/:id/max-credits', (c) => {
  needRole(c, 'ADMIN')
  const sem =
    db.semesters.find((s) => s.id === c.params.id) ?? fail(404, '학기를 찾을 수 없습니다.')
  if (sem.term === '1' || sem.term === '2') {
    const prev = db.semesters
      .filter((s) => (s.term === '1' || s.term === '2') && semOrder(s.id) < semOrder(sem.id))
      .sort((a, b) => semOrder(b.id) - semOrder(a.id))[0]
    const pending =
      prev &&
      db.lectures.some(
        (l) =>
          l.semesterId === prev.id &&
          l.status === 'OPEN' &&
          l.gradeStatus !== 'CONFIRMED' &&
          enrolledIn(l.lecNo).length > 0,
      )
    if (pending)
      fail(400, `직전 정규학기(${semesterLabel(prev.id)}) 성적이 모두 확정되지 않았습니다.`)
  }
  db.maxCredits[sem.id] = computeMaxCredits(db, sem.id)
  return db.maxCredits[sem.id]
})

// ACA-02
route('GET', '/api/admin/courses', (c) => {
  needUser(c)
  return db.courses.map((x) => ({
    ...x,
    prerequisites: x.prerequisites.map((p) => ({ ...p, courseName: courseOf(p.courseCode).name })),
  }))
})
function validateCourse(f: Course) {
  if (!f.code?.trim() || !f.name?.trim()) fail(400, '과목코드와 과목명은 필수입니다.')
  if (!(f.credits >= 0 && f.credits <= 6)) fail(400, '학점은 0~6 사이로 입력하세요.')
  for (const p of f.prerequisites) {
    if (p.courseCode === f.code) fail(400, '자기 자신을 선수과목으로 지정할 수 없습니다.')
    courseOf(p.courseCode)
  }
}
const stripCourse = (f: Course): Course => ({
  ...f,
  prerequisites: f.prerequisites.map(({ courseCode, minGrade }) => ({ courseCode, minGrade })),
})
route('POST', '/api/admin/courses', (c) => {
  needRole(c, 'ADMIN')
  const f = c.body as Course
  validateCourse(f)
  if (db.courses.some((x) => x.code === f.code)) fail(400, '이미 있는 과목코드입니다.')
  db.courses.push(stripCourse(f))
  return f
})
route('PUT', '/api/admin/courses/:code', (c) => {
  needRole(c, 'ADMIN')
  const i = db.courses.findIndex((x) => x.code === c.params.code)
  if (i < 0) fail(404, '과목을 찾을 수 없습니다.')
  const f = { ...(c.body as Course), code: c.params.code }
  validateCourse(f)
  db.courses[i] = stripCourse(f)
  return f
})

// ACA-03
route('GET', '/api/admin/lectures', (c) => {
  needRole(c, 'ADMIN')
  return db.lectures
    .filter((l) => l.semesterId === semParam(c))
    .map(view)
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode) || a.section.localeCompare(b.section))
})
function validateLecture(f: LectureForm, lecNo?: number) {
  courseOf(f.courseCode)
  const p = userOf(f.professorNo)
  if (!p || p.role !== 'PROFESSOR') fail(400, '담당 교수를 고르세요.')
  if (!f.section?.trim()) fail(400, '분반을 입력하세요.')
  if (!(f.capacity > 0)) fail(400, '정원은 1 이상이어야 합니다.')
  if (!f.times.length) fail(400, '강의시간을 하나 이상 입력하세요.')
  for (const t of f.times) {
    if (t.startPeriod > t.endPeriod)
      fail(400, `${DAY_LABEL[t.day]}요일 시작 교시가 종료 교시보다 늦습니다.`)
    if (!t.room?.trim()) fail(400, '강의실을 입력하세요.')
  }
  if (
    db.lectures.some(
      (l) =>
        l.lecNo !== lecNo &&
        l.semesterId === f.semesterId &&
        l.courseCode === f.courseCode &&
        l.section === f.section,
    )
  )
    fail(400, '같은 학기에 같은 과목·분반이 이미 있습니다.')
}
route('POST', '/api/admin/lectures', (c) => {
  needRole(c, 'ADMIN')
  const f = c.body as LectureForm
  validateLecture(f)
  const lecNo = Math.max(...db.lectures.map((l) => l.lecNo)) + 1
  const l: DbLecture = {
    ...f,
    lecNo,
    status: 'OPEN',
    gradeStatus: 'NOT_ENTERED',
    syllabusUrl: null,
    ratios: null,
    assistants: [],
  }
  db.lectures.push(l)
  return view(l)
})
route('PUT', '/api/admin/lectures/:lecNo', (c) => {
  needRole(c, 'ADMIN')
  const l = lectureOf(Number(c.params.lecNo))
  if (l.status === 'CLOSED') fail(400, '폐강된 강의는 수정할 수 없습니다.')
  const f = c.body as LectureForm
  validateLecture({ ...f, semesterId: l.semesterId }, l.lecNo)
  if (f.capacity < enrolledIn(l.lecNo).length)
    fail(400, `정원을 현재 신청 인원(${enrolledIn(l.lecNo).length}명)보다 줄일 수 없습니다.`)
  Object.assign(l, { ...f, semesterId: l.semesterId })
  return view(l)
})
route('POST', '/api/admin/lectures/:lecNo/close', (c) => {
  needRole(c, 'ADMIN')
  const l = lectureOf(Number(c.params.lecNo))
  l.status = 'CLOSED'
  for (const e of enrolledIn(l.lecNo)) e.status = 'CANCELLED'
  db.cart = db.cart.filter((x) => x.lecNo !== l.lecNo)
})

// REG-05
route('GET', '/api/admin/lectures/:lecNo/enrollments', (c) => {
  needRole(c, 'ADMIN')
  const l = lectureOf(Number(c.params.lecNo))
  return {
    lecture: view(l),
    editable: !adjustEnded(l.semesterId) && l.status === 'OPEN',
    students: enrolledIn(l.lecNo).map((e) => ({
      ...roster(userOf(e.studentNo)!),
      enrollmentId: e.id,
      isRetake: e.isRetake,
    })),
  }
})
route('POST', '/api/admin/lectures/:lecNo/enrollments', (c) => {
  needRole(c, 'ADMIN')
  const l = lectureOf(Number(c.params.lecNo))
  if (adjustEnded(l.semesterId)) fail(400, '정정 기간이 끝나 직권 처리할 수 없습니다.')
  const { studentNo } = c.body as { studentNo: string }
  const u = userOf(studentNo)
  if (!u || u.role !== 'STUDENT' || !u.active) fail(404, '해당 학번의 학생이 없습니다.')
  const isRetake = checkEnroll(studentNo, l, true)
  db.enrollments.push({
    id: db.seq++,
    studentNo,
    lecNo: l.lecNo,
    status: 'ENROLLED',
    isRetake,
    scores: { midterm: null, final: null, assignment: null, attendance: null },
    pf: null,
    letter: null,
  })
})
route('DELETE', '/api/admin/enrollments/:id', (c) => {
  needRole(c, 'ADMIN')
  const e = db.enrollments.find((x) => x.id === Number(c.params.id) && x.status === 'ENROLLED')
  if (!e) fail(404, '신청 내역을 찾을 수 없습니다.')
  if (adjustEnded(lectureOf(e!.lecNo).semesterId))
    fail(400, '정정 기간이 끝나 직권 처리할 수 없습니다.')
  e!.status = 'CANCELLED'
})

// GRD-02
route('POST', '/api/admin/grades/:lecNo/confirm', (c) => {
  needRole(c, 'ADMIN')
  const l = lectureOf(Number(c.params.lecNo))
  if (l.gradeStatus !== 'SUBMITTED') fail(400, '제출된 강의만 확정할 수 있습니다.')
  l.gradeStatus = 'CONFIRMED'
})

// ---- 진입점 ----
export async function mockFetch<T>(
  method: string,
  url: string,
  body: unknown,
  token: string | null,
): Promise<T> {
  await new Promise((r) => setTimeout(r, 120))
  const [path, qs] = url.split('?')
  const user = token?.startsWith('mock-') ? (userOf(token.slice(5)) ?? null) : null
  for (const r of routes) {
    if (r.method !== method) continue
    const m = path.match(r.re)
    if (!m) continue
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
    if (user && !user.active) fail(401, '비활성화된 계정입니다.')
    const result = r.handler({ params, query: new URLSearchParams(qs), body, user })
    if (method !== 'GET') save()
    return clone(result) as T
  }
  return fail(404, `목 서버에 없는 경로입니다: ${method} ${path}`)
}

// 모든 상수·라우트 선언 뒤에 DB 를 불러온다
db = load()
