// 업무별 API 함수. 경로는 제안이며 백엔드 명세가 나오면 맞춘다.
import type {
  AdminEnrollmentStatus,
  Course,
  CurrentPeriod,
  Dashboard,
  Enrollment,
  GradeRow,
  GradeSheet,
  Lecture,
  LectureForm,
  LectureSearchParams,
  MaxCreditRow,
  Ratios,
  RosterStudent,
  Schedule,
  Semester,
  TeachingLectureDetail,
  Term,
  Transcript,
  User,
  UserForm,
} from '../types'
import { request } from './client'

type Q = Record<string, string | undefined>

// USR-01 로그인
export const authApi = {
  login: (userNo: string, password: string) =>
    request<{ token: string; user: User }>('POST', '/api/auth/login', {
      body: { userNo, password },
    }),
  me: () => request<User>('GET', '/api/auth/me'),
  logout: () => request<void>('POST', '/api/auth/logout'),
}

// 공통: 학기와 현재 기간
export const commonApi = {
  semesters: () => request<Semester[]>('GET', '/api/semesters'),
  currentPeriod: () => request<CurrentPeriod>('GET', '/api/periods/current'),
}

// REG-01 강의 검색
export const lectureApi = {
  search: (params: LectureSearchParams) =>
    request<Lecture[]>('GET', '/api/lectures', { query: params as Q }),
}

// REG-02·03·04 학생 수강신청
export const studentApi = {
  cart: (semesterId?: string) =>
    request<Lecture[]>('GET', '/api/me/cart', { query: { semesterId } }),
  addToCart: (lecNo: number) => request<void>('POST', '/api/me/cart', { body: { lecNo } }),
  removeFromCart: (lecNo: number) => request<void>('DELETE', `/api/me/cart/${lecNo}`),
  maxCredits: (semesterId?: string) =>
    request<{ maxCredits: number | null }>('GET', '/api/me/max-credits', {
      query: { semesterId },
    }),
  enrollments: (semesterId?: string) =>
    request<Enrollment[]>('GET', '/api/me/enrollments', { query: { semesterId } }),
  enroll: (lecNo: number) =>
    request<Enrollment>('POST', '/api/me/enrollments', { body: { lecNo } }),
  cancel: (enrollmentId: number) => request<void>('DELETE', `/api/me/enrollments/${enrollmentId}`),
  // GRD-03 성적 조회
  transcript: (semesterId: string) =>
    request<Transcript>('GET', '/api/me/grades', { query: { semesterId } }),
  gradeSemesters: () => request<string[]>('GET', '/api/me/grade-semesters'),
}

// LEC-01~04, GRD-01 교수·조교
export const teachingApi = {
  lectures: (semesterId?: string) =>
    request<Lecture[]>('GET', '/api/teaching/lectures', { query: { semesterId } }),
  detail: (lecNo: number) =>
    request<TeachingLectureDetail>('GET', `/api/teaching/lectures/${lecNo}`),
  students: (lecNo: number) =>
    request<RosterStudent[]>('GET', `/api/teaching/lectures/${lecNo}/students`),
  uploadSyllabus: (lecNo: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<void>('PUT', `/api/teaching/lectures/${lecNo}/syllabus`, { body: fd })
  },
  saveRatios: (lecNo: number, ratios: Ratios) =>
    request<void>('PUT', `/api/teaching/lectures/${lecNo}/ratios`, { body: ratios }),
  assistants: (lecNo: number) =>
    request<RosterStudent[]>('GET', `/api/teaching/lectures/${lecNo}/assistants`),
  findStudent: (studentNo: string) =>
    request<RosterStudent>('GET', `/api/teaching/students/${studentNo}`),
  addAssistant: (lecNo: number, studentNo: string) =>
    request<void>('POST', `/api/teaching/lectures/${lecNo}/assistants`, { body: { studentNo } }),
  removeAssistant: (lecNo: number, studentNo: string) =>
    request<void>('DELETE', `/api/teaching/lectures/${lecNo}/assistants/${studentNo}`),
  gradeSheet: (lecNo: number) =>
    request<GradeSheet>('GET', `/api/teaching/lectures/${lecNo}/grades`),
  saveGrades: (lecNo: number, rows: Pick<GradeRow, 'enrollmentId' | 'scores' | 'pf'>[]) =>
    request<GradeSheet>('PUT', `/api/teaching/lectures/${lecNo}/grades`, { body: rows }),
  submitGrades: (lecNo: number) =>
    request<GradeSheet>('POST', `/api/teaching/lectures/${lecNo}/grades/submit`),
}

// 관리자
export const adminApi = {
  // ACA-04
  dashboard: (semesterId?: string) =>
    request<Dashboard>('GET', '/api/admin/dashboard', { query: { semesterId } }),
  // USR-02
  users: (params: { keyword?: string; role?: string }) =>
    request<User[]>('GET', '/api/admin/users', { query: params }),
  createUser: (form: UserForm) => request<User>('POST', '/api/admin/users', { body: form }),
  updateUser: (userNo: string, form: UserForm) =>
    request<User>('PUT', `/api/admin/users/${userNo}`, { body: form }),
  deactivateUser: (userNo: string) =>
    request<void>('POST', `/api/admin/users/${userNo}/deactivate`),
  // ACA-01
  createSemester: (year: number, term: Term) =>
    request<Semester>('POST', '/api/admin/semesters', { body: { year, term } }),
  setCurrentSemester: (id: string) => request<void>('POST', `/api/admin/semesters/${id}/current`),
  schedules: (id: string) => request<Schedule[]>('GET', `/api/admin/semesters/${id}/schedules`),
  saveSchedules: (id: string, schedules: Schedule[]) =>
    request<void>('PUT', `/api/admin/semesters/${id}/schedules`, { body: schedules }),
  maxCredits: (id: string) =>
    request<MaxCreditRow[]>('GET', `/api/admin/semesters/${id}/max-credits`),
  runMaxCredits: (id: string) =>
    request<MaxCreditRow[]>('POST', `/api/admin/semesters/${id}/max-credits`),
  // ACA-02
  courses: () => request<Course[]>('GET', '/api/admin/courses'),
  createCourse: (c: Course) => request<Course>('POST', '/api/admin/courses', { body: c }),
  updateCourse: (c: Course) => request<Course>('PUT', `/api/admin/courses/${c.code}`, { body: c }),
  // ACA-03
  lectures: (semesterId?: string) =>
    request<Lecture[]>('GET', '/api/admin/lectures', { query: { semesterId } }),
  createLecture: (f: LectureForm) => request<Lecture>('POST', '/api/admin/lectures', { body: f }),
  updateLecture: (lecNo: number, f: LectureForm) =>
    request<Lecture>('PUT', `/api/admin/lectures/${lecNo}`, { body: f }),
  closeLecture: (lecNo: number) => request<void>('POST', `/api/admin/lectures/${lecNo}/close`),
  // REG-05
  enrollmentStatus: (lecNo: number) =>
    request<AdminEnrollmentStatus>('GET', `/api/admin/lectures/${lecNo}/enrollments`),
  forceEnroll: (lecNo: number, studentNo: string) =>
    request<void>('POST', `/api/admin/lectures/${lecNo}/enrollments`, { body: { studentNo } }),
  forceCancel: (enrollmentId: number) =>
    request<void>('DELETE', `/api/admin/enrollments/${enrollmentId}`),
  // GRD-02
  confirmGrades: (lecNo: number) => request<void>('POST', `/api/admin/grades/${lecNo}/confirm`),
}
