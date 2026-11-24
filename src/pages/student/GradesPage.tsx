// GRD-03 성적 조회 (확정된 성적만)
import { useState } from 'react'
import { studentApi } from '../../api'
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

const fmt = (n: number | null) => (n == null ? '-' : n.toFixed(2))

export default function GradesPage() {
  const [semesterId, setSemesterId] = useState('')
  const sems = useAsync(() => studentApi.gradeSemesters(), [])
  const { data, error, loading, reload } = useAsync(
    () => (semesterId ? studentApi.transcript(semesterId) : Promise.resolve(null)),
    [semesterId],
  )

  if (sems.data && sems.data.length === 0)
    return (
      <>
        <PageHeader title="성적 조회" />
        <Empty>확정된 성적이 아직 없습니다.</Empty>
      </>
    )

  return (
    <>
      <PageHeader
        title="성적 조회"
        desc="성적이 확정된 학기만 볼 수 있습니다."
        actions={
          sems.data && (
            <SemesterSelect value={semesterId} onChange={setSemesterId} only={sems.data} />
          )
        }
      />
      {(error || sems.error) && <ErrorBox message={(error || sems.error)!} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats">
            <Stat label="학기 평점" value={fmt(data.semesterGpa)} sub="4.5 만점" />
            <Stat label="학기 취득 학점" value={`${data.semesterCredits}학점`} />
            <Stat
              label="누적 평점"
              value={fmt(data.cumulativeGpa)}
              sub="재수강 시 최근 성적 반영"
            />
            <Stat label="누적 이수 학점" value={`${data.cumulativeCredits}학점`} />
          </div>
          {data.rows.length === 0 ? (
            <Empty>이 학기에 확정된 성적이 없습니다.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>과목코드</th>
                    <th>과목명</th>
                    <th className="num">학점</th>
                    <th>등급</th>
                    <th className="num">평점</th>
                    <th>재수강</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.courseCode}>
                      <td className="mono">{r.courseCode}</td>
                      <td>
                        {r.courseName} {r.gradingType === 'PF' && <Badge>P/F</Badge>}
                      </td>
                      <td className="num">{r.credits}</td>
                      <td>
                        <b className={r.letter === 'F' ? 'text-danger' : ''}>{r.letter}</b>
                      </td>
                      <td className="num">{r.point == null ? '-' : r.point.toFixed(1)}</td>
                      <td>{r.isRetake && <Badge tone="amber">재수강</Badge>}</td>
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
