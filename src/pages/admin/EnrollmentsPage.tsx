// REG-05 수강신청 현황 관리: 강의별 현황 조회, 관리자 추가·취소
// 추가·취소할 수 있는 기간인지는 서버가 판단하고, 거절되면 사유를 그대로 보여준다.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import {
  Badge,
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  SemesterSelect,
  Stat,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime, formatSlots, PROC_TYPE_LABEL } from '../../lib/format'
import type { LectureResponse } from '../../types'

export default function AdminEnrollmentsPage() {
  const [semNo, setSemNo] = useState<number | null>(null)
  const [params, setParams] = useSearchParams()
  const lecNo = Number(params.get('lecNo')) || null
  const lectures = useAsync(
    () => (semNo != null ? adminApi.lectures(semNo) : Promise.resolve(null)),
    [semNo],
  )
  const open = (lectures.data ?? []).filter((l) => l.lecStat === 'OPEN')
  const selected = open.find((l) => l.lecNo === lecNo)

  return (
    <>
      <PageHeader
        title="수강신청 현황"
        actions={<SemesterSelect value={semNo} onChange={setSemNo} />}
      />
      <div className="filters">
        <label className="grow">
          강의
          <select
            value={lecNo ?? ''}
            onChange={(e) => setParams(e.target.value ? { lecNo: e.target.value } : {})}
          >
            <option value="">강의를 고르세요</option>
            {open.map((l) => (
              <option key={l.lecNo} value={l.lecNo}>
                {l.crsCd} {l.crsNm} ({l.sectNo}) · {l.profNm} · {l.enrlCnt}/{l.cap}
              </option>
            ))}
          </select>
        </label>
      </div>
      {lectures.error && <ErrorBox message={lectures.error} onRetry={lectures.reload} />}
      {lecNo ? (
        <Status lecNo={lecNo} lecture={selected} onChanged={lectures.reload} />
      ) : (
        <Empty>강의를 고르면 신청 현황이 보입니다.</Empty>
      )}
    </>
  )
}

function Status({
  lecNo,
  lecture,
  onChanged,
}: {
  lecNo: number
  lecture?: LectureResponse
  onChanged: () => void
}) {
  const toast = useToast()
  const { data, error, loading, reload, setData } = useAsync(
    () => adminApi.enrollmentStatus(lecNo),
    [lecNo],
  )
  const [stdNo, setStdNo] = useState('')
  const [busy, setBusy] = useState(false)

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!stdNo.trim()) return
    setBusy(true)
    try {
      setData(await adminApi.addEnrollment(lecNo, stdNo.trim()))
      toast('추가했습니다.')
      setStdNo('')
      onChanged()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }
  const cancel = async (no: string, name: string) => {
    if (!confirm(`${name}(${no})의 신청을 취소할까요?`)) return
    setBusy(true)
    try {
      await adminApi.cancelEnrollment(lecNo, no)
      toast('취소했습니다.')
      await reload()
      onChanged()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="stats">
        {lecture && (
          <Stat
            label="강의"
            value={`${lecture.crsNm} (${lecture.sectNo})`}
            sub={`${lecture.profNm} · ${formatSlots(lecture.timeSlots)}`}
          />
        )}
        <Stat label="정원" value={data.cap} />
        <Stat label="신청 인원" value={data.enrlCnt} />
        <Stat
          label="잔여 인원"
          value={data.remaining <= 0 ? <span className="text-danger">마감</span> : data.remaining}
        />
      </div>
      <section className="card">
        <h2>수강 추가</h2>
        <form className="inline-form" onSubmit={add}>
          <input
            placeholder="학번"
            inputMode="numeric"
            value={stdNo}
            onChange={(e) => setStdNo(e.target.value)}
          />
          <button className="btn btn-primary" disabled={busy}>
            추가
          </button>
        </form>
      </section>
      {data.students.length === 0 ? (
        <Empty>신청한 학생이 없습니다.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>학번</th>
                <th>이름</th>
                <th className="num">학년</th>
                <th>신청일시</th>
                <th>처리구분</th>
                <th>비고</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.stdNo}>
                  <td className="mono">{s.stdNo}</td>
                  <td>{s.stdNm}</td>
                  <td className="num">{s.yrLvl}</td>
                  <td>{formatDateTime(s.enrlDtm)}</td>
                  <td>
                    {s.procType === 'ADMIN' ? (
                      <Badge tone="blue">{PROC_TYPE_LABEL.ADMIN}</Badge>
                    ) : (
                      PROC_TYPE_LABEL.STUDENT
                    )}
                  </td>
                  <td>{s.retake && <Badge tone="amber">재수강</Badge>}</td>
                  <td className="row-actions">
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busy}
                      onClick={() => cancel(s.stdNo, s.stdNm)}
                    >
                      취소
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
