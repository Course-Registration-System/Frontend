// 강의 상세: 수강생·계획서·조교·성적 탭
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router'
import { teachingApi } from '../../api'
import { Badge, ErrorBox, GradeStatusBadge, Loading } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatRooms, formatTimes, semesterLabel } from '../../lib/format'
import type { TeachingLectureDetail } from '../../types'

export interface DetailCtx {
  detail: TeachingLectureDetail
  reload: () => Promise<void>
}

// eslint-disable-next-line react/only-export-components
export const useDetail = () => useOutletContext<DetailCtx>()

export default function LectureDetailLayout() {
  const lecNo = Number(useParams().lecNo)
  const { data, error, loading, reload } = useAsync(() => teachingApi.detail(lecNo), [lecNo])

  if (error)
    return (
      <>
        <Link to="/teaching/lectures" className="back">
          ← 담당 강의 목록
        </Link>
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  if (loading && !data) return <Loading />
  if (!data) return null
  const l = data.lecture
  const tabs = [
    { to: 'students', label: '수강생' },
    { to: 'syllabus', label: '계획서' },
    ...(data.myRole === 'PROFESSOR' ? [{ to: 'assistants', label: '조교' }] : []),
    { to: 'grades', label: '성적' },
  ]

  return (
    <>
      <Link to="/teaching/lectures" className="back">
        ← 담당 강의 목록
      </Link>
      <div className="page-header">
        <div>
          <h1>
            {l.courseName} <span className="muted">{l.section}분반</span>
          </h1>
          <p className="muted">
            {semesterLabel(l.semesterId)} · {l.courseCode} · {l.credits}학점 ·{' '}
            {formatTimes(l.times)} · {formatRooms(l.times)} · 수강 {l.enrolledCount}/{l.capacity}명
          </p>
        </div>
        <div className="page-actions">
          {l.gradingType === 'PF' && <Badge>P/F</Badge>}
          {l.isEnglish && <Badge tone="blue">EN</Badge>}
          {data.myRole === 'ASSISTANT' && <Badge tone="amber">조교</Badge>}
          성적상태 <GradeStatusBadge status={l.gradeStatus} />
        </div>
      </div>
      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className="tab">
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="tab-body">
        <Outlet context={{ detail: data, reload } satisfies DetailCtx} />
      </div>
    </>
  )
}
