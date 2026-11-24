// ACA-02 과목 관리: 등록·수정, 선수과목 지정 (삭제 없음)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import {
  Badge,
  DeptSelect,
  Empty,
  ErrorBox,
  Field,
  Loading,
  Modal,
  PageHeader,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { CMPL_TYPES, cmplLabel, EVAL_TYPE_LABEL, MIN_GRADES, YR_LVLS } from '../../lib/format'
import type {
  CmplType,
  CourseResponse,
  EvalType,
  MinGrade,
  PrerequisiteResponse,
} from '../../types'

interface CourseForm {
  crsCd: string
  crsNm: string
  deptNo: number | null
  crdt: number
  cmplType: CmplType
  evalType: EvalType
  rcmdYrLvl: number | null
  prerequisites: PrerequisiteResponse[]
}

const EMPTY: CourseForm = {
  crsCd: '',
  crsNm: '',
  deptNo: null,
  crdt: 3,
  cmplType: 'MAJOR_ELEC',
  evalType: 'GRADE',
  rcmdYrLvl: null,
  prerequisites: [],
}

const samePrereqs = (a: PrerequisiteResponse[], b: PrerequisiteResponse[]) =>
  a.length === b.length &&
  a.every((p) => b.some((q) => q.prereqCrsCd === p.prereqCrsCd && q.minReqGrd === p.minReqGrd))

export default function CoursesPage() {
  const { data, error, loading, reload } = useAsync(() => adminApi.courses(), [])
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState<{ mode: 'new' | 'edit'; course: CourseForm } | null>(null)
  const list = (data ?? []).filter(
    (c) => !keyword || c.crsCd.includes(keyword) || c.crsNm.includes(keyword),
  )

  return (
    <>
      <PageHeader
        title="과목 관리"
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
                  <th>학과</th>
                  <th className="num">권장학년</th>
                  <th>평가방식</th>
                  <th>선수과목</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.crsCd}>
                    <td className="mono">{c.crsCd}</td>
                    <td>{c.crsNm}</td>
                    <td className="num">{c.crdt}</td>
                    <td>{cmplLabel(c.cmplType)}</td>
                    <td>{c.deptNm}</td>
                    <td className="num">{c.rcmdYrLvl ?? '-'}</td>
                    <td>
                      {c.evalType === 'PASS_FAIL' ? <Badge>P/F</Badge> : EVAL_TYPE_LABEL.GRADE}
                    </td>
                    <td className="small">
                      {c.prerequisites
                        .map((p) => `${p.prereqCrsNm} (${p.minReqGrd} 이상)`)
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
  initial: CourseForm
  courses: CourseResponse[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [f, setF] = useState<CourseForm>(initial)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof CourseForm>(k: K, v: CourseForm[K]) =>
    setF((x) => ({ ...x, [k]: v }))
  const candidates = courses.filter(
    (c) => c.crsCd !== f.crsCd && !f.prerequisites.some((p) => p.prereqCrsCd === c.crsCd),
  )
  const [preCode, setPreCode] = useState('')
  // 최소취득등급 기본값은 D-
  const [preGrade, setPreGrade] = useState<MinGrade>('D-')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const body = {
      crsNm: f.crsNm,
      deptNo: f.deptNo as number,
      crdt: f.crdt,
      cmplType: f.cmplType,
      evalType: f.evalType,
      rcmdYrLvl: f.rcmdYrLvl,
    }
    const prerequisites = f.prerequisites.map(({ prereqCrsCd, minReqGrd }) => ({
      prereqCrsCd,
      minReqGrd,
    }))
    try {
      if (mode === 'new') {
        await adminApi.createCourse({ ...body, crsCd: f.crsCd, prerequisites })
      } else {
        // 과목 정보와 선수과목은 API 가 따로다. 선수과목은 바뀐 경우에만 통째로 교체한다
        await adminApi.updateCourse(f.crsCd, body)
        if (!samePrereqs(f.prerequisites, initial.prerequisites))
          await adminApi.replacePrerequisites(f.crsCd, prerequisites)
      }
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
        <Field label="과목코드" hint={mode === 'edit' ? '등록 후 바꿀 수 없습니다.' : '숫자 7자리'}>
          <input
            value={f.crsCd}
            inputMode="numeric"
            disabled={mode === 'edit'}
            onChange={(e) => set('crsCd', e.target.value)}
          />
        </Field>
        <Field label="과목명">
          <input value={f.crsNm} onChange={(e) => set('crsNm', e.target.value)} />
        </Field>
        <Field label="학점" hint="0.5 ~ 4, 0.5 단위">
          <input
            type="number"
            step={0.5}
            value={f.crdt}
            onChange={(e) => set('crdt', Number(e.target.value))}
          />
        </Field>
        <Field label="이수구분">
          <select value={f.cmplType} onChange={(e) => set('cmplType', e.target.value as CmplType)}>
            {CMPL_TYPES.map((c) => (
              <option key={c} value={c}>
                {cmplLabel(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="학과">
          <DeptSelect value={f.deptNo} onChange={(v) => set('deptNo', v)} />
        </Field>
        <Field label="권장학년">
          <select
            value={f.rcmdYrLvl ?? ''}
            onChange={(e) => set('rcmdYrLvl', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">없음</option>
            {YR_LVLS.map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
        </Field>
        <Field label="평가방식">
          <select value={f.evalType} onChange={(e) => set('evalType', e.target.value as EvalType)}>
            <option value="GRADE">{EVAL_TYPE_LABEL.GRADE}</option>
            <option value="PASS_FAIL">{EVAL_TYPE_LABEL.PASS_FAIL}</option>
          </select>
        </Field>
        <div className="span-2">
          <span className="field-label">선수과목 · 최소취득등급</span>
          <ul className="chips-list">
            {f.prerequisites.map((p) => (
              <li key={p.prereqCrsCd} className="chip on">
                {p.prereqCrsNm} ({p.minReqGrd} 이상)
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="삭제"
                  onClick={() =>
                    set(
                      'prerequisites',
                      f.prerequisites.filter((x) => x.prereqCrsCd !== p.prereqCrsCd),
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
                <option key={c.crsCd} value={c.crsCd}>
                  {c.crsCd} {c.crsNm}
                </option>
              ))}
            </select>
            <select value={preGrade} onChange={(e) => setPreGrade(e.target.value as MinGrade)}>
              {MIN_GRADES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!preCode}
              onClick={() => {
                const c = courses.find((x) => x.crsCd === preCode)
                set('prerequisites', [
                  ...f.prerequisites,
                  { prereqCrsCd: preCode, prereqCrsNm: c?.crsNm ?? preCode, minReqGrd: preGrade },
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
