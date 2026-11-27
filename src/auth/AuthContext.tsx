import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, commonApi, studentApi } from '../api'
import { AUTH_EXPIRED_EVENT, tokenStore } from '../api/client'
import { isGraduateNo } from '../lib/format'
import { pickPeriod } from '../lib/period'
import type { CurrentPeriod, MyInfo, SemesterResponse } from '../types'

interface AuthValue {
  user: MyInfo | null
  /** 신청 대상 학기와 지금 기간 (모든 역할, 학기가 없으면 null). 학생 화면 버튼 판단에도 쓴다 */
  period: CurrentPeriod | null
  loading: boolean
  login: (usrNo: string, password: string) => Promise<MyInfo>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/** 현재 학기 다음 학기 (없으면 현재 학기, 그것도 없으면 마지막 학기). 학기 목록은 오래된 순이다 */
function nextSemesterNo(semesters: SemesterResponse[]) {
  const i = semesters.findIndex((x) => x.current)
  return (semesters[i + 1] ?? semesters[i] ?? semesters[semesters.length - 1])?.semNo
}

/**
 * 신청 대상 학기와 그 학기 일정, 서버 시각으로 지금 기간을 고른다.
 * 학부생은 장바구니 응답의 semNo 가 신청 대상 학기다.
 * 교수·관리자·대학원생은 장바구니를 못 보므로(403) 현재 학기의 다음 학기를 신청 대상으로 본다.
 */
async function loadPeriod(user: MyInfo): Promise<CurrentPeriod | null> {
  try {
    const [cartSemNo, health, semesters] = await Promise.all([
      isUndergraduate(user)
        ? studentApi
            .cart()
            .then((c) => c.semNo)
            .catch(() => null)
        : null,
      commonApi.health().catch(() => null),
      commonApi.semesters().catch(() => []),
    ])
    const semNo = cartSemNo ?? nextSemesterNo(semesters)
    if (semNo == null) return null
    const schedules = await commonApi.schedules(semNo)
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
