// 업무별 API 함수. 경로·메서드·본문은 Backend 컨트롤러와 같다 (API-목록.md 참고).
import type {
  CartResponse,
  CourseCreateRequest,
  CourseResponse,
  CourseUpdateRequest,
  DashboardResponse,
  EnrollmentResponse,
  EnrollmentStatusResponse,
  GradeInput,
  GradeReportResponse,
  GradeSheetResponse,
  GradeStatusResponse,
  GrdStat,
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
  health: () => request<{ status: string; time: string }>('GET', '/api/health'),
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
  saveGrades: (lecNo: number, grades: GradeInput[]) =>
    request<GradeSheetResponse>('PUT', `${t(lecNo)}/grades`, { body: { grades } }),
  saveCounts: (lecNo: number, aCnt: number | null, abCnt: number | null) =>
    request<GradeSheetResponse>('PUT', `${t(lecNo)}/grades/counts`, { body: { aCnt, abCnt } }),
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
  courses: () => request<CourseResponse[]>('GET', '/api/admin/courses'),
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

  // GRD-02 (feat/grade-confirm 브랜치, 아직 main 에 없음)
  gradeStatus: (semNo?: number, grdStat?: GrdStat) =>
    request<GradeStatusResponse>('GET', '/api/admin/grades', { query: { semNo, grdStat } }),
  confirmGrades: (lecNos: number[]) =>
    request<unknown>('POST', '/api/admin/grades/confirm', { body: { lecNos } }),
}
