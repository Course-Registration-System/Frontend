// REG-04 시간표
import { useState } from 'react'
import { studentApi } from '../../api'
import { Timetable } from '../../components/Timetable'
import { ErrorBox, Loading, PageHeader, SemesterSelect, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'

export default function TimetablePage() {
  const [semesterId, setSemesterId] = useState('')
  const { data, error, loading, reload } = useAsync(
    () => (semesterId ? studentApi.enrollments(semesterId) : Promise.resolve(null)),
    [semesterId],
  )
  const lectures = (data ?? []).map((e) => e.lecture)
  const credits = lectures.reduce((s, l) => s + l.credits, 0)

  return (
    <>
      <PageHeader
        title="시간표"
        desc="신청한 강의를 주간 시간표로 봅니다. 취소·폐강된 강의는 표시하지 않습니다."
        actions={<SemesterSelect value={semesterId} onChange={setSemesterId} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats">
            <Stat label="신청 강의" value={`${lectures.length}개`} />
            <Stat label="총 신청 학점" value={`${credits}학점`} />
          </div>
          <Timetable lectures={lectures} />
        </>
      )}
    </>
  )
}
