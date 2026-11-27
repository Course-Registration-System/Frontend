import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, commonApi, studentApi } from '../api'
import { AUTH_EXPIRED_EVENT, tokenStore } from '../api/client'
import { isGraduateNo } from '../lib/format'
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
  // 대학원생은 장바구니·수강신청 대상이 아니다 (장바구니 조회가 403)
  if (!isUndergraduate(user)) return null
  try {
    const { semNo } = await studentApi.cart()
    const [schedules, health, semesters] = await Promise.all([
      commonApi.schedules(semNo),
      commonApi.health().catch(() => null),
      commonApi.semesters().catch(() => []),
    ])
    // 현재 학기가 신청 대상 학기와 다르면 그 학기 일정도 받아 성적입력 기간인지 본다
    const cur = semesters.find((x) => x.current && x.semNo !== semNo)
    const currentSchedules = cur ? await commonApi.schedules(cur.semNo).catch(() => []) : []
    return pickPeriod(
      semNo,
      schedules,
      health ? new Date(health.time) : new Date(),
      semesters,
      currentSchedules,
    )
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

  // 요청 중 401(토큰 만료·무효)이 오면 로그아웃한다. 로그인 화면으로는 RequireRole 이 보낸다
  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      setPeriod(null)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

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

/** 장바구니·수강신청을 할 수 있는 학생(학부생)인지 */
// eslint-disable-next-line react/only-export-components
export const isUndergraduate = (user: MyInfo) =>
  user.role === 'STUDENT' && !isGraduateNo(user.usrNo)

/** 역할별 메인 화면 (USR-01 ⑤). 대학원생은 조교면 강의 운영, 아니면 성적 조회 */
// eslint-disable-next-line react/only-export-components
export function homePath(user: MyInfo) {
  if (user.role === 'ADMIN') return '/admin'
  if (user.role === 'PROFESSOR') return '/teaching/lectures'
  if (!isUndergraduate(user)) return user.ta ? '/teaching/lectures' : '/student/grades'
  return '/student/registration'
}
