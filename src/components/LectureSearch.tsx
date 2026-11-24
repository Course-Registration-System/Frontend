// REG-01 강의 검색. 학생용(담기·신청)과 교수용(열람) 화면이 같이 쓴다
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { lectureApi } from '../api'
import { useAsync } from '../hooks/useAsync'
import { CATEGORIES, DEPARTMENTS, formatRooms, formatTimes } from '../lib/format'
import type { Lecture, LectureSearchParams } from '../types'
import { Badge, Empty, ErrorBox, Loading } from './ui'

export function LectureSearch({
  actions,
  semesterId,
}: {
  /** 행별 버튼. 없으면 열람 전용 */
  actions?: (l: Lecture, reload: () => void) => ReactNode
  semesterId?: string
}) {
  const empty: LectureSearchParams = {
    deptName: '',
    targetGrade: '',
    category: '',
    courseName: '',
    professorName: '',
  }
  const [form, setForm] = useState<LectureSearchParams>(empty)
  const [params, setParams] = useState<LectureSearchParams>(empty)
  const { data, error, loading, reload } = useAsync(
    () => lectureApi.search({ ...params, semesterId }),
    [params, semesterId],
  )
  const set = (k: keyof LectureSearchParams) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setParams({ ...form })
  }

  return (
    <>
      <form className="filters" onSubmit={submit}>
        <label>
          학과
          <select value={form.deptName} onChange={set('deptName')}>
            <option value="">전체</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          학년
          <select value={form.targetGrade} onChange={set('targetGrade')}>
            <option value="">전체</option>
            {[1, 2, 3, 4].map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
        </label>
        <label>
          이수구분
          <select value={form.category} onChange={set('category')}>
            <option value="">전체</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          과목명
          <input value={form.courseName} onChange={set('courseName')} placeholder="예: 자료구조" />
        </label>
        <label>
          교수명
          <input value={form.professorName} onChange={set('professorName')} />
        </label>
        <div className="filters-actions">
          <button className="btn btn-primary" type="submit">
            검색
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setForm(empty)
              setParams(empty)
            }}
          >
            초기화
          </button>
        </div>
      </form>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <p className="muted small">검색 결과 {data.length}건</p>
          {data.length === 0 ? (
            <Empty>조건에 맞는 강의가 없습니다.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>과목코드</th>
                    <th>과목명</th>
                    <th>분반</th>
                    <th className="num">학점</th>
                    <th>이수구분</th>
                    <th>교수명</th>
                    <th>요일·시간</th>
                    <th>강의실</th>
                    <th className="num">정원</th>
                    <th className="num">잔여</th>
                    <th>계획서</th>
                    {actions && <th />}
                  </tr>
                </thead>
                <tbody>
                  {data.map((l) => {
                    const left = l.capacity - l.enrolledCount
                    return (
                      <tr key={l.lecNo}>
                        <td className="mono">{l.courseCode}</td>
                        <td>
                          {l.courseName}
                          {l.isEnglish && <Badge tone="blue">EN</Badge>}
                          {l.gradingType === 'PF' && <Badge>P/F</Badge>}
                        </td>
                        <td>{l.section}</td>
                        <td className="num">{l.credits}</td>
                        <td>{l.category}</td>
                        <td>{l.professorName}</td>
                        <td>{formatTimes(l.times)}</td>
                        <td>{formatRooms(l.times)}</td>
                        <td className="num">{l.capacity}</td>
                        <td className="num">{left <= 0 ? <Badge tone="red">마감</Badge> : left}</td>
                        <td>
                          {l.syllabusUrl ? (
                            <a href={l.syllabusUrl} target="_blank" rel="noreferrer">
                              PDF
                            </a>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        {actions && <td className="row-actions">{actions(l, reload)}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
