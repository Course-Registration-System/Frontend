// 업무별 API 함수. 경로·메서드·본문은 api.md(2026-11-26, 엔드포인트 58개)와 같다.
import type {
  CartResponse,
  CourseCreateRequest,
  CourseResponse,
  CourseSearchParams,
  CourseUpdateRequest,
  DashboardResponse,
  DemoScenario,
  EnrollmentResponse,
  EnrollmentStatusResponse,
  GradeConfirmResponse,
  GradeInput,
  GradeReportResponse,
  GradeSheetResponse,
  GradeStatusResponse,
  GrdStat,
  HealthResponse,
  LectureCreateRequest,
  LecturePlanResponse,
  LectureResponse,
  LectureSearchParams,
  LectureSearchResponse,
  LectureUpdateRequest,
  LoginResponse,
  MaxCreditItem,
  MaxCreditResult,
  MyInfo,
  PlanWeights,
  PrerequisiteRequest,
  Role,
  ScheduleRequest,
  ScheduleResponse,
  SemesterRequest,
  SemesterResponse,
  TeachingAssistantListResponse,
  TeachingLectureListResponse,
  TeachingStudentListResponse,
  TimetableResponse,
  UserCreateRequest,
  UserResponse,
  UserUpdateRequest,
} from '../types'
import { request, requestBlob } from './client'

