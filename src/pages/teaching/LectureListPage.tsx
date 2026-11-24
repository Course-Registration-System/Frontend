// LEC-01 담당 강의 목록
import { useState } from 'react'
import { Link } from 'react-router'
import { teachingApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import {
  Empty,
  ErrorBox,
  LectureStatusBadge,
  Loading,
  PageHeader,
  SemesterSelect,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatPlaces, formatSlots } from '../../lib/format'

export default function LectureListPage() {
  const { user } = useAuth()
  // 처음에는 비워서 보낸다: 서버가 현재 학기로 정한다
  const [semNo, setSemNo] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(
    () => teachingApi.lectures(semNo ?? undefined),
    [semNo],
  )

  return (
    <>
      <PageHeader
        title={user?.role === 'STUDENT' ? '배정된 강의' : '담당 강의'}
        actions={data && <SemesterSelect value={semNo ?? data.semNo} onChange={setSemNo} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.lectures.length === 0 ? (
          <Empty>이 학기 담당 강의가 없습니다.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>과목코드</th>
                  <th>과목명</th>
                  <th>분반</th>
                  <th>요일·시간</th>
                  <th>강의실</th>
                  <th className="num">정원</th>
                  <th className="num">수강 인원</th>
                  <th>강의상태</th>
                </tr>
              </thead>
              <tbody>
                {data.lectures.map((l) => (
                  <tr key={l.lecNo} className={l.lecStat === 'CLOSED' ? 'row-muted' : ''}>
                    <td className="mono">{l.crsCd}</td>
                    <td>
                      {l.lecStat === 'CLOSED' ? (
                        l.crsNm
                      ) : (
                        <Link to={`/teaching/lectures/${l.lecNo}`} state={l}>
                          {l.crsNm}
                        </Link>
                      )}
                    </td>
                    <td>{l.sectNo}</td>
                    <td>{formatSlots(l.timeSlots)}</td>
                    <td>{formatPlaces(l.timeSlots)}</td>
                    <td className="num">{l.cap}</td>
                    <td className="num">{l.enrlCnt}</td>
                    <td>
                      <LectureStatusBadge status={l.lecStat} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </>
  )
}
