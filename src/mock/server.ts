// 개발용 목 서버. request() 가 보낸 메서드·경로를 받아 백엔드 대신 응답한다.
// 응답 형태는 백엔드 DTO 와 같고, 업무 규칙은 흉내만 낸다 (정원·중복 정도).
import { ApiError, tokenStore } from '../api/client'
import { CLASSROOMS, DEPARTMENTS } from '../lib/codes'
import type {
  CartResponse,
  CourseCreateRequest,
  CourseUpdateRequest,
  EnrollmentResponse,
  EnrollmentStatusResponse,
  EvalMode,
  GradeInput,
  GradeReportResponse,
  GradeSheetResponse,
  GradeSheetStudent,
  GrdStat,
  LectureCreateRequest,
  LecturePlanResponse,
  LectureResponse,
  LectureSearchItem,
  LectureUpdateRequest,
  MaxCreditItem,
  PlanWeights,
  PrerequisiteRequest,
  ScheduleRequest,
  SemesterRequest,
  TimeSlot,
  TimeSlotRequest,
  UserCreateRequest,
  UserResponse,
  UserUpdateRequest,
} from '../types'
import {
  createSeed,
  DB_VERSION,
  type Db,
  type DbEnrollment,
  type DbLecture,
  type DbUser,
} from './db'

const STORAGE_KEY = 'crs.mockdb'

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    /* 저장소 사용 불가 */
  }
  return createSeed()
}

const db: Db = load()
/** 올린 계획서 파일 (새로고침하면 사라진다) */
const planFiles = new Map<number, Blob>()

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* 저장소 사용 불가 */
  }
}

/* ---------- 공통 ---------- */

