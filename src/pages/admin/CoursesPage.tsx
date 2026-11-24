// ACA-02 과목 관리 (과목코드 수정 불가, 삭제 없음)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHeader } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { CATEGORIES, DEPARTMENTS } from '../../lib/format'
import { LETTERS } from '../../lib/grades'
import type { Category, Course, GradingType, LetterGrade } from '../../types'

const EMPTY: Course = {
  code: '',
  name: '',
  credits: 3,
  category: '전공선택',
  deptName: DEPARTMENTS[0],
  targetGrade: 1,
  gradingType: 'GRADE',
  prerequisites: [],
}

export default function CoursesPage() {
  const { data, error, loading, reload } = useAsync(() => adminApi.courses(), [])
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState<{ mode: 'new' | 'edit'; course: Course } | null>(null)
  const list = (data ?? []).filter(
    (c) => !keyword || c.code.includes(keyword) || c.name.includes(keyword),
  )

  return (
    <>
      <PageHeader
        title="과목 관리"
        desc="과목과 선수과목을 등록합니다. 과목코드는 등록 후 바꿀 수 없고, 과목은 삭제하지 않습니다."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setEditing({ mode: 'new', course: EMPTY })}
          >
            과목 등록
          </button>
        }
      />
      <div className="filters">
        <label>
          과목코드·과목명
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (list.length === 0 ? (
          <Empty>과목이 없습니다.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>과목코드</th>
                  <th>과목명</th>
                  <th className="num">학점</th>
                  <th>이수구분</th>
                  <th>개설학과</th>
                  <th className="num">학년</th>
                  <th>평가</th>
                  <th>선수과목</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.code}>
                    <td className="mono">{c.code}</td>
                    <td>{c.name}</td>
                    <td className="num">{c.credits}</td>
                    <td>{c.category}</td>
                    <td>{c.deptName}</td>
                    <td className="num">{c.targetGrade}</td>
                    <td>{c.gradingType === 'PF' ? <Badge>P/F</Badge> : '등급'}</td>
                    <td className="small">
                      {c.prerequisites
                        .map((p) => `${p.courseName ?? p.courseCode} (${p.minGrade} 이상)`)
                        .join(', ') || '-'}
                    </td>
                    <td className="row-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditing({ mode: 'edit', course: c })}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {editing && data && (
        <CourseModal
          mode={editing.mode}
          initial={editing.course}
          courses={data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}

function CourseModal({
  mode,
  initial,
  courses,
  onClose,
  onSaved,
}: {
  mode: 'new' | 'edit'
  initial: Course
  courses: Course[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [f, setF] = useState<Course>(initial)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Course>(k: K, v: Course[K]) => setF((x) => ({ ...x, [k]: v }))
  const candidates = courses.filter(
    (c) => c.code !== f.code && !f.prerequisites.some((p) => p.courseCode === c.code),
  )
  const [preCode, setPreCode] = useState('')
  const [preGrade, setPreGrade] = useState<LetterGrade>('C0')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      if (mode === 'new') await adminApi.createCourse(f)
      else await adminApi.updateCourse(f)
      toast('저장했습니다.')
      onSaved()
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={mode === 'new' ? '과목 등록' : '과목 수정'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" form="course-form" disabled={busy}>
            저장
          </button>
        </>
      }
    >
      <form id="course-form" className="form-grid" onSubmit={submit}>
        <Field label="과목코드" hint={mode === 'edit' ? '등록 후 바꿀 수 없습니다.' : undefined}>
          <input
            value={f.code}
            disabled={mode === 'edit'}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            required
          />
        </Field>
        <Field label="과목명">
          <input value={f.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="학점">
          <input
            type="number"
            min={0}
            max={6}
            value={f.credits}
            onChange={(e) => set('credits', Number(e.target.value))}
          />
        </Field>
        <Field label="이수구분">
          <select value={f.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="개설학과">
          <select value={f.deptName} onChange={(e) => set('deptName', e.target.value)}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="권장 학년">
          <select
            value={f.targetGrade}
            onChange={(e) => set('targetGrade', Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
        </Field>
        <Field label="평가 방식">
          <select
            value={f.gradingType}
            onChange={(e) => set('gradingType', e.target.value as GradingType)}
          >
            <option value="GRADE">등급제</option>
            <option value="PF">P/F</option>
          </select>
        </Field>
        <div className="span-2">
          <span className="field-label">선수과목 · 최소취득등급</span>
          <ul className="chips-list">
            {f.prerequisites.map((p) => (
              <li key={p.courseCode} className="chip on">
                {courses.find((c) => c.code === p.courseCode)?.name ?? p.courseCode} ({p.minGrade}{' '}
                이상)
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="삭제"
                  onClick={() =>
                    set(
                      'prerequisites',
                      f.prerequisites.filter((x) => x.courseCode !== p.courseCode),
                    )
                  }
                >
                  ×
                </button>
              </li>
            ))}
            {f.prerequisites.length === 0 && <li className="muted small">없음</li>}
          </ul>
          <div className="inline-form">
            <select value={preCode} onChange={(e) => setPreCode(e.target.value)}>
              <option value="">과목 선택</option>
              {candidates.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.name}
                </option>
              ))}
            </select>
            <select value={preGrade} onChange={(e) => setPreGrade(e.target.value as LetterGrade)}>
              {LETTERS.filter((l) => l !== 'F').map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!preCode}
              onClick={() => {
                set('prerequisites', [
                  ...f.prerequisites,
                  { courseCode: preCode, minGrade: preGrade },
                ])
                setPreCode('')
              }}
            >
              추가
            </button>
          </div>
        </div>
        {err && <p className="form-error span-2">{err}</p>}
      </form>
    </Modal>
  )
}
