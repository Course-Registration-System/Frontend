import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, commonApi, studentApi } from '../api'
import { tokenStore } from '../api/client'
import { pickPeriod } from '../lib/period'
import type { CurrentPeriod, MyInfo } from '../types'

interface AuthValue {
  user: MyInfo | null
  /** 학생: 신청 대상 학기와 지금 기간 (신청 대상 학기가 없으면 null) */
  period: CurrentPeriod | null
  loading: boolean
  login: (usrNo: string, password: string) => Promise<MyInfo>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/** 장바구니 응답의 semNo 가 신청 대상 학기다. 그 학기 일정과 서버 시각으로 기간을 고른다 */
async function loadPeriod(user: MyInfo): Promise<CurrentPeriod | null> {
  if (user.role !== 'STUDENT') return null
  try {
    const { semNo } = await studentApi.cart()
    const [schedules, health] = await Promise.all([
      commonApi.schedules(semNo),
      commonApi.health().catch(() => null),
    ])
    return pickPeriod(semNo, schedules, health ? new Date(health.time) : new Date())
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MyInfo | null>(null)
  const [period, setPeriod] = useState<CurrentPeriod | null>(null)
  // 저장된 토큰이 있을 때만 첫 조회를 기다린다
  const [loading, setLoading] = useState(() => !!tokenStore.get())

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(me)
      setPeriod(await loadPeriod(me))
    } catch {
      tokenStore.set(null)
      setUser(null)
      setPeriod(null)
    }
  }, [])

  useEffect(() => {
    if (tokenStore.get()) void refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (usrNo: string, password: string) => {
    const res = await authApi.login(usrNo, password)
    tokenStore.set(res.accessToken)
    setUser(res.user)
    setPeriod(await loadPeriod(res.user))
    return res.user
  }, [])

  // 로그아웃 API 는 없다. 저장한 토큰만 지운다
  const logout = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    setPeriod(null)
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

/** 역할별 메인 화면 (USR-01 ⑤) */
// eslint-disable-next-line react/only-export-components
export function homePath(user: MyInfo) {
  if (user.role === 'ADMIN') return '/admin'
  if (user.role === 'PROFESSOR') return '/teaching/lectures'
  return '/student/registration'
}