const fail = (status: number, code: string, detail: string): never => {
  void code
  throw new ApiError(status, detail)
}
const now = () => new Date()
const nowLocal = () => {
  const d = now()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
const inRange = (s: { startDtm: string; endDtm: string }) =>
  new Date(s.startDtm) <= now() && now() < new Date(s.endDtm)

const findUser = (no: string) => db.users.find((u) => u.usrNo === no)
const findLecture = (lecNo: number) =>
  db.lectures.find((l) => l.lecNo === lecNo) ??
  fail(404, 'LECTURE_NOT_FOUND', '강의를 찾을 수 없습니다.')
const findCourse = (cd: string) => db.courses.find((c) => c.crsCd === cd)
const courseOf = (l: DbLecture) =>
  findCourse(l.crsCd) ?? fail(404, 'COURSE_NOT_FOUND', '과목을 찾을 수 없습니다.')
const deptNm = (no: number) => DEPARTMENTS.find((d) => d.deptNo === no)?.deptNm ?? ''
const currentSemNo = () => (db.semesters.find((s) => s.current) ?? db.semesters[0]).semNo
const enrolledOf = (lecNo: number) => db.enrollments.filter((e) => e.lecNo === lecNo)
const semSchedules = (semNo: number) => db.schedules.filter((s) => s.semNo === semNo)

/** 신청 대상 학기: 장바구니·신청·정정 일정이 아직 안 끝난 학기 중 가장 이른 것 */
function registrationSemNo(): number | null {
  const sems = [...new Set(db.schedules.map((s) => s.semNo))]
    .map((semNo) => {
      const ss = semSchedules(semNo).filter((s) => s.schdType !== 'GRADE')
      return {
        semNo,
        end: Math.max(...ss.map((s) => new Date(s.endDtm).getTime())),
        start: Math.min(...ss.map((s) => new Date(s.startDtm).getTime())),
      }
    })
    .filter((x) => x.end > now().getTime())
    .sort((a, b) => a.start - b.start)
  return sems[0]?.semNo ?? null
}
const requireRegistration = () =>
  registrationSemNo() ?? fail(409, 'NO_REGISTRATION_SEMESTER', '지금은 신청 대상 학기가 없습니다.')
const periodOpen = (semNo: number, type: string) =>
  semSchedules(semNo).some((s) => s.schdType === type && inRange(s))

function toSlot(t: TimeSlotRequest): TimeSlot {
  const roomNm = CLASSROOMS.find((r) => r.roomCd === t.roomCd)?.roomNm ?? null
  return {
    ...t,
    startTm: t.startTm.length === 5 ? `${t.startTm}:00` : t.startTm,
    endTm: t.endTm.length === 5 ? `${t.endTm}:00` : t.endTm,
    roomNm,
    place: roomNm ?? (t.clsType === 'ONLINE' ? '온라인' : '미배정'),
  }
}

function toLectureResponse(l: DbLecture): LectureResponse {
  const c = courseOf(l)
  return {
    lecNo: l.lecNo,
    crsCd: l.crsCd,
    crsNm: c.crsNm,
    crdt: c.crdt,
    semNo: l.semNo,
    profNo: l.profNo,
    profNm: findUser(l.profNo)?.usrNm ?? '',
    sectNo: l.sectNo,
    cap: l.cap,
    enrlCnt: enrolledOf(l.lecNo).length,
    lecStat: l.lecStat,
    engLec: l.engLec,
    relGrdExmp: l.relGrdExmp,
    timeSlots: l.timeSlots.map(toSlot),
  }
}

function toSearchItem(l: DbLecture): LectureSearchItem {
  const r = toLectureResponse(l)
  const c = courseOf(l)
  return {
    lecNo: r.lecNo,
    crsCd: r.crsCd,
    crsNm: r.crsNm,
    sectNo: r.sectNo,
    crdt: r.crdt,
    cmplType: c.cmplType,
    evalType: c.evalType,
    rcmdYrLvl: c.rcmdYrLvl,
    profNm: r.profNm,
    engLec: r.engLec,
    cap: r.cap,
    enrlCnt: r.enrlCnt,
    remaining: r.cap - r.enrlCnt,
    full: r.enrlCnt >= r.cap,
    planFile: l.hasPlan ? `plan-${l.lecNo}.pdf` : null,
    timeSlots: r.timeSlots,
  }
}

function toEnrollment(e: DbEnrollment): EnrollmentResponse {
  const l = findLecture(e.lecNo)
  const r = toLectureResponse(l)
  return {
    lecNo: r.lecNo,
    crsCd: r.crsCd,
    crsNm: r.crsNm,
    sectNo: r.sectNo,
    crdt: r.crdt,
    cmplType: courseOf(l).cmplType,
    profNm: r.profNm,
    retake: e.retake,
    enrlDtm: e.enrlDtm,
    timeSlots: r.timeSlots,
  }
}

const toTeachingStudent = (no: string) => {
  const u = findUser(no)
  return {
    stdNo: no,
    usrNm: u?.usrNm ?? '',
    deptNm: u?.deptNm ?? '',
    yrLvl: u?.yrLvl ?? 0,
    email: u?.email ?? null,
  }
}

const toUser = (u: DbUser): UserResponse => {
  const { password: _pw, ...rest } = u
  void _pw
  return rest
}

/* ---------- 성적 (목에서만 간단히 계산) ---------- */

const LETTERS: [number, string, number][] = [
  [97, 'A+', 4.5],
  [94, 'A0', 4.3],
  [90, 'A-', 4.0],
  [87, 'B+', 3.5],
  [84, 'B0', 3.3],
  [80, 'B-', 3.0],
  [77, 'C+', 2.5],
  [74, 'C0', 2.3],
  [70, 'C-', 2.0],
  [67, 'D+', 1.5],
  [64, 'D0', 1.3],
  [60, 'D-', 1.0],
  [0, 'F', 0],
]

function evalModeOf(l: DbLecture): EvalMode {
  if (courseOf(l).evalType === 'PASS_FAIL') return 'PASS_FAIL'
  return enrolledOf(l.lecNo).length >= 10 && !l.relGrdExmp && !l.engLec ? 'RELATIVE' : 'ABSOLUTE'
}

function sheetRow(e: DbEnrollment, l: DbLecture): GradeSheetStudent {
  const w = l.weights ?? { midWt: 30, finWt: 40, hwWt: 20, attWt: 10 }
  const entered = [e.midScr, e.finScr, e.hwScr, e.attScr].every((v) => v != null)
  const rawTotal = entered
    ? (e.midScr! * w.midWt + e.finScr! * w.finWt + e.hwScr! * w.hwWt + e.attScr! * w.attWt) / 100
    : null
  const totScr = rawTotal == null ? null : Math.round(rawTotal)
  const pf = courseOf(l).evalType === 'PASS_FAIL'
  const hit = totScr == null ? null : LETTERS.find(([min]) => totScr >= min)!
  const ltrGrd = hit ? (pf ? (totScr! >= 60 ? 'P' : 'F') : hit[1]) : null
  return {
    stdNo: e.stdNo,
    usrNm: findUser(e.stdNo)?.usrNm ?? '',
    retake: e.retake,
    midScr: e.midScr,
    finScr: e.finScr,
    hwScr: e.hwScr,
    attScr: e.attScr,
    rawTotal,
    group: null,
    totScr,
    ltrGrd,
    grdPt: hit && !pf ? hit[2] : null,
    entered,
  }
}

function gradeSheet(l: DbLecture): GradeSheetResponse {
  const c = courseOf(l)
  const mode = evalModeOf(l)
  const n = enrolledOf(l.lecNo).length
  return {
    lecNo: l.lecNo,
    crsCd: l.crsCd,
    crsNm: c.crsNm,
    sectNo: l.sectNo,
    grdStat: l.grdStat,
    editable: periodOpen(l.semNo, 'GRADE') && l.grdStat !== 'CONFIRMED' && l.lecStat === 'OPEN',
    evalMode: mode,
    weights: l.weights,
    counts:
      mode === 'PASS_FAIL'
        ? null
        : mode === 'RELATIVE'
          ? {
              enrolled: n,
              aCnt: l.aCnt ?? Math.floor(n * 0.4),
              abCnt: l.abCnt ?? Math.floor(n * 0.8),
              aLimit: Math.floor(n * 0.4),
              abLimit: Math.floor(n * 0.8),
            }
          : { enrolled: n, aCnt: l.aCnt, abCnt: l.abCnt, aLimit: n, abLimit: n },
    tieAtBoundary: false,
    students: enrolledOf(l.lecNo)
      .sort((a, b) => a.stdNo.localeCompare(b.stdNo))
      .map((e) => sheetRow(e, l)),
  }
}

function gradeReport(stdNo: string): GradeReportResponse {
  const bySem = new Map<number, ReturnType<typeof row>[]>()
  function row(e: DbEnrollment, l: DbLecture) {
    const c = courseOf(l)
    const r = sheetRow(e, l)
    return {
      lecNo: l.lecNo,
      crsCd: l.crsCd,
      crsNm: c.crsNm,
      crdt: c.crdt,
      cmplType: c.cmplType,
      evalType: c.evalType,
      ltrGrd: r.ltrGrd ?? 'F',
      gradePoint: r.grdPt,
      retake: e.retake,
      counted: true,
    }
  }
  for (const e of db.enrollments.filter((x) => x.stdNo === stdNo)) {
    const l = findLecture(e.lecNo)
    if (l.grdStat !== 'CONFIRMED') continue
    bySem.set(l.semNo, [...(bySem.get(l.semNo) ?? []), row(e, l)])
  }
  const gpa = (rows: ReturnType<typeof row>[]) => {
    const g = rows.filter((r) => r.gradePoint != null)
    const cr = g.reduce((s, r) => s + r.crdt, 0)
    return cr
      ? Math.round((g.reduce((s, r) => s + r.gradePoint! * r.crdt, 0) / cr) * 100) / 100
      : null
  }
  const semesters = db.semesters
    .filter((s) => bySem.has(s.semNo))
    .map((s) => ({
      semNo: s.semNo,
      yr: s.yr,
      semType: s.semType,
      grades: bySem.get(s.semNo)!,
      gpa: gpa(bySem.get(s.semNo)!),
    }))
  const all = semesters.flatMap((s) => s.grades)
  return {
    semesters,
    cumulativeGpa: gpa(all),
    earnedCredits: all.filter((r) => r.ltrGrd !== 'F').reduce((s, r) => s + r.crdt, 0),
  }
}

/* ---------- 라우팅 ---------- */

type Ctx = {
  params: string[]
  query: Record<string, string>
  body: unknown
  me: DbUser | undefined
}
type Handler = (c: Ctx) => unknown
const routes: [string, RegExp, Handler][] = []
const on = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp('^' + pattern.replace(/\{\w+\}/g, '([^/]+)') + '$'), h])

