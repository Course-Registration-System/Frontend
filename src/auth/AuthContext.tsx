import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, commonApi } from '../api'
import { tokenStore } from '../api/client'
import type { CurrentPeriod, User } from '../types'

interface AuthValue {
  user: User | null
  /** 로그인 후 한 번 조회해 두는 현재 기간 (학생 학년 기준) */
  period: CurrentPeriod | null
  loading: boolean
  login: (userNo: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [period, setPeriod] = useState<CurrentPeriod | null>(null)
  // 저장된 토큰이 있을 때만 첫 조회를 기다린다
  const [loading, setLoading] = useState(() => !!tokenStore.get())

  const refresh = useCallback(async () => {
    try {
      const [me, p] = await Promise.all([authApi.me(), commonApi.currentPeriod()])
      setUser(me)
      setPeriod(p)
    } catch {
      tokenStore.set(null)
      setUser(null)
      setPeriod(null)
    }
  }, [])

  useEffect(() => {
    if (tokenStore.get()) void refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (userNo: string, password: string) => {
    const res = await authApi.login(userNo, password)
    tokenStore.set(res.token)
    setUser(res.user)
    setPeriod(await commonApi.currentPeriod())
    return res.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      tokenStore.set(null)
      setUser(null)
      setPeriod(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, period, loading, login, logout, refresh }),
    [user, period, loading, login, logout, refresh],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const v = useContext(AuthContext)
  if (!v) throw new Error('AuthProvider 안에서 사용해야 합니다.')
  return v
}

/** 역할별 첫 화면 */
// eslint-disable-next-line react/only-export-components
export function homePath(user: User) {
  if (user.role === 'ADMIN') return '/admin'
  if (user.role === 'PROFESSOR') return '/teaching/lectures'
  return '/student/timetable'
}
