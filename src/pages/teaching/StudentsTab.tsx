// LEC-02 수강생 명단. 신청(정정) 기간이 끝난 뒤부터 볼 수 있고, 시기는 서버가 판단한다.
import { teachingApi } from '../../api'
import { Empty, ErrorBox, Loading, Notice } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useDetail } from './LectureDetailLayout'

export default function StudentsTab() {
  const { lecNo } = useDetail()
  const { data, error, errorCode, loading, reload } = useAsync(
    () => teachingApi.students(lecNo),
    [lecNo],
  )

  if (errorCode === 'ROSTER_NOT_OPEN')
    return <Notice>수강신청·정정 기간이 끝난 뒤에 수강생 명단을 볼 수 있습니다.</Notice>
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null
  if (data.students.length === 0) return <Empty>수강생이 없습니다.</Empty>

  return (
    <>
      <p className="muted small">총 {data.students.length}명</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>학번</th>
              <th>이름</th>
              <th>학과</th>
              <th className="num">학년</th>
              <th>이메일</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.stdNo}>
                <td className="mono">{s.stdNo}</td>
                <td>{s.usrNm}</td>
                <td>{s.deptNm}</td>
                <td className="num">{s.yrLvl}</td>
                <td>{s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