const auth = (c: Ctx) => c.me ?? fail(401, 'UNAUTHENTICATED', '로그인이 필요합니다.')
const body = <T>(c: Ctx) => c.body as T
const num = (s: string | undefined) => (s ? Number(s) : undefined)
const student = (c: Ctx) => {
  const me = auth(c)
  if (me.role !== 'STUDENT') fail(403, 'FORBIDDEN', '권한이 없습니다.')
  return me
}
const admin = (c: Ctx) => {
  const me = auth(c)
  if (me.role !== 'ADMIN') fail(403, 'FORBIDDEN', '권한이 없습니다.')
  return me
}
/** 담당 교수 또는 조교 */
const teaching = (c: Ctx, profOnly = false) => {
  const me = auth(c)
  const l = findLecture(Number(c.params[0]))
  const ok = l.profNo === me.usrNo || (!profOnly && l.assistants.includes(me.usrNo))
  if (!ok) fail(403, 'FORBIDDEN', '권한이 없습니다.')
  return l
}

// USR-01
on('POST', '/api/auth/login', (c) => {
  const { usrNo, password } = body<{ usrNo: string; password: string }>(c)
  const u = findUser(usrNo)
  if (!u || u.password !== password)
    fail(401, 'LOGIN_FAILED', '로그인 ID 또는 비밀번호가 올바르지 않습니다.')
  if (u!.acctStat !== 'ACTIVE') fail(403, 'ACCOUNT_INACTIVE', '비활성화된 계정입니다.')
  return { accessToken: 'mock-' + u!.usrNo, user: myInfo(u!) }
})
const myInfo = (u: DbUser) => ({
  usrNo: u.usrNo,
  usrNm: u.usrNm,
  role: u.role,
  ta: u.role === 'STUDENT' && db.lectures.some((l) => l.assistants.includes(u.usrNo)),
})
on('GET', '/api/auth/me', (c) => myInfo(auth(c)))
on('PATCH', '/api/auth/password', (c) => {
  const me = auth(c)
  const { currentPassword, newPassword } = body<{ currentPassword: string; newPassword: string }>(c)
  if (me.password !== currentPassword)
    fail(400, 'PASSWORD_MISMATCH', '현재 비밀번호가 올바르지 않습니다.')
  if (!newPassword) fail(400, 'INVALID_INPUT', 'newPassword: 공백일 수 없습니다')
  me.password = newPassword
})

// 공통
on('GET', '/api/health', () => ({ status: 'ok', time: new Date().toISOString() }))
on('GET', '/api/semesters', (c) => (auth(c), db.semesters))
on('GET', '/api/semesters/{semNo}/schedules', (c) => (auth(c), semSchedules(Number(c.params[0]))))

// REG-01
on('GET', '/api/lectures', (c) => {
  auth(c)
  const q = c.query
  const semNo = num(q.semNo) ?? registrationSemNo() ?? currentSemNo()
  const page = num(q.page) ?? 0
  const size = num(q.size) ?? 20
  const all = db.lectures
    .filter((l) => l.semNo === semNo && l.lecStat === 'OPEN')
    .map(toSearchItem)
    .filter((l) => {
      const course = findCourse(l.crsCd)!
      if (q.deptNo && String(course.deptNo) !== q.deptNo) return false
      if (q.yrLvl && l.rcmdYrLvl != null && String(l.rcmdYrLvl) !== q.yrLvl) return false
      if (q.cmplType && l.cmplType !== q.cmplType) return false
      if (q.crsNm && !l.crsNm.includes(q.crsNm)) return false
      if (q.profNm && !l.profNm.includes(q.profNm)) return false
      return true
    })
  return { semNo, page, size, total: all.length, items: all.slice(page * size, (page + 1) * size) }
})

