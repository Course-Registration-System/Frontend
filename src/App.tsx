import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { DemoPanel } from './components/DemoPanel'
import { AppLayout, RequireRole } from './components/Layout'
import { ToastProvider } from './components/Toast'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import TimetablePage from './pages/student/TimetablePage'
import RegistrationPage from './pages/student/RegistrationPage'
import GradesPage from './pages/student/GradesPage'
import LectureListPage from './pages/teaching/LectureListPage'
import LectureDetailLayout from './pages/teaching/LectureDetailLayout'
import StudentsTab from './pages/teaching/StudentsTab'
import SyllabusTab from './pages/teaching/SyllabusTab'
import AssistantsTab from './pages/teaching/AssistantsTab'
import GradesTab from './pages/teaching/GradesTab'
import DashboardPage from './pages/admin/DashboardPage'
import UsersPage from './pages/admin/UsersPage'
import SemestersPage from './pages/admin/SemestersPage'
import CoursesPage from './pages/admin/CoursesPage'
import LecturesPage from './pages/admin/LecturesPage'
import AdminEnrollmentsPage from './pages/admin/EnrollmentsPage'
import AdminGradesPage from './pages/admin/GradesPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* 랜딩 + 로그인. 로그인한 상태면 역할별 메인 화면으로 보낸다 */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* 장바구니·수강신청·시간표는 학부생만 (대학원생은 대상이 아님) */}
            <Route element={<RequireRole roles={['STUDENT']} undergraduateOnly />}>
              <Route element={<AppLayout />}>
                <Route path="/student/registration" element={<RegistrationPage />} />
                <Route path="/student/timetable" element={<TimetablePage />} />
              </Route>
            </Route>
            <Route element={<RequireRole roles={['STUDENT']} />}>
              <Route element={<AppLayout />}>
                <Route path="/student/grades" element={<GradesPage />} />
              </Route>
            </Route>

            {/* 교수, 그리고 배정된 강의가 있는 학생(조교) */}
            <Route element={<RequireRole roles={['PROFESSOR']} allowAssistant />}>
              <Route element={<AppLayout />}>
                <Route path="/teaching/lectures" element={<LectureListPage />} />
                <Route path="/teaching/lectures/:lecNo" element={<LectureDetailLayout />}>
                  <Route index element={<Navigate to="students" replace />} />
                  <Route path="students" element={<StudentsTab />} />
                  <Route path="syllabus" element={<SyllabusTab />} />
                  <Route path="assistants" element={<AssistantsTab />} />
                  <Route path="grades" element={<GradesTab />} />
                </Route>
              </Route>
            </Route>

            <Route element={<RequireRole roles={['ADMIN']} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/semesters" element={<SemestersPage />} />
                <Route path="/admin/courses" element={<CoursesPage />} />
                <Route path="/admin/lectures" element={<LecturesPage />} />
                <Route path="/admin/enrollments" element={<AdminEnrollmentsPage />} />
                <Route path="/admin/grades" element={<AdminGradesPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          {/* 시연 진행자 패널 (?demo=1 일 때만) */}
          <DemoPanel />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
