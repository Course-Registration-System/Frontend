import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { authApi } from '../api'
import { errorMessage } from '../api/client'
import { homePath, isUndergraduate, useAuth } from '../auth/AuthContext'
import { ROLE_LABEL, SCHD_TYPE_LABEL, semLabel } from '../lib/format'
import type { MyInfo, Role } from '../types'
import { useToast } from './Toast'
import { Field, Modal } from './ui'

interface MenuItem {
  to: string
  label: string
  end?: boolean
}
interface MenuGroup {
  title: string
  items: MenuItem[]
}

function menuFor(user: MyInfo): MenuGroup[] {
  if (user.role === 'ADMIN')
    return [
      { title: '대시보드', items: [{ to: '/admin', label: '대시보드', end: true }] },
      { title: '사용자', items: [{ to: '/admin/users', label: '사용자 관리' }] },
      {
        title: '학사',
        items: [
          { to: '/admin/semesters', label: '학기·학사일정' },
          { to: '/admin/courses', label: '과목 관리' },
          { to: '/admin/lectures', label: '강의 개설' },
        ],
      },
      { title: '수강신청', items: [{ to: '/admin/enrollments', label: '수강신청 현황' }] },
      { title: '성적', items: [{ to: '/admin/grades', label: '성적 확정' }] },
    ]

  if (user.role === 'PROFESSOR')
    return [
      { title: '담당 강의', items: [{ to: '/teaching/lectures', label: '담당 강의' }] },
    ]

  // 학생 (조교 포함). 대학원생은 장바구니·수강신청 대상이 아니라 수강신청 메뉴를 빼고 강의 운영을 앞에 둔다.
  // 학적상태로 신청할 수 없는 학부생은 서버가 막는다
  const teaching: MenuGroup = {
    title: '강의 운영',
    items: [{ to: '/teaching/lectures', label: '배정된 강의' }],
  }
  const grades: MenuGroup = {
    title: '성적',
    items: [{ to: '/student/grades', label: '성적 조회' }],
  }
  if (!isUndergraduate(user)) return user.ta ? [teaching, grades] : [grades]
  const groups: MenuGroup[] = [
    {
      title: '수강신청',
      items: [
        { to: '/student/registration', label: '장바구니·수강신청' },
        { to: '/student/timetable', label: '시간표' },
      ],
    },
    grades,
  ]
  if (user.ta) groups.push(teaching)
  return groups
}

const matches = (m: MenuItem, path: string) =>
  m.end ? path === m.to : path === m.to || path.startsWith(m.to + '/')

export function AppLayout() {
  const { user, period, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [pwOpen, setPwOpen] = useState(false)
  if (!user) return null

  const menu = menuFor(user)
  const active = menu.find((g) => g.items.some((m) => matches(m, location.pathname)))

  const onLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to={homePath(user)} className="brand">
            숭실대학교
          </NavLink>
          <nav className="gnb">
            {menu.map((g) => (
              <Link
                key={g.title}
                to={g.items[0].to}
                className={`gnb-link ${g === active ? 'active' : ''}`}
              >
                {g.title}
              </Link>
            ))}
          </nav>
          <div className="topbar-right">
            {period && (
              <span className="period-chip">
                {period.semester && <>{semLabel(period.semester)} · </>}
                <b>{period.type ? `${SCHD_TYPE_LABEL[period.type]} 기간` : '신청 기간 아님'}</b>
              </span>
            )}
            {period?.gradeSemester && (
              <span className="period-chip">
                {semLabel(period.gradeSemester)} · <b>{SCHD_TYPE_LABEL.GRADE} 기간</b>
              </span>
            )}
            <span className="who">
              {user.usrNm}
              <small>
                {user.role === 'STUDENT' && !isUndergraduate(user)
                  ? '대학원생'
                  : ROLE_LABEL[user.role]}
                {user.ta ? '·조교' : ''} · {user.usrNo}
              </small>
            </span>
            <button className="btn btn-sm" onClick={() => setPwOpen(true)}>
              비밀번호 변경
            </button>
            <button className="btn btn-sm" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </div>
        {active && active.items.length > 1 && (
          <nav className="lnb">
            <div className="topbar-inner">
              {active.items.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.end} className="lnb-link">
                  {m.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="content" key={location.pathname.split('/').slice(0, 3).join('/')}>
        <Outlet />
      </main>
      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  )
}

/** USR-01 ⑥ 비밀번호 변경 */
function PasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await authApi.changePassword(current, next)
      toast('비밀번호를 변경했습니다.')
      onClose()
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="비밀번호 변경"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" form="pw-form" disabled={busy}>
            변경
          </button>
        </>
      }
    >
      <form id="pw-form" className="stack" onSubmit={submit}>
        <Field label="현재 비밀번호">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </Field>
        <Field label="새 비밀번호">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  )
}

/**
 * 로그인·역할 검사. allowAssistant 면 조교로 배정된 학생도 통과,
 * undergraduateOnly 면 대학원생(10자리)은 막는다 (장바구니·수강신청·시간표)
 */
export function RequireRole({
  roles,
  allowAssistant,
  undergraduateOnly,
}: {
  roles: Role[]
  allowAssistant?: boolean
  undergraduateOnly?: boolean
}) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />
  const ok =
    (roles.includes(user.role) && !(undergraduateOnly && !isUndergraduate(user))) ||
    (allowAssistant && user.role === 'STUDENT' && user.ta)
  if (!ok) return <Navigate to={homePath(user)} replace />
  return <Outlet />
}