// USR-01 로그인·비밀번호 변경 (로그아웃 API 는 없다: 토큰만 지운다)
export const authApi = {
  login: (usrNo: string, password: string) =>
    request<LoginResponse>('POST', '/api/auth/login', { body: { usrNo, password } }),
  me: () => request<MyInfo>('GET', '/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('PATCH', '/api/auth/password', { body: { currentPassword, newPassword } }),
}

// 공통 조회
export const commonApi = {
  semesters: () => request<SemesterResponse[]>('GET', '/api/semesters'),
  schedules: (semNo: number) =>
    request<ScheduleResponse[]>('GET', `/api/semesters/${semNo}/schedules`),
  /** 서버(앱) 현재 시각. 시연용 시계를 옮겼으면 그 시각 */
  health: () => request<HealthResponse>('GET', '/api/health'),
}

// 시연용 (백엔드 demo 프로필에서만 있음, 토큰 불필요)
export const devApi = {
  clock: () => request<{ now: string }>('GET', '/api/dev/clock'),
  /** at 을 빼면 실제 시각으로 돌아간다. 형식 "2027-02-11T10:05:00" */
  setClock: (at?: string) => request<{ now: string }>('PUT', '/api/dev/clock', { query: { at } }),
  /** s1_grade_close → s2_enroll_day → s3_adjust 순서로 한 번씩 */
  applyScenario: (name: DemoScenario) =>
    request<{ applied: DemoScenario }>('POST', `/api/dev/scenarios/${name}`),
}

// REG-01 강의 검색, LEC-03 계획서 내려받기
export const lectureApi = {
  search: (params: LectureSearchParams) =>
    request<LectureSearchResponse>('GET', '/api/lectures', { query: { ...params } }),
  planFile: (lecNo: number) => requestBlob(`/api/lectures/${lecNo}/plan`),
}

// REG-02~04, GRD-03 학생
export const studentApi = {
  cart: () => request<CartResponse>('GET', '/api/cart'),
  addToCart: (lecNo: number) => request<CartResponse>('POST', '/api/cart', { body: { lecNo } }),
  removeFromCart: (lecNo: number) => request<void>('DELETE', `/api/cart/${lecNo}`),
  enrollments: () => request<EnrollmentResponse[]>('GET', '/api/enrollments'),
  enroll: (lecNo: number) =>
    request<EnrollmentResponse>('POST', '/api/enrollments', { body: { lecNo } }),
  cancel: (lecNo: number) => request<void>('DELETE', `/api/enrollments/${lecNo}`),
  timetable: (semNo?: number) =>
    request<TimetableResponse>('GET', '/api/me/timetable', { query: { semNo } }),
  grades: () => request<GradeReportResponse>('GET', '/api/me/grades'),
}

// LEC-01~04, GRD-01 교수·조교
const t = (lecNo: number) => `/api/teaching/lectures/${lecNo}`
export const teachingApi = {
  lectures: (semNo?: number) =>
    request<TeachingLectureListResponse>('GET', '/api/teaching/lectures', { query: { semNo } }),
  students: (lecNo: number) => request<TeachingStudentListResponse>('GET', `${t(lecNo)}/students`),
  plan: (lecNo: number) => request<LecturePlanResponse>('GET', `${t(lecNo)}/plan`),
  uploadPlan: (lecNo: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<LecturePlanResponse>('PUT', `${t(lecNo)}/plan/file`, { body: fd })
  },
  saveWeights: (lecNo: number, w: PlanWeights) =>
    request<LecturePlanResponse>('PUT', `${t(lecNo)}/plan/weights`, { body: w }),
  assistants: (lecNo: number) =>
    request<TeachingAssistantListResponse>('GET', `${t(lecNo)}/assistants`),
  addAssistant: (lecNo: number, stdNo: string) =>
    request<TeachingAssistantListResponse>('POST', `${t(lecNo)}/assistants`, {
      body: { stdNo },
    }),
  removeAssistant: (lecNo: number, stdNo: string) =>
    request<TeachingAssistantListResponse>('DELETE', `${t(lecNo)}/assistants/${stdNo}`),
  gradeSheet: (lecNo: number) => request<GradeSheetResponse>('GET', `${t(lecNo)}/grades`),
  /** 넣은 학생만 바뀐다. 한 명이라도 실패하면 아무것도 저장하지 않는다 */
  saveGrades: (lecNo: number, grades: GradeInput[]) =>
    request<GradeSheetResponse>('PUT', `${t(lecNo)}/grades`, { body: { grades } }),
  submitGrades: (lecNo: number) => request<GradeSheetResponse>('POST', `${t(lecNo)}/grades/submit`),
}

// 관리자
export const adminApi = {
  // ACA-04
  dashboard: (semNo?: number) =>
    request<DashboardResponse>('GET', '/api/admin/dashboard', { query: { semNo } }),

  // USR-02
  users: (params: { role?: Role; keyword?: string }) =>
    request<UserResponse[]>('GET', '/api/admin/users', { query: params }),
  createUser: (body: UserCreateRequest) =>
    request<UserResponse>('POST', '/api/admin/users', { body }),
  updateUser: (usrNo: string, body: UserUpdateRequest) =>
    request<UserResponse>('PUT', `/api/admin/users/${usrNo}`, { body }),
  resetPassword: (usrNo: string, newPassword: string) =>
    request<void>('PATCH', `/api/admin/users/${usrNo}/password`, { body: { newPassword } }),
  deactivateUser: (usrNo: string) =>
    request<UserResponse>('PATCH', `/api/admin/users/${usrNo}/deactivate`),

  // ACA-01
  createSemester: (body: SemesterRequest) =>
    request<SemesterResponse>('POST', '/api/admin/semesters', { body }),
  updateSemester: (semNo: number, body: SemesterRequest) =>
    request<SemesterResponse>('PUT', `/api/admin/semesters/${semNo}`, { body }),
  setCurrentSemester: (semNo: number) =>
    request<SemesterResponse>('PUT', `/api/admin/semesters/${semNo}/current`),
  addSchedule: (semNo: number, body: ScheduleRequest) =>
    request<ScheduleResponse>('POST', `/api/admin/semesters/${semNo}/schedules`, { body }),
  deleteSchedule: (schdNo: number) => request<void>('DELETE', `/api/admin/schedules/${schdNo}`),
  maxCredits: (semNo: number) =>
    request<MaxCreditItem[]>('GET', `/api/admin/semesters/${semNo}/max-credits`),
  /** 진급·졸업 처리 후 최대학점 산정 */
  runMaxCredits: (semNo: number) =>
    request<MaxCreditResult>('POST', `/api/admin/semesters/${semNo}/max-credits`),

  // ACA-02
  courses: (params: CourseSearchParams = {}) =>
    request<CourseResponse[]>('GET', '/api/admin/courses', { query: { ...params } }),
  course: (crsCd: string) => request<CourseResponse>('GET', `/api/admin/courses/${crsCd}`),
  createCourse: (body: CourseCreateRequest) =>
    request<CourseResponse>('POST', '/api/admin/courses', { body }),
  updateCourse: (crsCd: string, body: CourseUpdateRequest) =>
    request<CourseResponse>('PUT', `/api/admin/courses/${crsCd}`, { body }),
  replacePrerequisites: (crsCd: string, prerequisites: PrerequisiteRequest[]) =>
    request<CourseResponse>('PUT', `/api/admin/courses/${crsCd}/prerequisites`, {
      body: { prerequisites },
    }),

  // ACA-03
  lectures: (semNo: number) =>
    request<LectureResponse[]>('GET', '/api/admin/lectures', { query: { semNo } }),
  lecture: (lecNo: number) => request<LectureResponse>('GET', `/api/admin/lectures/${lecNo}`),
  createLecture: (body: LectureCreateRequest) =>
    request<LectureResponse>('POST', '/api/admin/lectures', { body }),
  updateLecture: (lecNo: number, body: LectureUpdateRequest) =>
    request<LectureResponse>('PUT', `/api/admin/lectures/${lecNo}`, { body }),
  closeLecture: (lecNo: number) =>
    request<LectureResponse>('PATCH', `/api/admin/lectures/${lecNo}/close`),

  // REG-05
  enrollmentStatus: (lecNo: number) =>
    request<EnrollmentStatusResponse>('GET', `/api/admin/lectures/${lecNo}/enrollments`),
  addEnrollment: (lecNo: number, stdNo: string) =>
    request<EnrollmentStatusResponse>('POST', `/api/admin/lectures/${lecNo}/enrollments`, {
      body: { stdNo },
    }),
  cancelEnrollment: (lecNo: number, stdNo: string) =>
    request<void>('DELETE', `/api/admin/lectures/${lecNo}/enrollments/${stdNo}`),

  // GRD-02
  gradeStatus: (semNo?: number, grdStat?: GrdStat) =>
    request<GradeStatusResponse>('GET', '/api/admin/grades', { query: { semNo, grdStat } }),
  /** 하나라도 걸리면 전부 확정하지 않는다 */
  confirmGrades: (lecNos: number[]) =>
    request<GradeConfirmResponse>('POST', '/api/admin/grades/confirm', { body: { lecNos } }),
}