// REG-02
function cartOf(me: DbUser): CartResponse {
  const semNo = requireRegistration()
  const items = db.cart
    .filter((x) => x.stdNo === me.usrNo && findLecture(x.lecNo).semNo === semNo)
    .map((x) => {
      const r = toSearchItem(findLecture(x.lecNo))
      return {
        lecNo: r.lecNo,
        crsCd: r.crsCd,
        crsNm: r.crsNm,
        sectNo: r.sectNo,
        crdt: r.crdt,
        cmplType: r.cmplType,
        profNm: r.profNm,
        cap: r.cap,
        enrlCnt: r.enrlCnt,
        cartCnt: db.cart.filter((y) => y.lecNo === x.lecNo).length,
        timeSlots: r.timeSlots,
      }
    })
  return {
    semNo,
    items,
    cartCredits: items.filter((i) => i.cmplType !== 'CHAPEL').reduce((s, i) => s + i.crdt, 0),
    maxCredit: db.maxCredits[semNo]?.find((m) => m.stdNo === me.usrNo)?.maxCrdt ?? 18,
  }
}
on('GET', '/api/cart', (c) => cartOf(student(c)))
on('POST', '/api/cart', (c) => {
  const me = student(c)
  const semNo = requireRegistration()
  if (!periodOpen(semNo, 'CART')) fail(409, 'CART_CLOSED', '장바구니 기간이 아닙니다.')
  const { lecNo } = body<{ lecNo: number }>(c)
  findLecture(lecNo)
  if (db.cart.some((x) => x.stdNo === me.usrNo && x.lecNo === lecNo))
    fail(409, 'DUPLICATE_CART', '이미 장바구니에 담은 강의입니다.')
  db.cart.push({ stdNo: me.usrNo, lecNo, addedAt: nowLocal() })
  return cartOf(me)
})
on('DELETE', '/api/cart/{lecNo}', (c) => {
  const me = student(c)
  if (!periodOpen(requireRegistration(), 'CART'))
    fail(409, 'CART_CLOSED', '장바구니 기간이 아닙니다.')
  db.cart = db.cart.filter((x) => !(x.stdNo === me.usrNo && x.lecNo === Number(c.params[0])))
})

// REG-03·04
on('GET', '/api/enrollments', (c) => {
  const me = student(c)
  const semNo = requireRegistration()
  return db.enrollments
    .filter((e) => e.stdNo === me.usrNo && findLecture(e.lecNo).semNo === semNo)
    .map(toEnrollment)
})
function doEnroll(stdNo: string, lecNo: number, by: 'STUDENT' | 'ADMIN') {
  const l = findLecture(lecNo)
  if (l.lecStat === 'CLOSED') fail(409, 'LECTURE_CLOSED', '폐강된 강의입니다.')
  if (db.enrollments.some((e) => e.stdNo === stdNo && e.lecNo === lecNo))
    fail(409, 'ALREADY_ENROLLED_COURSE', '같은 과목을 이미 신청했습니다.')
  if (by === 'STUDENT' && enrolledOf(lecNo).length >= l.cap)
    fail(409, 'LECTURE_FULL', '정원이 찼습니다.')
  const e: DbEnrollment = {
    stdNo,
    lecNo,
    enrlDtm: nowLocal(),
    retake: false,
    procType: by,
    midScr: null,
    finScr: null,
    hwScr: null,
    attScr: null,
  }
  db.enrollments.push(e)
  return e
}
on('POST', '/api/enrollments', (c) => {
  const me = student(c)
  const semNo = requireRegistration()
  if (!periodOpen(semNo, 'ENROLL') && !periodOpen(semNo, 'ADJUST'))
    fail(409, 'ENROLL_CLOSED', '수강신청 기간이 아닙니다.')
  if (me.stdStat !== 'ATTENDING')
    fail(403, 'STUDENT_STATUS_NOT_ALLOWED', '이번 학기에 신청할 수 없는 학적상태입니다.')
  return toEnrollment(doEnroll(me.usrNo, body<{ lecNo: number }>(c).lecNo, 'STUDENT'))
})
on('DELETE', '/api/enrollments/{lecNo}', (c) => {
  const me = student(c)
  const lecNo = Number(c.params[0])
  if (!db.enrollments.some((e) => e.stdNo === me.usrNo && e.lecNo === lecNo))
    fail(404, 'ENROLLMENT_NOT_FOUND', '신청한 강의가 아닙니다.')
  db.enrollments = db.enrollments.filter((e) => !(e.stdNo === me.usrNo && e.lecNo === lecNo))
})
on('GET', '/api/me/timetable', (c) => {
  const me = student(c)
  const semNo = num(c.query.semNo) ?? registrationSemNo() ?? currentSemNo()
  const lectures = db.enrollments
    .filter((e) => e.stdNo === me.usrNo && findLecture(e.lecNo).semNo === semNo)
    .map(toEnrollment)
  return { semNo, lectures, totalCredits: lectures.reduce((s, l) => s + l.crdt, 0) }
})

// GRD-03
on('GET', '/api/me/grades', (c) => gradeReport(student(c).usrNo))

