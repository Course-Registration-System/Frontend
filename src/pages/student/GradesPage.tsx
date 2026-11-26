// GRD-03 성적 조회 (확정된 성적만). 서버가 전체 학기를 주고 학기 선택은 화면이 한다.
import { useState } from 'react'
import { studentApi } from '../../api'
import { Badge, Empty, ErrorBox, Loading, PageHeader, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { cmplLabel, formatGpa, semLabel } from '../../lib/format'

export default function GradesPage() {
  const { data, error, loading, reload } = useAsync(() => studentApi.grades(), [])
  const [picked, setPicked] = useState<number | null>(null)

  if (error)
    return (
      <>
        <PageHeader title="성적 조회" />
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  if (loading && !data) return <Loading />
  if (!data) return null
  if (data.semesters.length === 0)
    return (
      <>
        <PageHeader title="성적 조회" />
        <Empty>확정된 성적이 아직 없습니다.</Empty>
      </>
    )

  // 기본은 가장 최근 학기
  const sem =
    data.semesters.find((s) => s.semNo === picked) ?? data.semesters[data.semesters.length - 1]

  return (
    <>
      <PageHeader
        title="성적 조회"
        actions={
          <label className="inline-field">
            <span>학기</span>
            <select value={sem.semNo} onChange={(e) => setPicked(Number(e.target.value))}>
              {[...data.semesters].reverse().map((s) => (
                <option key={s.semNo} value={s.semNo}>
                  {semLabel(s)}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <div className="stats">
        <Stat label="학기 평점" value={formatGpa(sem.gpa)} sub="4.5 만점" />
        <Stat label="누적 평점" value={formatGpa(data.cumulativeGpa)} />
        <Stat label="누적 이수 학점" value={`${data.earnedCredits}학점`} />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>과목코드</th>
              <th>과목명</th>
              <th className="num">학점</th>
              <th>이수구분</th>
              <th>등급</th>
              <th className="num">평점</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {sem.grades.map((r) => (
              <tr key={r.lecNo} className={r.counted ? '' : 'row-muted'}>
                <td className="mono">{r.crsCd}</td>
                <td>
                  {r.crsNm}
                  {r.evalType === 'PASS_FAIL' && <Badge>P/F</Badge>}
                </td>
                <td className="num">{r.crdt}</td>
                <td>{cmplLabel(r.cmplType)}</td>
                <td>
                  <b className={r.ltrGrd === 'F' ? 'text-danger' : ''}>{r.ltrGrd}</b>
                </td>
                <td className="num">
                  {r.gradePoint == null ? '-' : Number(r.gradePoint).toFixed(1)}
                </td>
                <td>
                  {r.retake && <Badge tone="amber">재수강</Badge>}
                  {!r.counted && <span className="muted small">재수강으로 대체됨</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
