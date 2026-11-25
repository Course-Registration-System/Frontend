// GRD-02 성적 확정. 제출된 강의만 고를 수 있고, 하나라도 걸리면 서버가 전부 확정하지 않는다.
import { useState } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import {
  Empty,
  ErrorBox,
  GradeStatusBadge,
  Loading,
  Notice,
  PageHeader,
  SemesterSelect,
  Stat,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime, GRD_STAT_LABEL } from '../../lib/format'
import type { GrdStat } from '../../types'

const STATS: GrdStat[] = ['NOT_ENTERED', 'ENTERING', 'SUBMITTED', 'CONFIRMED']

export default function AdminGradesPage() {
  const toast = useToast()
  const [semNo, setSemNo] = useState<number | null>(null)
  const [filter, setFilter] = useState<GrdStat | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  // 처음에는 비워서 보낸다: 서버가 현재 학기로 정한다
  const { data, error, loading, reload } = useAsync(
    () => adminApi.gradeStatus(semNo ?? undefined, filter ?? undefined),
    [semNo, filter],
  )
  const submitted = (data?.lectures ?? []).filter((l) => l.grdStat === 'SUBMITTED')

  const toggle = (lecNo: number) =>
    setChecked((s) => {
      const n = new Set(s)
      if (n.has(lecNo)) n.delete(lecNo)
      else n.add(lecNo)
      return n
    })

  const confirmGrades = async (lecNos: number[]) => {
    if (!lecNos.length) return
    if (!confirm(`${lecNos.length}개 강의의 성적을 확정할까요? 확정 후에는 고칠 수 없습니다.`))
      return
    setBusy(true)
    try {
      const r = await adminApi.confirmGrades(lecNos)
      toast(`${r.confirmed.length}개 강의의 성적을 확정했습니다.`)
      setChecked(new Set())
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="성적 확정"
        actions={
          <>
            {data && <SemesterSelect value={semNo ?? data.semNo} onChange={setSemNo} />}
            <button
              className="btn btn-primary"
              disabled={busy || checked.size === 0 || !data?.confirmable}
              onClick={() => confirmGrades([...checked])}
            >
              선택 확정 ({checked.size})
            </button>
          </>
        }
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          {!data.confirmable && (
            <Notice>
              아직 확정할 수 있는 시기가 아닙니다
              {data.gradeEnd && ` (성적 입력 기간 종료: ${formatDateTime(data.gradeEnd)})`}.
            </Notice>
          )}
          <p className="muted small">
            상태별 강의 수는 아래 거르기와 상관없이 학기 전체 기준입니다(폐강 제외). 미입력·입력중
            강의는 교수에게 연락해 제출을 받으세요.
          </p>
          <div className="stats">
            {STATS.map((s) => (
              <Stat key={s} label={GRD_STAT_LABEL[s]} value={`${data.counts[s]}개`} />
            ))}
          </div>
          <div className="seg seg-lg">
            <button className={filter === null ? 'on' : ''} onClick={() => setFilter(null)}>
              전체
            </button>
            {STATS.map((s) => (
              <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>
                {GRD_STAT_LABEL[s]}
              </button>
            ))}
          </div>
          {data.lectures.length === 0 ? (
            <Empty>해당하는 강의가 없습니다.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="제출된 강의 모두 선택"
                        disabled={submitted.length === 0}
                        checked={
                          submitted.length > 0 && submitted.every((l) => checked.has(l.lecNo))
                        }
                        onChange={(e) =>
                          setChecked(
                            e.target.checked ? new Set(submitted.map((l) => l.lecNo)) : new Set(),
                          )
                        }
                      />
                    </th>
                    <th>과목코드</th>
                    <th>과목명</th>
                    <th>분반</th>
                    <th>교수명</th>
                    <th>연락처</th>
                    <th className="num">수강 인원</th>
                    <th>성적상태</th>
                    <th>확정일시</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lectures.map((l) => (
                    <tr key={l.lecNo}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={l.grdStat !== 'SUBMITTED'}
                          checked={checked.has(l.lecNo)}
                          onChange={() => toggle(l.lecNo)}
                        />
                      </td>
                      <td className="mono">{l.crsCd}</td>
                      <td>{l.crsNm}</td>
                      <td>{l.sectNo}</td>
                      <td>{l.profNm}</td>
                      <td>
                        {l.profEmail ? <a href={`mailto:${l.profEmail}`}>{l.profEmail}</a> : '-'}
                      </td>
                      <td className="num">{l.enrlCnt}</td>
                      <td>
                        <GradeStatusBadge status={l.grdStat} />
                      </td>
                      <td>{formatDateTime(l.cnfmDtm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