// LEC-01~04
on('GET', '/api/teaching/lectures', (c) => {
  const me = auth(c)
  const semNo = num(c.query.semNo) ?? currentSemNo()
  const sem =
    db.semesters.find((s) => s.semNo === semNo) ??
    fail(404, 'SEMESTER_NOT_FOUND', '학기를 찾을 수 없습니다.')
  return {
    semNo,
    yr: sem.yr,
    semType: sem.semType,
    lectures: db.lectures
      .filter(
        (l) => l.semNo === semNo && (l.profNo === me.usrNo || l.assistants.includes(me.usrNo)),
      )
      .map((l) => {
        const r = toLectureResponse(l)
        return {
          lecNo: r.lecNo,
          crsCd: r.crsCd,
          crsNm: r.crsNm,
          sectNo: r.sectNo,
          cap: r.cap,
          enrlCnt: r.enrlCnt,
          lecStat: r.lecStat,
          timeSlots: r.timeSlots,
        }
      }),
  }
})
on('GET', '/api/teaching/lectures/{lecNo}/students', (c) => {
  const l = teaching(c)
  return {
    lecNo: l.lecNo,
    students: enrolledOf(l.lecNo)
      .map((e) => toTeachingStudent(e.stdNo))
      .sort((a, b) => a.stdNo.localeCompare(b.stdNo)),
  }
})
function planOf(l: DbLecture): LecturePlanResponse {
  const c = courseOf(l)
  return {
    lecNo: l.lecNo,
    crsCd: l.crsCd,
    crsNm: c.crsNm,
    sectNo: l.sectNo,
    evalType: c.evalType,
    hasPlanFile: l.hasPlan,
    weights: c.evalType === 'PASS_FAIL' ? null : l.weights,
    deadline: semSchedules(l.semNo).find((s) => s.schdType === 'CART')?.startDtm ?? null,
    // 목에서는 확인하기 쉽게 폐강만 아니면 고칠 수 있게 둔다
    editable: l.lecStat === 'OPEN',
  }
}
on('GET', '/api/teaching/lectures/{lecNo}/plan', (c) => planOf(teaching(c)))
on('PUT', '/api/teaching/lectures/{lecNo}/plan/file', (c) => {
  const l = teaching(c)
  const file = (c.body as FormData).get('file')
  if (!(file instanceof Blob)) fail(400, 'INVALID_PLAN_FILE', '계획서 파일이 없습니다.')
  planFiles.set(l.lecNo, file as Blob)
  l.hasPlan = true
  return planOf(l)
})
on('PUT', '/api/teaching/lectures/{lecNo}/plan/weights', (c) => {
  const l = teaching(c)
  const w = body<PlanWeights>(c)
  if (w.midWt + w.finWt + w.hwWt + w.attWt !== 100)
    fail(400, 'INVALID_WEIGHTS', '반영 비율의 합은 100 이어야 합니다.')
  l.weights = w
  return planOf(l)
})
const assistantsOf = (l: DbLecture) => ({
  lecNo: l.lecNo,
  assistants: l.assistants.map(toTeachingStudent),
})
on('GET', '/api/teaching/lectures/{lecNo}/assistants', (c) => assistantsOf(teaching(c, true)))
on('POST', '/api/teaching/lectures/{lecNo}/assistants', (c) => {
  const l = teaching(c, true)
  const { stdNo } = body<{ stdNo: string }>(c)
  if (findUser(stdNo)?.role !== 'STUDENT') fail(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.')
  if (l.assistants.includes(stdNo)) fail(409, 'DUPLICATE_ASSISTANT', '이미 지정된 조교입니다.')
  l.assistants.push(stdNo)
  return assistantsOf(l)
})
on('DELETE', '/api/teaching/lectures/{lecNo}/assistants/{stdNo}', (c) => {
  const l = teaching(c, true)
  l.assistants = l.assistants.filter((n) => n !== c.params[1])
  return assistantsOf(l)
})

// GRD-01
const gradeEditable = (l: DbLecture) => {
  if (!periodOpen(l.semNo, 'GRADE')) fail(409, 'GRADE_PERIOD_CLOSED', '성적 입력 기간이 아닙니다.')
  if (l.grdStat === 'CONFIRMED') fail(409, 'GRADE_CONFIRMED', '확정된 성적은 고칠 수 없습니다.')
}
on('GET', '/api/teaching/lectures/{lecNo}/grades', (c) => gradeSheet(teaching(c)))
on('PUT', '/api/teaching/lectures/{lecNo}/grades', (c) => {
  const l = teaching(c)
  gradeEditable(l)
  for (const g of body<{ grades: GradeInput[] }>(c).grades) {
    const e = db.enrollments.find((x) => x.stdNo === g.stdNo && x.lecNo === l.lecNo)
    if (e)
      Object.assign(e, { midScr: g.midScr, finScr: g.finScr, hwScr: g.hwScr, attScr: g.attScr })
  }
  l.grdStat = 'ENTERING'
  return gradeSheet(l)
})
on('PUT', '/api/teaching/lectures/{lecNo}/grades/counts', (c) => {
  const l = teaching(c)
  gradeEditable(l)
  const { aCnt, abCnt } = body<{ aCnt: number | null; abCnt: number | null }>(c)
  l.aCnt = aCnt
  l.abCnt = abCnt
  return gradeSheet(l)
})
on('POST', '/api/teaching/lectures/{lecNo}/grades/submit', (c) => {
  const l = teaching(c)
  gradeEditable(l)
  if (gradeSheet(l).students.some((s) => !s.entered))
    fail(409, 'GRADES_INCOMPLETE', '입력하지 않은 성적이 있습니다.')
  l.grdStat = 'SUBMITTED'
  return gradeSheet(l)
})

// ACA-04
on('GET', '/api/admin/dashboard', (c) => {
  admin(c)
  const semNo = num(c.query.semNo) ?? registrationSemNo() ?? currentSemNo()
  const lecs = db.lectures.filter((l) => l.semNo === semNo && l.lecStat === 'OPEN')
  return {
    semNo,
    openLectureCount: lecs.length,
    fullLectures: lecs
      .map(toLectureResponse)
      .filter((l) => l.enrlCnt >= l.cap)
      .map((l) => ({
        lecNo: l.lecNo,
        crsNm: l.crsNm,
        sectNo: l.sectNo,
        profNm: l.profNm,
        cap: l.cap,
        enrlCnt: l.enrlCnt,
      })),
    unassignedLectureCount: lecs.filter((l) =>
      l.timeSlots.some((t) => t.clsType === 'OFFLINE' && !t.roomCd),
    ).length,
    missingPlanLectures: lecs
      .filter((l) => !l.hasPlan || (courseOf(l).evalType === 'GRADE' && !l.weights))
      .map((l) => {
        const p = findUser(l.profNo)
        return {
          lecNo: l.lecNo,
          crsNm: courseOf(l).crsNm,
          sectNo: l.sectNo,
          profNo: l.profNo,
          profNm: p?.usrNm ?? '',
          profEmail: p?.email ?? null,
          noPlanFile: !l.hasPlan,
          noWeights: courseOf(l).evalType === 'GRADE' && !l.weights,
        }
      }),
  }
})

// USR-02
on('GET', '/api/admin/users', (c) => {
  admin(c)
  const { keyword, role } = c.query
  return db.users
    .filter(
      (u) =>
        (!role || u.role === role) &&
        (!keyword || u.usrNm.includes(keyword) || u.usrNo.includes(keyword)),
    )
    .map(toUser)
})
on('POST', '/api/admin/users', (c) => {
  admin(c)
  const f = body<UserCreateRequest>(c)
  if (findUser(f.usrNo)) fail(409, 'DUPLICATE_USER_NO', '이미 사용 중인 로그인 ID입니다.')
  if (!f.deptNo) fail(400, 'INVALID_INPUT', 'deptNo: 널이어서는 안됩니다')
  const u: DbUser = { ...f, acctStat: 'ACTIVE', deptNm: deptNm(f.deptNo) }
  db.users.push(u)
  return toUser(u)
})
on('PUT', '/api/admin/users/{usrNo}', (c) => {
  admin(c)
  const u = findUser(c.params[0]) ?? fail(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.')
  const f = body<UserUpdateRequest>(c)
  Object.assign(u, f, { deptNm: deptNm(f.deptNo) })
  return toUser(u)
})
on('PATCH', '/api/admin/users/{usrNo}/password', (c) => {
  admin(c)
  const u = findUser(c.params[0]) ?? fail(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.')
  u.password = body<{ newPassword: string }>(c).newPassword
})
on('PATCH', '/api/admin/users/{usrNo}/deactivate', (c) => {
  admin(c)
  const u = findUser(c.params[0]) ?? fail(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.')
  u.acctStat = 'INACTIVE'
  return toUser(u)
})

// ACA-01
on('POST', '/api/admin/semesters', (c) => {
  admin(c)
  const { yr, semType } = body<SemesterRequest>(c)
  if (db.semesters.some((s) => s.yr === yr && s.semType === semType))
    fail(409, 'DUPLICATE_SEMESTER', '이미 등록된 학기입니다.')
  const s = {
    semNo: Math.max(0, ...db.semesters.map((x) => x.semNo)) + 1,
    yr,
    semType,
    regular: semType === 'FIRST' || semType === 'SECOND',
    current: false,
  }
  db.semesters.push(s)
  const order = ['FIRST', 'SUMMER', 'SECOND', 'WINTER']
  db.semesters.sort((a, b) => a.yr - b.yr || order.indexOf(a.semType) - order.indexOf(b.semType))
  return s
})
on('PUT', '/api/admin/semesters/{semNo}', (c) => {
  admin(c)
  const s =
    db.semesters.find((x) => x.semNo === Number(c.params[0])) ??
    fail(404, 'SEMESTER_NOT_FOUND', '학기를 찾을 수 없습니다.')
  const { yr, semType } = body<SemesterRequest>(c)
  Object.assign(s, { yr, semType, regular: semType === 'FIRST' || semType === 'SECOND' })
  return s
})
on('PUT', '/api/admin/semesters/{semNo}/current', (c) => {
  admin(c)
  for (const s of db.semesters) s.current = s.semNo === Number(c.params[0])
  return db.semesters.find((s) => s.current)
})
on('POST', '/api/admin/semesters/{semNo}/schedules', (c) => {
  admin(c)
  const f = body<ScheduleRequest>(c)
  if (!f.startDtm || !f.endDtm) fail(400, 'INVALID_INPUT', 'startDtm: 널이어서는 안됩니다')
  const s = { ...f, schdNo: ++db.seq, semNo: Number(c.params[0]) }
  db.schedules.push(s)
  return s
})
on('DELETE', '/api/admin/schedules/{schdNo}', (c) => {
  admin(c)
  const s =
    db.schedules.find((x) => x.schdNo === Number(c.params[0])) ??
    fail(404, 'SCHEDULE_NOT_FOUND', '학사일정을 찾을 수 없습니다.')
  if (new Date(s.startDtm) <= now())
    fail(409, 'SCHEDULE_STARTED', '이미 시작된 일정은 삭제할 수 없습니다.')
  db.schedules = db.schedules.filter((x) => x !== s)
})
on('GET', '/api/admin/semesters/{semNo}/max-credits', (c) => {
  admin(c)
  return db.maxCredits[Number(c.params[0])] ?? []
})
on('POST', '/api/admin/semesters/{semNo}/max-credits', (c) => {
  admin(c)
  const semNo = Number(c.params[0])
  const sem = db.semesters.find((s) => s.semNo === semNo)!
  const rows: MaxCreditItem[] = db.users
    .filter((u) => u.role === 'STUDENT' && u.stdStat !== 'GRADUATED')
    .map((u) => {
      const gpa = gradeReport(u.usrNo).cumulativeGpa
      return {
        stdNo: u.usrNo,
        usrNm: u.usrNm,
        yrLvl: u.yrLvl ?? 1,
        stdStat: u.stdStat ?? 'ATTENDING',
        maxCrdt: sem.regular
          ? gpa != null && gpa >= 4.0
            ? 21
            : 18
          : u.stdStat === 'ON_LEAVE'
            ? 3
            : 6,
      }
    })
  db.maxCredits[semNo] = rows
  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.maxCrdt] = (counts[r.maxCrdt] ?? 0) + 1
  return { semNo, regular: sem.regular, graduated: 0, counts }
})

// ACA-02
on('GET', '/api/admin/courses', (c) => (admin(c), db.courses))
on('POST', '/api/admin/courses', (c) => {
  admin(c)
  const f = body<CourseCreateRequest>(c)
  if (!/^\d{7}$/.test(f.crsCd)) fail(400, 'INVALID_INPUT', 'crsCd: 숫자 7자리여야 합니다.')
  if (findCourse(f.crsCd)) fail(409, 'DUPLICATE_COURSE_CODE', '이미 등록된 과목코드입니다.')
  const course = {
    ...f,
    deptNm: deptNm(f.deptNo),
    prerequisites: f.prerequisites.map((p) => ({
      ...p,
      prereqCrsNm: findCourse(p.prereqCrsCd)?.crsNm ?? '',
    })),
  }
  db.courses.push(course)
  return course
})
on('PUT', '/api/admin/courses/{crsCd}', (c) => {
  admin(c)
  const course =
    findCourse(c.params[0]) ?? fail(404, 'COURSE_NOT_FOUND', '과목을 찾을 수 없습니다.')
  const f = body<CourseUpdateRequest>(c)
  Object.assign(course, f, { deptNm: deptNm(f.deptNo) })
  return course
})
on('PUT', '/api/admin/courses/{crsCd}/prerequisites', (c) => {
  admin(c)
  const course =
    findCourse(c.params[0]) ?? fail(404, 'COURSE_NOT_FOUND', '과목을 찾을 수 없습니다.')
  const list = body<{ prerequisites: PrerequisiteRequest[] }>(c).prerequisites
  if (list.some((p) => p.prereqCrsCd === course.crsCd))
    fail(409, 'PREREQUISITE_SELF', '자기 자신을 선수과목으로 지정할 수 없습니다.')
  course.prerequisites = list.map((p) => ({
    ...p,
    prereqCrsNm: findCourse(p.prereqCrsCd)?.crsNm ?? '',
  }))
  return course
})

// ACA-03
on('GET', '/api/admin/lectures', (c) => {
  admin(c)
  const semNo = num(c.query.semNo) ?? fail(400, 'INVALID_INPUT', 'semNo 가 필요합니다.')
  return db.lectures.filter((l) => l.semNo === semNo).map(toLectureResponse)
})
on('POST', '/api/admin/lectures', (c) => {
  admin(c)
  const f = body<LectureCreateRequest>(c)
  if (!findCourse(f.crsCd)) fail(404, 'COURSE_NOT_FOUND', '과목을 찾을 수 없습니다.')
  if (findUser(f.profNo)?.role !== 'PROFESSOR')
    fail(404, 'PROFESSOR_NOT_FOUND', '담당할 수 있는 교수가 아닙니다.')
  if (db.lectures.some((l) => l.semNo === f.semNo && l.crsCd === f.crsCd && l.sectNo === f.sectNo))
    fail(409, 'DUPLICATE_SECTION', '같은 학기·과목에 이미 있는 분반입니다.')
  const l: DbLecture = {
    ...f,
    lecNo: Math.max(0, ...db.lectures.map((x) => x.lecNo)) + 1,
    lecStat: 'OPEN',
    grdStat: 'NOT_ENTERED',
    hasPlan: false,
    weights: null,
    assistants: [],
    aCnt: null,
    abCnt: null,
    cnfmDtm: null,
  }
  db.lectures.push(l)
  return toLectureResponse(l)
})
on('PUT', '/api/admin/lectures/{lecNo}', (c) => {
  admin(c)
  const l = findLecture(Number(c.params[0]))
  Object.assign(l, body<LectureUpdateRequest>(c))
  return toLectureResponse(l)
})
on('PATCH', '/api/admin/lectures/{lecNo}/close', (c) => {
  admin(c)
  const l = findLecture(Number(c.params[0]))
  l.lecStat = 'CLOSED'
  db.enrollments = db.enrollments.filter((e) => e.lecNo !== l.lecNo)
  db.cart = db.cart.filter((x) => x.lecNo !== l.lecNo)
  return toLectureResponse(l)
})

// REG-05
function enrollmentStatus(lecNo: number): EnrollmentStatusResponse {
  const l = findLecture(lecNo)
  const list = enrolledOf(lecNo)
  return {
    lecNo,
    cap: l.cap,
    enrlCnt: list.length,
    remaining: l.cap - list.length,
    students: list.map((e) => {
      const u = findUser(e.stdNo)
      return {
        stdNo: e.stdNo,
        stdNm: u?.usrNm ?? '',
        yrLvl: u?.yrLvl ?? 0,
        retake: e.retake,
        procType: e.procType,
        enrlDtm: e.enrlDtm,
      }
    }),
  }
}
on(
  'GET',
  '/api/admin/lectures/{lecNo}/enrollments',
  (c) => (admin(c), enrollmentStatus(Number(c.params[0]))),
)
on('POST', '/api/admin/lectures/{lecNo}/enrollments', (c) => {
  admin(c)
  const { stdNo } = body<{ stdNo: string }>(c)
  if (findUser(stdNo)?.role !== 'STUDENT') fail(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.')
  doEnroll(stdNo, Number(c.params[0]), 'ADMIN')
  return enrollmentStatus(Number(c.params[0]))
})
on('DELETE', '/api/admin/lectures/{lecNo}/enrollments/{stdNo}', (c) => {
  admin(c)
  const lecNo = Number(c.params[0])
  db.enrollments = db.enrollments.filter((e) => !(e.lecNo === lecNo && e.stdNo === c.params[1]))
})

// GRD-02
on('GET', '/api/admin/grades', (c) => {
  admin(c)
  const semNo = num(c.query.semNo) ?? currentSemNo()
  const sem =
    db.semesters.find((s) => s.semNo === semNo) ??
    fail(404, 'SEMESTER_NOT_FOUND', '학기를 찾을 수 없습니다.')
  const lecs = db.lectures.filter((l) => l.semNo === semNo && l.lecStat === 'OPEN')
  const counts: Partial<Record<GrdStat, number>> = {}
  for (const l of lecs) counts[l.grdStat] = (counts[l.grdStat] ?? 0) + 1
  return {
    semNo,
    yr: sem.yr,
    semType: sem.semType,
    gradeEnd: semSchedules(semNo).find((s) => s.schdType === 'GRADE')?.endDtm ?? null,
    // 목에서는 확인하기 쉽게 언제든 확정할 수 있게 둔다
    confirmable: true,
    counts,
    lectures: lecs
      .filter((l) => !c.query.grdStat || l.grdStat === c.query.grdStat)
      .map((l) => {
        const p = findUser(l.profNo)
        return {
          lecNo: l.lecNo,
          crsCd: l.crsCd,
          crsNm: courseOf(l).crsNm,
          sectNo: l.sectNo,
          profNo: l.profNo,
          profNm: p?.usrNm ?? '',
          profEmail: p?.email ?? null,
          enrlCnt: enrolledOf(l.lecNo).length,
          grdStat: l.grdStat,
          cnfmDtm: l.cnfmDtm,
        }
      }),
  }
})
on('POST', '/api/admin/grades/confirm', (c) => {
  admin(c)
  const { lecNos } = body<{ lecNos: number[] }>(c)
  const lecs = lecNos.map(findLecture)
  if (lecs.some((l) => l.grdStat !== 'SUBMITTED'))
    fail(409, 'GRADE_NOT_SUBMITTED', '제출된 성적만 확정할 수 있습니다.')
  for (const l of lecs) {
    l.grdStat = 'CONFIRMED'
    l.cnfmDtm = nowLocal()
  }
  return {
    confirmed: lecs.map((l) => ({
      lecNo: l.lecNo,
      crsNm: courseOf(l).crsNm,
      grdStat: l.grdStat,
      cnfmDtm: l.cnfmDtm,
    })),
  }
})

/* ---------- 진입점 ---------- */

export async function mockRequest<T>(
  method: string,
  path: string,
  opts: { query?: Record<string, unknown>; body?: unknown },
): Promise<T> {
  await new Promise((r) => setTimeout(r, 120))
  const token = tokenStore.get()
  const me = token?.startsWith('mock-') ? findUser(token.slice(5)) : undefined
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(opts.query ?? {}))
    if (v !== undefined && v !== null && v !== '') query[k] = String(v)

  for (const [m, re, h] of routes) {
    const match = m === method && path.match(re)
    if (!match) continue
    const result = h({ params: match.slice(1), query, body: opts.body, me })
    if (method !== 'GET') save()
    // 응답을 복사해서 화면이 목 DB 객체를 직접 건드리지 않게 한다
    return (result === undefined ? undefined : structuredClone(result)) as T
  }
  return fail(404, 'NOT_FOUND', `목 서버에 없는 경로입니다: ${method} ${path}`)
}

/** 계획서 내려받기. 올린 파일이 없으면 빈 PDF 를 만든다 */
export async function mockBlob(path: string): Promise<Blob> {
  const m = path.match(/^\/api\/lectures\/(\d+)\/plan$/)
  if (!m) return fail(404, 'NOT_FOUND', '파일이 없습니다.')
  const l = findLecture(Number(m[1]))
  if (!l.hasPlan) return fail(404, 'PLAN_NOT_FOUND', '등록된 강의계획서가 없습니다.')
  const uploaded = planFiles.get(l.lecNo)
  if (uploaded) return uploaded
  const pdf =
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
  return new Blob([pdf], { type: 'application/pdf' })
}
