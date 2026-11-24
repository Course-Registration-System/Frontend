// 목 서버용 인메모리 DB와 시드 데이터. 백엔드 연동 후에는 쓰지 않는다.
import type {
  Course,
  GradeStatus,
  LectureStatus,
  LectureTime,
  LetterGrade,
  MaxCreditRow,
  Ratios,
  Schedule,
  Scores,
  Semester,
  User,
} from '../types'

export interface DbUser extends User {
  password: string
}

export interface DbLecture {
  lecNo: number
  semesterId: string
  courseCode: string
  section: string
  professorNo: string
  capacity: number
  isEnglish: boolean
  excludeRelative: boolean
  times: LectureTime[]
  status: LectureStatus
  gradeStatus: GradeStatus
  syllabusUrl: string | null
  ratios: Ratios | null
  assistants: string[]
}

export interface DbEnrollment {
  id: number
  studentNo: string
  lecNo: number
  status: 'ENROLLED' | 'CANCELLED'
  isRetake: boolean
  scores: Scores
  pf: 'P' | 'F' | null
  letter: LetterGrade | null
}

export interface Db {
  version: number
  today: string
  seq: number
  users: DbUser[]
  semesters: Semester[]
  schedules: Record<string, Schedule[]>
  courses: Course[]
  lectures: DbLecture[]
  cart: { studentNo: string; lecNo: number }[]
  enrollments: DbEnrollment[]
  maxCredits: Record<string, MaxCreditRow[]>
}

export const DB_VERSION = 1
export const SAMPLE_PDF = '/sample-syllabus.pdf'

const EMPTY_SCORES: Scores = { midterm: null, final: null, assignment: null, attendance: null }

const t = (day: LectureTime['day'], s: number, e: number, room: string): LectureTime => ({
  day,
  startPeriod: s,
  endPeriod: e,
  room,
})

