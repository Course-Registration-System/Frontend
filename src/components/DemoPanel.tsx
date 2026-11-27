// 시연 진행자 패널. 주소에 ?demo=1 을 붙이면 켜지고 ?demo=0 이면 꺼진다.
// 앱 시각 이동(PUT /api/dev/clock)·시드 오버레이 적용(POST /api/dev/scenarios)·계정 바로 로그인을 시연 순서대로 둔다.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { devApi } from '../api'
import { ApiError, errorMessage } from '../api/client'
import { homePath, useAuth } from '../auth/AuthContext'
import { useToast } from './Toast'

const ENABLED_KEY = 'crs.demo'
const OPEN_KEY = 'crs.demo.open'
const APPLIED_KEY = 'crs.demo.applied'
const PASSWORD = 'test1234!'

const storage = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* 저장소를 쓸 수 없는 환경 */
    }
  },
}

/** ?demo=1 / ?demo=0 을 읽어 저장하고, 지금 켜져 있는지 돌려준다 */
function readEnabled() {
  const q = new URLSearchParams(window.location.search).get('demo')
  if (q === '1') storage.set(ENABLED_KEY, '1')
  if (q === '0') storage.set(ENABLED_KEY, null)
  return storage.get(ENABLED_KEY) === '1'
}

const CLOCKS = {
  T0: { at: '2026-12-21T10:00:00', label: '2026-12-21 10:00' },
  TC: { at: '2026-12-28T10:00:00', label: '2026-12-28 10:00' },
  T1: { at: '2027-02-11T10:05:00', label: '2027-02-11 10:05' },
} as const
type ClockKey = keyof typeof CLOCKS

const SCENARIOS: Record<'s1_grade_close' | 's2_enroll_day', { label: string; desc: string }> = {
  s1_grade_close: {
    label: '학기 마감 (s1)',
    desc: '겨울학기 확정, 진급·졸업·복학, 신입생 계정',
  },
  s2_enroll_day: { label: '신청일 데이터 (s2)', desc: '2027-1 신청일 장바구니·정원 데이터' },
}
type Scenario = keyof typeof SCENARIOS

interface Account {
  usrNo: string
  label: string
}

interface Step {
  no: string
  title: string
  clock: ClockKey
  /** 진행자가 누를 것 (순서대로) */
  actions: ({ kind: 'clock'; key: ClockKey } | { kind: 'scenario'; name: Scenario })[]
  accounts: Account[]
}

const STEPS: Step[] = [
  {
    no: '①',
    title: '성적 입력',
    clock: 'T0',
    actions: [{ kind: 'clock', key: 'T0' }],
    accounts: [{ usrNo: '100002', label: '교수 이수진' }],
  },
  {
    no: '②',
    title: '성적 확정',
    clock: 'TC',
    actions: [{ kind: 'clock', key: 'TC' }],
    accounts: [{ usrNo: '90001', label: '관리자' }],
  },
  {
    no: '③',
    title: '학기 마감',
    clock: 'TC',
    actions: [{ kind: 'scenario', name: 's1_grade_close' }],
    accounts: [{ usrNo: '90001', label: '관리자' }],
  },
  {
    no: '④',
    title: '신청일',
    clock: 'T1',
    actions: [
      { kind: 'scenario', name: 's2_enroll_day' },
      { kind: 'clock', key: 'T1' },
    ],
    accounts: [{ usrNo: '90001', label: '관리자' }],
  },
  {
    no: '⑤',
    title: '수강신청',
    clock: 'T1',
    actions: [],
    accounts: [{ usrNo: '20260001', label: '학생 서준우' }],
  },
  {
    no: '⑥',
    title: '차단 사례',
    clock: 'T1',
    actions: [],
    accounts: [
      { usrNo: '20260002', label: '학점 초과' },
      { usrNo: '20250002', label: '시간 겹침' },
      { usrNo: '20260003', label: '선수과목' },
      { usrNo: '20250001', label: '3학년 기간 외' },
      { usrNo: '20230001', label: '졸업생' },
      { usrNo: '2026710001', label: '대학원생' },
      { usrNo: '100006', label: '퇴직 교수' },
    ],
  },
]

