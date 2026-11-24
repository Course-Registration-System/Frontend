// USR-01 로그인
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { homePath, useAuth } from '../auth/AuthContext'
import { errorMessage, USE_MOCK } from '../api/client'

const DEMO = [
  ['20230001', '학생 (조교 겸임)'],
  ['20250004', '학생 1학년'],
  ['P1001', '교수'],
  ['A0001', '관리자'],
  ['20190099', '비활성 계정'],
]

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userNo, setUserNo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (user) return <Navigate to={homePath(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!userNo || !password) {
      setError('사용자번호와 비밀번호를 입력하세요.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const u = await login(userNo.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : homePath(u), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>수강신청·성적관리</h1>
        <p className="muted">학번 또는 교번으로 로그인하세요.</p>
        <label className="field">
          <span className="field-label">사용자번호</span>
          <input
            value={userNo}
            onChange={(e) => setUserNo(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="field">
          <span className="field-label">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
        {USE_MOCK && (
          <div className="demo-accounts">
            <p className="muted small">데모 계정 (비밀번호 1234)</p>
            {DEMO.map(([no, label]) => (
              <button
                type="button"
                key={no}
                className="chip"
                onClick={() => {
                  setUserNo(no)
                  setPassword('1234')
                }}
              >
                {label} · {no}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}
