import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, homePath, useAuth } from './auth/AuthContext'
import { AppLayout, RequireRole } from './components/Layout'
import { ToastProvider } from './components/Toast'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import TimetablePage from './pages/student/TimetablePage'
import LectureSearchPage from './pages/student/LectureSearchPage'
import CartPage from './pages/student/CartPage'
import EnrollmentsPage from './pages/student/EnrollmentsPage'
import GradesPage from './pages/student/GradesPage'
import LectureListPage from './pages/teaching/LectureListPage'
import LectureDetailLayout from './pages/teaching/LectureDetailLayout'
import StudentsTab from './pages/teaching/StudentsTab'
import SyllabusTab from './pages/teaching/SyllabusTab'
import AssistantsTab from './pages/teaching/AssistantsTab'
import GradesTab from './pages/teaching/GradesTab'
import TeachingSearchPage from './pages/teaching/SearchPage'
import DashboardPage from './pages/admin/DashboardPage'
import UsersPage from './pages/admin/UsersPage'
import SemestersPage from './pages/admin/SemestersPage'
import CoursesPage from './pages/admin/CoursesPage'
import LecturesPage from './pages/admin/LecturesPage'
import AdminEnrollmentsPage from './pages/admin/EnrollmentsPage'
import AdminGradesPage from './pages/admin/GradesPage'

function Home() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? homePath(user) : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireRole roles={['STUDENT']} />}>
              <Route element={<AppLayout />}>
                <Route path="/student/timetable" element={<TimetablePage />} />
                <Route path="/student/lectures" element={<LectureSearchPage />} />
                <Route path="/student/cart" element={<CartPage />} />
                <Route path="/student/enrollments" element={<EnrollmentsPage />} />
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
            <Route element={<RequireRole roles={['PROFESSOR']} />}>
              <Route element={<AppLayout />}>
                <Route path="/teaching/search" element={<TeachingSearchPage />} />
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
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
