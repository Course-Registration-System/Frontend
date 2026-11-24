// 개발용 목 데이터. `npm run dev:mock` 일 때만 쓰이고 실제 빌드에는 포함되지 않는다.
// 계정 번호와 비밀번호(test1234!)는 백엔드 개발 시드와 맞췄다.
import type {
  CourseResponse,
  MaxCreditItem,
  PlanWeights,
  ProcType,
  ScheduleResponse,
  SemesterResponse,
  TimeSlotRequest,
  UserResponse,
  GrdStat,
  LecStat,
} from '../types'

export const DB_VERSION = 2
export const PASSWORD = 'test1234!'

export type DbUser = UserResponse & { password: string }

export interface DbLecture {
  lecNo: number
  crsCd: string
  semNo: number
  profNo: string
  sectNo: number
  cap: number
  lecStat: LecStat
  engLec: boolean
  relGrdExmp: boolean
  timeSlots: TimeSlotRequest[]
  grdStat: GrdStat
  hasPlan: boolean
  weights: PlanWeights | null
  assistants: string[]
  aCnt: number | null
  abCnt: number | null
  cnfmDtm: string | null
}

export interface DbEnrollment {
  stdNo: string
  lecNo: number
  enrlDtm: string
  retake: boolean
  procType: ProcType
  midScr: number | null
  finScr: number | null
  hwScr: number | null
  attScr: number | null
}

export interface Db {
  version: number
  users: DbUser[]
  semesters: SemesterResponse[]
  schedules: ScheduleResponse[]
  maxCredits: Record<number, MaxCreditItem[]>
  courses: CourseResponse[]
  lectures: DbLecture[]
  enrollments: DbEnrollment[]
  cart: { stdNo: string; lecNo: number; addedAt: string }[]
  seq: number
}

