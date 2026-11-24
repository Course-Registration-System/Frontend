// LEC-02 수강생 명단. 볼 수 있는 시기인지는 서버가 판단한다.
import { teachingApi } from '../../api'
import { Empty, ErrorBox, Loading } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useDetail } from './LectureDetailLayout'

export default function StudentsTab() {
  const { lecNo } = useDetail()
  const { data, error, loading, reload } = useAsync(() => teachingApi.students(lecNo), [lecNo])

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