const readApplied = (): Scenario[] => {
  try {
    const v = JSON.parse(storage.get(APPLIED_KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** "2026-12-21T10:00" → "2026-12-21 10:00" */
const showTime = (s: string) => s.replace('T', ' ').slice(0, 16)

export function DemoPanel() {
  const [enabled] = useState(readEnabled)
  if (!enabled) return null
  return <DemoPanelInner />
}

function DemoPanelInner() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user, login, logout } = useAuth()
  const [open, setOpen] = useState(() => storage.get(OPEN_KEY) === '1')
  const [now, setNow] = useState<string | null>(null)
  const [applied, setApplied] = useState<Scenario[]>(readApplied)
  const [busy, setBusy] = useState(false)

  const loadClock = useCallback(async () => {
    try {
      const { now } = await devApi.clock()
      setNow(now)
    } catch (e) {
      setNow(null)
      toast(`서버 시각을 못 읽었습니다: ${errorMessage(e)}`, 'error')
    }
  }, [toast])

  // 처음 한 번, 그리고 패널을 열 때마다 서버 시각을 다시 읽는다
  useEffect(() => {
    void loadClock()
  }, [open, loadClock])

  const toggle = () => {
    setOpen((o) => {
      storage.set(OPEN_KEY, o ? null : '1')
      return !o
    })
  }

  const markApplied = (name: Scenario) => {
    const next = applied.includes(name) ? applied : [...applied, name]
    storage.set(APPLIED_KEY, JSON.stringify(next))
    setApplied(next)
  }

  const resetApplied = () => {
    if (
      !window.confirm(
        '오버레이 적용 기록만 지웁니다 (서버 데이터는 그대로). 백엔드를 초기화한 뒤에 누르세요.',
      )
    )
      return
    storage.set(APPLIED_KEY, null)
    setApplied([])
  }

  /** 시각·데이터가 바뀌었으니 화면을 처음부터 다시 불러온다 (로그인 상태는 유지) */
  const reloadSoon = () => setTimeout(() => window.location.reload(), 600)

  const moveClock = async (key: ClockKey | null) => {
    setBusy(true)
    try {
      const { now } = await devApi.setClock(key ? CLOCKS[key].at : undefined)
      setNow(now)
      toast(`앱 시각을 ${showTime(now)} 로 옮겼습니다`)
      reloadSoon()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const applyScenario = async (name: Scenario) => {
    const { label, desc } = SCENARIOS[name]
    if (!window.confirm(`${label}\n${desc}\n\n오버레이는 되돌릴 수 없습니다. 적용할까요?`)) return
    setBusy(true)
    try {
      await devApi.applyScenario(name)
      markApplied(name)
      toast(`${label} 적용 완료`)
      reloadSoon()
    } catch (e) {
      // 이미 적용된 오버레이(다른 브라우저에서 눌렀거나 두 번 누름)는 409
      if (e instanceof ApiError && e.status === 409) {
        markApplied(name)
        toast(`${label}: 이미 적용되어 있습니다`, 'error')
      } else toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const loginAs = async (a: Account) => {
    setBusy(true)
    try {
      logout()
      const me = await login(a.usrNo, PASSWORD)
      toast(`${me.usrNm}(${me.usrNo}) 로 로그인했습니다`)
      navigate(homePath(me))
    } catch (e) {
      toast(`${a.usrNo}: ${errorMessage(e)}`, 'error')
      navigate('/')
    } finally {
      setBusy(false)
    }
  }

  /** s1 은 한 번만, s2 는 s1 다음에 한 번만 */
  const scenarioBlocked = (name: Scenario) =>
    applied.includes(name) || (name === 's2_enroll_day' && !applied.includes('s1_grade_close'))

  const nowLabel = now ? showTime(now) : '—'

  return (
    <div className="demo">
      {open && (
        <section className="demo-panel" aria-label="시연 진행자 패널">
          <header className="demo-head">
            <div>
              <strong>시연 진행</strong>
              <span className="demo-now">
                서버 시각 <b>{nowLabel}</b>
              </span>
            </div>
            <button className="btn btn-sm" onClick={() => void loadClock()} disabled={busy}>
              새로고침
            </button>
          </header>

          <ol className="demo-steps">
            {STEPS.map((s) => {
              const here = now !== null && showTime(now) === CLOCKS[s.clock].label
              return (
                <li key={s.no} className={`demo-step ${here ? 'here' : ''}`}>
                  <div className="demo-step-title">
                    <span>
                      {s.no} {s.title}
                    </span>
                    <small>
                      {s.clock} · {CLOCKS[s.clock].label}
                    </small>
                  </div>

                  {s.actions.length > 0 && (
                    <div className="demo-row">
                      {s.actions.map((a) =>
                        a.kind === 'clock' ? (
                          <button
                            key={a.key}
                            className="btn btn-sm btn-primary"
                            disabled={busy}
                            onClick={() => void moveClock(a.key)}
                          >
                            {a.key} 로 이동
                          </button>
                        ) : (
                          <button
                            key={a.name}
                            className="btn btn-sm btn-danger"
                            disabled={busy || scenarioBlocked(a.name)}
                            title={
                              applied.includes(a.name)
                                ? '이미 적용함'
                                : a.name === 's2_enroll_day' && !applied.includes('s1_grade_close')
                                  ? 's1 을 먼저 적용하세요'
                                  : SCENARIOS[a.name].desc
                            }
                            onClick={() => void applyScenario(a.name)}
                          >
                            {applied.includes(a.name) ? '✓ ' : ''}
                            {SCENARIOS[a.name].label}
                          </button>
                        ),
                      )}
                    </div>
                  )}

                  <div className="demo-row">
                    {s.accounts.map((a) => (
                      <button
                        key={a.usrNo}
                        className={`btn btn-sm demo-account ${user?.usrNo === a.usrNo ? 'active' : ''}`}
                        disabled={busy}
                        onClick={() => void loginAs(a)}
                        title={`${a.usrNo} 로 로그인`}
                      >
                        {a.label}
                        <small>{a.usrNo}</small>
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ol>

          <footer className="demo-foot">
            <button className="btn btn-sm" disabled={busy} onClick={() => void moveClock(null)}>
              실제 시각으로
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={resetApplied}>
              오버레이 기록 초기화
            </button>
          </footer>
        </section>
      )}
      <button className="demo-fab" onClick={toggle} aria-expanded={open}>
        {open ? '닫기' : `시연 · ${nowLabel}`}
      </button>
    </div>
  )
}