export function createSeed(): Db {
  const users: DbUser[] = [
    { userNo: 'A0001', name: '관리자', role: 'ADMIN', active: true, password: '1234' },
    {
      userNo: 'P1001',
      name: '김지훈',
      role: 'PROFESSOR',
      active: true,
      deptName: '컴퓨터공학과',
      email: 'jhkim@univ.ac.kr',
      password: '1234',
    },
    {
      userNo: 'P1002',
      name: '이수진',
      role: 'PROFESSOR',
      active: true,
      deptName: '컴퓨터공학과',
      email: 'sjlee@univ.ac.kr',
      password: '1234',
    },
    {
      userNo: 'P1003',
      name: '박성호',
      role: 'PROFESSOR',
      active: true,
      deptName: '경영학과',
      email: 'shpark@univ.ac.kr',
      password: '1234',
    },
    {
      userNo: 'P1004',
      name: '최은영',
      role: 'PROFESSOR',
      active: true,
      deptName: '교양학부',
      email: 'eychoi@univ.ac.kr',
      password: '1234',
    },
    student('20230001', '홍길동', '컴퓨터공학과', 3),
    student('20240002', '김철수', '컴퓨터공학과', 2),
    student('20220003', '이영희', '경영학과', 4),
    student('20250004', '박민수', '컴퓨터공학과', 1),
    { ...student('20190099', '정휴학', '경영학과', 4), active: false },
  ]
  const extraNames = [
    '강서준',
    '윤하은',
    '장도윤',
    '임지아',
    '한시우',
    '오서연',
    '서지호',
    '신하린',
    '권준우',
    '황예린',
    '안건우',
    '송채원',
    '전민재',
    '홍수아',
    '유태윤',
    '고은서',
    '문현우',
    '양지유',
    '손우진',
    '배소율',
  ]
  const extras = extraNames.map((name, i) =>
    student(`2023${String(10 + i).padStart(4, '0')}`, name, '컴퓨터공학과', 3),
  )
  users.push(...extras)

  const semesters: Semester[] = [
    { id: '2025-1', year: 2025, term: '1', current: false },
    { id: '2025-2', year: 2025, term: '2', current: false },
    { id: '2026-1', year: 2026, term: '1', current: false },
    { id: '2026-2', year: 2026, term: '2', current: true },
  ]
  const all = [1, 2, 3, 4]
  const schedules: Record<string, Schedule[]> = {
    '2026-2': [
      { type: 'CART', startDate: '2026-08-03', endDate: '2026-08-07', targetGrades: all },
      { type: 'REGISTER', startDate: '2026-08-10', endDate: '2026-08-14', targetGrades: all },
      { type: 'ADJUST', startDate: '2026-09-01', endDate: '2026-09-07', targetGrades: all },
      { type: 'GRADE_INPUT', startDate: '2026-12-14', endDate: '2026-12-24', targetGrades: all },
    ],
  }

  const pre = (courseCode: string, minGrade: LetterGrade) => ({ courseCode, minGrade })
  const courses: Course[] = [
    course('CSE101', '프로그래밍기초', 3, '전공필수', '컴퓨터공학과', 1),
    course('CSE201', '자료구조', 3, '전공필수', '컴퓨터공학과', 2, [pre('CSE101', 'C0')]),
    course('CSE202', '객체지향프로그래밍', 3, '전공선택', '컴퓨터공학과', 2, [pre('CSE101', 'D0')]),
    course('CSE301', '운영체제', 3, '전공선택', '컴퓨터공학과', 3, [pre('CSE201', 'C0')]),
    course('CSE302', '데이터베이스', 3, '전공선택', '컴퓨터공학과', 3),
    course('CSE303', '소프트웨어공학', 3, '전공선택', '컴퓨터공학과', 3),
    course('CSE401', '캡스톤디자인', 3, '전공필수', '컴퓨터공학과', 4),
    course('BUS101', '경영학원론', 3, '전공필수', '경영학과', 1),
    course('BUS301', '마케팅관리', 3, '전공선택', '경영학과', 3),
    course('GEN101', '대학영어', 2, '교양필수', '교양학부', 1),
    course('GEN102', '글쓰기와표현', 2, '교양필수', '교양학부', 1),
    { ...course('GEN201', '사회봉사', 1, '교양선택', '교양학부', 1), gradingType: 'PF' },
    { ...course('CHP101', '채플', 1, '채플', '교양학부', 1), gradingType: 'PF' },
  ]

  const R: Ratios = { midterm: 30, final: 40, assignment: 20, attendance: 10 }
  const lectures: DbLecture[] = [
    // 2026-2 (현재 학기)
    lec(
      101,
      '2026-2',
      'CSE201',
      '01',
      'P1001',
      30,
      [t('MON', 1, 2, '공학관 301'), t('WED', 1, 1, '공학관 301')],
      { ratios: R, syllabusUrl: SAMPLE_PDF },
    ),
    lec(
      102,
      '2026-2',
      'CSE201',
      '02',
      'P1002',
      30,
      [t('TUE', 3, 4, '공학관 302'), t('THU', 3, 3, '공학관 302')],
      { ratios: R },
    ),
    lec(103, '2026-2', 'CSE301', '01', 'P1001', 40, [
      t('TUE', 5, 6, '공학관 401'),
      t('THU', 5, 5, '공학관 401'),
    ]),
    lec(
      104,
      '2026-2',
      'CSE302',
      '01',
      'P1002',
      5,
      [t('WED', 3, 4, '공학관 402'), t('FRI', 3, 3, '공학관 402')],
      { ratios: R, syllabusUrl: SAMPLE_PDF },
    ),
    lec(
      105,
      '2026-2',
      'CSE303',
      '01',
      'P1001',
      35,
      [t('MON', 5, 6, '공학관 501'), t('WED', 5, 5, '공학관 501')],
      { ratios: R, isEnglish: true, assistants: ['20230001'], syllabusUrl: SAMPLE_PDF },
    ),
    lec(106, '2026-2', 'CSE401', '01', 'P1002', 25, [t('FRI', 5, 7, '공학관 601')], {
      ratios: R,
      gradeStatus: 'SUBMITTED',
      excludeRelative: true,
    }),
    lec(
      107,
      '2026-2',
      'CSE202',
      '01',
      'P1002',
      40,
      [t('MON', 3, 4, '공학관 303'), t('WED', 2, 2, '공학관 303')],
      { ratios: R },
    ),
    lec(108, '2026-2', 'GEN102', '01', 'P1004', 50, [t('MON', 1, 2, '인문관 101')], { ratios: R }),
    lec(109, '2026-2', 'GEN201', '01', 'P1004', 30, [t('SAT', 1, 3, '인문관 102')], {
      excludeRelative: true,
    }),
    lec(110, '2026-2', 'CHP101', '01', 'P1004', 300, [t('THU', 7, 7, '대강당')], {
      excludeRelative: true,
    }),
    lec(
      111,
      '2026-2',
      'BUS301',
      '01',
      'P1003',
      40,
      [t('TUE', 1, 2, '경영관 201'), t('THU', 1, 1, '경영관 201')],
      { ratios: R, gradeStatus: 'IN_PROGRESS' },
    ),
    lec(112, '2026-2', 'BUS101', '01', 'P1003', 60, [t('FRI', 1, 2, '경영관 101')], {
      status: 'CLOSED',
    }),
    lec(
      113,
      '2026-2',
      'CSE101',
      '01',
      'P1002',
      60,
      [t('TUE', 7, 8, '공학관 201'), t('FRI', 1, 1, '공학관 201')],
      { ratios: R },
    ),
    // 지난 학기 (성적 확정)
    lec(201, '2025-1', 'CSE101', '01', 'P1002', 60, [t('MON', 1, 2, '공학관 201')], {
      ratios: R,
      gradeStatus: 'CONFIRMED',
    }),
    lec(202, '2025-1', 'GEN101', '01', 'P1004', 50, [t('TUE', 1, 2, '인문관 101')], {
      ratios: R,
      gradeStatus: 'CONFIRMED',
    }),
    lec(203, '2025-1', 'CHP101', '01', 'P1004', 300, [t('THU', 7, 7, '대강당')], {
      gradeStatus: 'CONFIRMED',
    }),
    lec(204, '2025-2', 'CSE201', '01', 'P1001', 30, [t('MON', 1, 2, '공학관 301')], {
      ratios: R,
      gradeStatus: 'CONFIRMED',
    }),
    lec(205, '2025-2', 'GEN102', '01', 'P1004', 50, [t('WED', 1, 2, '인문관 101')], {
      ratios: R,
      gradeStatus: 'CONFIRMED',
    }),
    lec(206, '2026-1', 'CSE202', '01', 'P1002', 40, [t('MON', 3, 4, '공학관 303')], {
      ratios: R,
      gradeStatus: 'CONFIRMED',
    }),
    lec(207, '2026-1', 'CHP101', '01', 'P1004', 300, [t('THU', 7, 7, '대강당')], {
      gradeStatus: 'CONFIRMED',
    }),
    lec(208, '2026-1', 'GEN201', '01', 'P1004', 30, [t('SAT', 1, 3, '인문관 102')], {
      gradeStatus: 'CONFIRMED',
    }),
  ]

  let id = 1
  const enrollments: DbEnrollment[] = []
  const enroll = (studentNo: string, lecNo: number, extra: Partial<DbEnrollment> = {}) =>
    enrollments.push({
      id: id++,
      studentNo,
      lecNo,
      status: 'ENROLLED',
      isRetake: false,
      scores: { ...EMPTY_SCORES },
      pf: null,
      letter: null,
      ...extra,
    })

  // 지난 학기 이력
  const past: [string, number, LetterGrade][] = [
    ['20230001', 201, 'A0'],
    ['20230001', 202, 'B+'],
    ['20230001', 203, 'P'],
    ['20230001', 204, 'C+'],
    ['20230001', 205, 'C0'],
    ['20230001', 206, 'A+'],
    ['20230001', 207, 'P'],
    ['20230001', 208, 'P'],
    ['20240002', 201, 'B0'],
    ['20240002', 202, 'C0'],
    ['20240002', 205, 'A0'],
    ['20240002', 206, 'F'],
    ['20220003', 202, 'A+'],
    ['20220003', 205, 'B+'],
  ]
  for (const [s, l, letter] of past) enroll(s, l, { letter, pf: letter === 'P' ? 'P' : null })

  // 현재 학기
  enroll('20230001', 110)
  extras.forEach((u, i) => {
    enroll(u.userNo, 101)
    if (i < 5) enroll(u.userNo, 104)
    if (i < 12) enroll(u.userNo, 105)
    if (i >= 15) {
      const sc = 70 + i
      enroll(u.userNo, 106, {
        scores: { midterm: sc, final: sc - 5, assignment: 90, attendance: 100 },
      })
    }
    if (i < 8)
      enroll(
        u.userNo,
        111,
        i < 4 ? { scores: { midterm: 80, final: 75, assignment: 85, attendance: 100 } } : {},
      )
  })
  // 제출 상태 강의는 등급까지 계산된 상태로 둔다
  for (const e of enrollments.filter((e) => e.lecNo === 106)) e.letter = 'B+'

  return {
    version: DB_VERSION,
    today: '2026-08-11',
    seq: id,
    users,
    semesters,
    schedules,
    courses,
    lectures,
    cart: [
      { studentNo: '20230001', lecNo: 101 },
      { studentNo: '20230001', lecNo: 108 },
      { studentNo: '20230001', lecNo: 103 },
    ],
    enrollments,
    maxCredits: {},
  }
}

function student(userNo: string, name: string, deptName: string, grade: number): DbUser {
  return {
    userNo,
    name,
    role: 'STUDENT',
    active: true,
    deptName,
    grade,
    email: `${userNo}@univ.ac.kr`,
    password: '1234',
  }
}

function course(
  code: string,
  name: string,
  credits: number,
  category: Course['category'],
  deptName: string,
  targetGrade: number,
  prerequisites: Course['prerequisites'] = [],
): Course {
  return {
    code,
    name,
    credits,
    category,
    deptName,
    targetGrade,
    gradingType: 'GRADE',
    prerequisites,
  }
}

function lec(
  lecNo: number,
  semesterId: string,
  courseCode: string,
  section: string,
  professorNo: string,
  capacity: number,
  times: LectureTime[],
  extra: Partial<DbLecture> = {},
): DbLecture {
  return {
    lecNo,
    semesterId,
    courseCode,
    section,
    professorNo,
    capacity,
    times,
    isEnglish: false,
    excludeRelative: false,
    status: 'OPEN',
    gradeStatus: 'NOT_ENTERED',
    syllabusUrl: null,
    ratios: null,
    assistants: [],
    ...extra,
  }
}