/** LocalDateTime 형식, 오늘 기준 days 일 뒤 */
const at = (days: number, hm: string) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${hm}:00`
}

const slot = (
  dow: TimeSlotRequest['dow'],
  startTm: string,
  endTm: string,
  roomCd: string | null,
  clsType: TimeSlotRequest['clsType'] = 'OFFLINE',
): TimeSlotRequest => ({ dow, startTm, endTm, clsType, roomCd })

const DEPT: Record<number, string> = { 101: '컴퓨터학부', 102: '경영학부', 103: '교양교육원' }

const user = (
  usrNo: string,
  usrNm: string,
  role: UserResponse['role'],
  deptNo: number,
  extra: Partial<DbUser> = {},
): DbUser => ({
  usrNo,
  usrNm,
  email: `${usrNo}@example.ac.kr`,
  role,
  acctStat: 'ACTIVE',
  deptNo,
  deptNm: DEPT[deptNo],
  yrLvl: null,
  stdStat: null,
  office: null,
  password: PASSWORD,
  ...extra,
})
const student = (no: string, nm: string, deptNo: number, yrLvl: number, stdStat = 'ATTENDING') =>
  user(no, nm, 'STUDENT', deptNo, { yrLvl, stdStat: stdStat as DbUser['stdStat'] })

const W: PlanWeights = { midWt: 30, finWt: 40, hwWt: 20, attWt: 10 }

const course = (
  crsCd: string,
  crsNm: string,
  deptNo: number,
  crdt: number,
  cmplType: CourseResponse['cmplType'],
  rcmdYrLvl: number | null,
  extra: Partial<CourseResponse> = {},
): CourseResponse => ({
  crsCd,
  crsNm,
  deptNo,
  deptNm: DEPT[deptNo],
  crdt,
  cmplType,
  evalType: 'GRADE',
  rcmdYrLvl,
  prerequisites: [],
  ...extra,
})

export function createSeed(): Db {
  const lecture = (
    lecNo: number,
    semNo: number,
    crsCd: string,
    sectNo: number,
    profNo: string,
    cap: number,
    timeSlots: TimeSlotRequest[],
    extra: Partial<DbLecture> = {},
  ): DbLecture => ({
    lecNo,
    crsCd,
    semNo,
    profNo,
    sectNo,
    cap,
    lecStat: 'OPEN',
    engLec: false,
    relGrdExmp: false,
    timeSlots,
    grdStat: 'NOT_ENTERED',
    hasPlan: true,
    weights: W,
    assistants: [],
    aCnt: null,
    abCnt: null,
    cnfmDtm: null,
    ...extra,
  })
  const enroll = (
    stdNo: string,
    lecNo: number,
    scores: (number | null)[] | null = null,
    extra: Partial<DbEnrollment> = {},
  ): DbEnrollment => ({
    stdNo,
    lecNo,
    enrlDtm: at(-2, '10:05'),
    retake: false,
    procType: 'STUDENT',
    midScr: scores?.[0] ?? null,
    finScr: scores?.[1] ?? null,
    hwScr: scores?.[2] ?? null,
    attScr: scores?.[3] ?? null,
    ...extra,
  })

  return {
    version: DB_VERSION,
    users: [
      user('9001', '관리자', 'ADMIN', 101),
      user('100001', '김정훈', 'PROFESSOR', 101, { office: '정보관 501호' }),
      user('100002', '이수진', 'PROFESSOR', 101, { office: '정보관 502호' }),
      user('100005', '정다은', 'PROFESSOR', 103, { office: '본관 301호' }),
      student('20230001', '강민준', 101, 4),
      student('20230003', '윤서연', 101, 4, 'ON_LEAVE'),
      student('20240001', '박지호', 101, 3),
      student('20240003', '최하은', 101, 3),
      student('20240005', '한도윤', 102, 3),
      student('20250001', '오시우', 101, 2),
      student('20260001', '문서윤', 101, 1),
    ],
    // 7: 지난 학기(성적 확정), 9: 현재 학기(성적 입력 기간), 11: 신청 대상 학기(수강신청 기간)
    semesters: [
      { semNo: 7, yr: 2026, semType: 'FIRST', regular: true, current: false },
      { semNo: 9, yr: 2026, semType: 'SECOND', regular: true, current: true },
      { semNo: 11, yr: 2027, semType: 'FIRST', regular: true, current: false },
    ],
    schedules: [
      {
        schdNo: 1,
        semNo: 9,
        schdType: 'CART',
        tgtYrLvl: null,
        startDtm: at(-120, '10:00'),
        endDtm: at(-117, '17:00'),
      },
      {
        schdNo: 2,
        semNo: 9,
        schdType: 'ENROLL',
        tgtYrLvl: null,
        startDtm: at(-115, '10:00'),
        endDtm: at(-112, '17:00'),
      },
      {
        schdNo: 3,
        semNo: 9,
        schdType: 'ADJUST',
        tgtYrLvl: null,
        startDtm: at(-100, '10:00'),
        endDtm: at(-95, '17:00'),
      },
      {
        schdNo: 4,
        semNo: 9,
        schdType: 'GRADE',
        tgtYrLvl: null,
        startDtm: at(-1, '09:00'),
        endDtm: at(5, '17:00'),
      },
      {
        schdNo: 5,
        semNo: 11,
        schdType: 'CART',
        tgtYrLvl: null,
        startDtm: at(-5, '10:00'),
        endDtm: at(-2, '17:00'),
      },
      {
        schdNo: 6,
        semNo: 11,
        schdType: 'ENROLL',
        tgtYrLvl: null,
        startDtm: at(-1, '10:00'),
        endDtm: at(3, '17:00'),
      },
      {
        schdNo: 7,
        semNo: 11,
        schdType: 'ADJUST',
        tgtYrLvl: null,
        startDtm: at(7, '10:00'),
        endDtm: at(10, '17:00'),
      },
    ],
    maxCredits: {},
    courses: [
      course('1010001', '프로그래밍기초', 101, 3, 'MAJOR_BASIC', 1),
      course('1010007', '자료구조', 101, 3, 'MAJOR_REQ', 2, {
        prerequisites: [{ prereqCrsCd: '1010001', prereqCrsNm: '프로그래밍기초', minReqGrd: 'D-' }],
      }),
      course('1010010', '운영체제', 101, 3, 'MAJOR_REQ', 2),
      course('1010015', '데이터베이스', 101, 3, 'MAJOR_ELEC', 3),
      course('1010020', '캡스톤디자인', 101, 3, 'MAJOR_REQ', 4),
      course('1020003', '경영학원론', 102, 3, 'MAJOR_BASIC', 1),
      course('1030001', '글쓰기', 103, 2, 'GEN_REQ', null),
      course('1030009', '채플', 103, 0.5, 'CHAPEL', null, { evalType: 'PASS_FAIL' }),
    ],
    lectures: [
      // 지난 학기
      lecture(1, 7, '1010001', 1, '100001', 40, [slot('TUE', '09:00', '10:15', '21301')], {
        grdStat: 'CONFIRMED',
        cnfmDtm: at(-150, '12:00'),
      }),
      lecture(2, 7, '1030001', 1, '100005', 30, [slot('FRI', '09:00', '10:50', '21302')], {
        grdStat: 'CONFIRMED',
        cnfmDtm: at(-150, '12:00'),
      }),
      // 현재 학기 (성적 입력 기간)
      lecture(
        3,
        9,
        '1010010',
        1,
        '100001',
        40,
        [slot('MON', '10:30', '11:45', '21301'), slot('WED', '10:30', '11:45', '21301')],
        { assistants: ['20240005'], grdStat: 'ENTERING' },
      ),
      lecture(
        4,
        9,
        '1010015',
        1,
        '100002',
        35,
        [slot('TUE', '13:30', '14:45', '21302'), slot('THU', '13:30', '14:45', null, 'ONLINE')],
        { grdStat: 'SUBMITTED' },
      ),
      lecture(5, 9, '1030009', 1, '100005', 300, [slot('WED', '12:00', '12:50', '01101')], {
        weights: null,
      }),
      // 신청 대상 학기
      lecture(6, 11, '1010007', 1, '100001', 40, [
        slot('MON', '09:00', '10:15', '21301'),
        slot('WED', '09:00', '10:15', '21301'),
      ]),
      lecture(7, 11, '1010007', 2, '100002', 40, [
        slot('TUE', '10:30', '11:45', '21302'),
        slot('THU', '10:30', '11:45', '21302'),
      ]),
      lecture(
        8,
        11,
        '1010015',
        1,
        '100002',
        35,
        [slot('TUE', '15:00', '16:15', null, 'ONLINE'), slot('THU', '15:00', '16:15', '21303')],
        { engLec: true },
      ),
      lecture(9, 11, '1010020', 1, '100001', 2, [slot('FRI', '13:00', '15:45', null)], {
        hasPlan: false,
        weights: null,
      }),
      lecture(10, 11, '1020003', 1, '100005', 30, [
        slot('MON', '15:00', '16:15', '06101'),
        slot('WED', '15:00', '16:15', '06101'),
      ]),
      lecture(11, 11, '1030001', 1, '100005', 25, [slot('FRI', '09:00', '10:50', '21302')]),
      lecture(12, 11, '1030009', 1, '100005', 300, [slot('WED', '12:00', '12:50', '01101')], {
        weights: null,
      }),
    ],
    enrollments: [
      enroll('20240001', 1, [88, 92, 95, 100]),
      enroll('20240001', 2, [75, 80, 85, 90]),
      enroll('20240001', 3, [82, 77, null, 100]),
      enroll('20240003', 3, [91, 88, 90, 100]),
      enroll('20250001', 3),
      enroll('20240001', 4, [70, 72, 80, 90]),
      enroll('20240003', 4, [95, 97, 100, 100]),
      enroll('20260001', 5),
      enroll('20230001', 9),
      enroll('20250001', 9, null, { procType: 'ADMIN' }),
      enroll('20240003', 6),
    ],
    cart: [{ stdNo: '20240001', lecNo: 8, addedAt: at(-4, '11:20') }],
    seq: 100,
  }
}
