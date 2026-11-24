// 랜딩 = 로그인 (USR-01 ①)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { errorMessage } from '../api/client'
import { homePath, useAuth } from '../auth/AuthContext'

export default function LandingPage() {
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
    setBusy(true)
    setError(null)
    try {
      const u = await login(userNo.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/' ? from : homePath(u), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1 className="login-brand">숭실대학교</h1>
        <input
          value={userNo}
          onChange={(e) => setUserNo(e.target.value)}
          inputMode="numeric"
          autoComplete="username"
          placeholder="사용자번호"
          aria-label="사용자번호"
          autoFocus
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="비밀번호"
          aria-label="비밀번호"
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  )
}
