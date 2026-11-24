// ACA-01 학기·학사일정, 최대학점 산정
import { useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi, commonApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, Loading, Notice, PageHeader } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { PERIOD_LABEL, semesterLabel, termLabel, TERMS } from '../../lib/format'
import type { PeriodType, Schedule, Term } from '../../types'

const TYPES: PeriodType[] = ['CART', 'REGISTER', 'ADJUST', 'GRADE_INPUT']
const GRADES = [1, 2, 3, 4]

export default function SemestersPage() {
  const toast = useToast()
  const sems = useAsync(() => commonApi.semesters(), [])
  const [picked, setSelected] = useState('')
  const [year, setYear] = useState(() => new Date().getFullYear() + 1)
  const [term, setTerm] = useState<Term>('1')
  // 고르지 않았으면 현재 학기
  const selected = picked || (sems.data?.find((s) => s.current) ?? sems.data?.[0])?.id || ''

  const create = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const s = await adminApi.createSemester(year, term)
      toast(`${semesterLabel(s.id)}을(를) 등록했습니다.`)
      await sems.reload()
      setSelected(s.id)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }
  const makeCurrent = async (id: string) => {
    if (
      !confirm(
        `${semesterLabel(id)}을(를) 현재 학기로 지정할까요? 학생 화면의 기본 학기가 바뀝니다.`,
      )
    )
      return
    try {
      await adminApi.setCurrentSemester(id)
      toast('현재 학기를 바꿨습니다.')
      sems.reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="학기·학사일정"
        desc="학기를 등록하고 기간 4종과 대상학년을 정한 뒤, 장바구니 기간 전에 최대학점을 산정합니다."
      />
      <div className="two-col">
        <section className="card">
          <h2>학기</h2>
          {sems.error && <ErrorBox message={sems.error} onRetry={sems.reload} />}
          {sems.loading && !sems.data && <Loading />}
          <ul className="select-list">
            {sems.data?.map((s) => (
              <li key={s.id} className={s.id === selected ? 'on' : ''}>
                <button className="link-btn" onClick={() => setSelected(s.id)}>
                  {semesterLabel(s.id)}
                </button>
                {s.current ? (
                  <Badge tone="blue">현재</Badge>
                ) : (
                  <button className="btn btn-sm" onClick={() => makeCurrent(s.id)}>
                    현재 학기로
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form className="inline-form" onSubmit={create}>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ width: 90 }}
            />
            <select value={term} onChange={(e) => setTerm(e.target.value as Term)}>
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {termLabel(t)}
                </option>
              ))}
            </select>
            <button className="btn">학기 등록</button>
          </form>
        </section>
        {selected && (
          <div className="stack" key={selected}>
            <ScheduleEditor semesterId={selected} />
            <MaxCredits semesterId={selected} />
          </div>
        )}
      </div>
    </>
  )
}

function ScheduleEditor({ semesterId }: { semesterId: string }) {
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(
    () => adminApi.schedules(semesterId),
    [semesterId],
  )
  // 저장 전 편집본. null 이면 서버 값으로 4종을 채워 보여준다
  const [edits, setEdits] = useState<Schedule[] | null>(null)
  const [busy, setBusy] = useState(false)
  const rows =
    edits ??
    TYPES.map(
      (type) =>
        data?.find((s) => s.type === type) ?? {
          type,
          startDate: '',
          endDate: '',
          targetGrades: [...GRADES],
        },
    )

  const update = (i: number, patch: Partial<Schedule>) =>
    setEdits(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const toggleGrade = (i: number, g: number) => {
    const cur = rows[i].targetGrades
    update(i, { targetGrades: cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g].sort() })
  }
  const save = async () => {
    setBusy(true)
    try {
      await adminApi.saveSchedules(
        semesterId,
        rows.filter((r) => r.startDate || r.endDate),
      )
      toast('학사일정을 저장했습니다.')
      setEdits(null)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>{semesterLabel(semesterId)} 학사일정</h2>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>기간</th>
                <th>시작일</th>
                <th>종료일</th>
                <th>대상학년</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.type}>
                  <td>{PERIOD_LABEL[r.type]}</td>
                  <td>
                    <input
                      type="date"
                      value={r.startDate}
                      onChange={(e) => update(i, { startDate: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={r.endDate}
                      onChange={(e) => update(i, { endDate: e.target.value })}
                    />
                  </td>
                  <td>
                    <span className="checks">
                      {GRADES.map((g) => (
                        <label key={g}>
                          <input
                            type="checkbox"
                            checked={r.targetGrades.includes(g)}
                            onChange={() => toggleGrade(i, g)}
                          />
                          {g}
                        </label>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-actions">
            <button className="btn btn-primary" disabled={busy} onClick={save}>
              일정 저장
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function MaxCredits({ semesterId }: { semesterId: string }) {
  const toast = useToast()
  const { data, error, loading, setData, reload } = useAsync(
    () => adminApi.maxCredits(semesterId),
    [semesterId],
  )
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (data?.length && !confirm('다시 산정하면 기존 결과를 덮어씁니다. 계속할까요?')) return
    setBusy(true)
    try {
      setData(await adminApi.runMaxCredits(semesterId))
      toast('최대학점을 산정했습니다.')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>최대학점 산정</h2>
        <button className="btn btn-primary" disabled={busy} onClick={run}>
          {data?.length ? '다시 산정' : '산정 실행'}
        </button>
      </div>
      <Notice>
        장바구니 기간 시작 전에 실행합니다. 정규학기는 직전 정규학기 성적이 확정된 뒤에 산정할 수
        있습니다.
      </Notice>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.length === 0 ? (
          <Empty>아직 산정하지 않았습니다.</Empty>
        ) : (
          <div className="table-wrap scroll-y">
            <table className="table">
              <thead>
                <tr>
                  <th>학번</th>
                  <th>이름</th>
                  <th className="num">학년</th>
                  <th className="num">직전 학기 평점</th>
                  <th className="num">최대학점</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.studentNo}>
                    <td className="mono">{r.studentNo}</td>
                    <td>{r.name}</td>
                    <td className="num">{r.grade}</td>
                    <td className="num">{r.prevGpa?.toFixed(2) ?? '-'}</td>
                    <td className="num">
                      <b>{r.maxCredits}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  )
}
