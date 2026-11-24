import { lazy, Suspense, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { homePath, useAuth } from '../auth/AuthContext'
import { USE_MOCK } from '../api/client'
import { PERIOD_LABEL, ROLE_LABEL, semesterLabel } from '../lib/format'
import type { Role, User } from '../types'

const DemoBar = lazy(() => import('./DemoBar'))

interface MenuItem {
  to: string
  label: string
  end?: boolean
}
interface MenuGroup {
  title: string
  items: MenuItem[]
}

function menuFor(user: User): MenuGroup[] {
  if (user.role === 'ADMIN')
    return [
      {
        title: '관리자',
        items: [
          { to: '/admin', label: '대시보드', end: true },
          { to: '/admin/users', label: '사용자 관리' },
          { to: '/admin/semesters', label: '학기·학사일정' },
          { to: '/admin/courses', label: '과목 관리' },
          { to: '/admin/lectures', label: '강의 개설 관리' },
          { to: '/admin/enrollments', label: '수강신청 현황' },
          { to: '/admin/grades', label: '성적 확정' },
        ],
      },
    ]
  const teaching: MenuGroup = {
    title: user.role === 'PROFESSOR' ? '강의 운영' : '강의 운영 (조교)',
    items: [{ to: '/teaching/lectures', label: '담당 강의 목록' }],
  }
  if (user.role === 'PROFESSOR') {
    teaching.items.push({ to: '/teaching/search', label: '강의 검색' })
    return [teaching]
  }
  const student: MenuGroup = {
    title: '수강신청',
    items: [
      { to: '/student/timetable', label: '시간표' },
      { to: '/student/lectures', label: '강의 검색' },
      { to: '/student/cart', label: '장바구니' },
      { to: '/student/enrollments', label: '수강신청 내역' },
      { to: '/student/grades', label: '성적 조회' },
    ],
  }
  return user.isAssistant ? [student, teaching] : [student]
}

export function AppLayout() {
  const { user, period, logout } = useAuth()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  if (!user) return null

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      {USE_MOCK && (
        <Suspense fallback={null}>
          <DemoBar />
        </Suspense>
      )}
      <header className="topbar">
        <button
          className="btn-icon nav-toggle"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="메뉴"
        >
          ☰
        </button>
        <NavLink to={homePath(user)} className="brand">
          수강신청·성적관리
        </NavLink>
        <div className="topbar-right">
          {period && (
            <span className="period-chip">
              {semesterLabel(period.semesterId)}
              {user.role === 'STUDENT' && (
                <b>{period.type ? `${PERIOD_LABEL[period.type]} 기간` : '신청 기간 아님'}</b>
              )}
            </span>
          )}
          <span className="who">
            {user.name}
            <small>
              {ROLE_LABEL[user.role]}
              {user.isAssistant ? '·조교' : ''} · {user.userNo}
            </small>
          </span>
          <button className="btn btn-sm" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <div className="shell">
        <nav className={`sidebar ${navOpen ? 'open' : ''}`} onClick={() => setNavOpen(false)}>
          {menuFor(user).map((g) => (
            <div key={g.title} className="nav-group">
              <div className="nav-title">{g.title}</div>
              {g.items.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.end} className="nav-link">
                  {m.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <main className="content" key={location.pathname.split('/').slice(0, 3).join('/')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** 로그인·역할 검사. 조교 허용 시 학생 중 isAssistant 도 통과 */
export function RequireRole({
  roles,
  allowAssistant,
}: {
  roles: Role[]
  allowAssistant?: boolean
}) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  const ok =
    roles.includes(user.role) || (allowAssistant && user.role === 'STUDENT' && user.isAssistant)
  if (!ok) return <Navigate to={homePath(user)} replace />
  return <Outlet />
}
