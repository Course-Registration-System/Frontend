// 강의 상세: 수강생·계획서·조교·성적 탭
// 강의 정보는 계획서 조회(LEC-03) 응답으로 채우고, 목록에서 넘어온 경우 시간·인원도 보여 준다.
import { Link, NavLink, Outlet, useLocation, useOutletContext, useParams } from 'react-router'
import { teachingApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Badge, ErrorBox, Loading } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatPlaces, formatSlots } from '../../lib/format'
import type { LecturePlanResponse, TeachingLectureItem } from '../../types'

export interface DetailCtx {
  lecNo: number
  plan: LecturePlanResponse
  myRole: 'PROFESSOR' | 'ASSISTANT'
  reload: () => Promise<void>
}

// eslint-disable-next-line react/only-export-components
export const useDetail = () => useOutletContext<DetailCtx>()

export default function LectureDetailLayout() {
  const lecNo = Number(useParams().lecNo)
  const { user } = useAuth()
  const item = useLocation().state as TeachingLectureItem | null
  const { data, error, loading, reload } = useAsync(() => teachingApi.plan(lecNo), [lecNo])
  const myRole = user?.role === 'PROFESSOR' ? 'PROFESSOR' : 'ASSISTANT'

  const back = (
    <Link to="/teaching/lectures" className="back">
      ← 담당 강의 목록
    </Link>
  )
  if (error)
    return (
      <>
        {back}
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  if (loading && !data) return <Loading />
  if (!data) return null
  const tabs = [
    { to: 'students', label: '수강생' },
    { to: 'syllabus', label: '계획서' },
    ...(myRole === 'PROFESSOR' ? [{ to: 'assistants', label: '조교' }] : []),
    { to: 'grades', label: '성적' },
  ]

  return (
    <>
      {back}
      <div className="page-header">
        <div>
          <h1>
            {data.crsNm} <span className="muted">{data.sectNo}분반</span>
          </h1>
          <p className="muted">
            {data.crsCd}
            {item?.lecNo === lecNo &&
              ` · ${formatSlots(item.timeSlots)} · ${formatPlaces(item.timeSlots)} · 수강 ${item.enrlCnt}/${item.cap}명`}
          </p>
        </div>
        <div className="page-actions">
          {data.evalType === 'PASS_FAIL' && <Badge>P/F</Badge>}
          {myRole === 'ASSISTANT' && <Badge tone="amber">조교</Badge>}
        </div>
      </div>
      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} state={item} className="tab">
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="tab-body">
        <Outlet context={{ lecNo, plan: data, myRole, reload } satisfies DetailCtx} />
      </div>
    </>
  )
}
