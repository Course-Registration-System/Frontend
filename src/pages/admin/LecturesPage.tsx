// ACA-03 강의 개설 관리
import { useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  LectureStatusBadge,
  Loading,
  Modal,
  PageHeader,
  SemesterSelect,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { DAY_LABEL, DAYS, formatRooms, formatTimes, PERIODS } from '../../lib/format'
import type { Day, Lecture, LectureForm, LectureTime } from '../../types'

export default function LecturesPage() {
  const toast = useToast()
  const [semesterId, setSemesterId] = useState('')
  const { data, error, loading, reload } = useAsync(
    () => (semesterId ? adminApi.lectures(semesterId) : Promise.resolve(null)),
    [semesterId],
  )
  const [editing, setEditing] = useState<{ lecNo?: number; form: LectureForm } | null>(null)

  const close = async (l: Lecture) => {
    if (
      !confirm(
        `${l.courseName} ${l.section}분반을 폐강할까요? 신청한 학생 ${l.enrolledCount}명의 신청이 모두 취소됩니다.`,
      )
    )
      return
    try {
      await adminApi.closeLecture(l.lecNo)
      toast('폐강 처리했습니다.')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="강의 개설 관리"
        desc="과목을 골라 분반·교수·정원·강의시간을 정해 강의를 개설합니다."
        actions={
          <>
            <SemesterSelect value={semesterId} onChange={setSemesterId} />
            <button
              className="btn btn-primary"
              disabled={!semesterId}
              onClick={() =>
                setEditing({
                  form: {
                    semesterId,
                    courseCode: '',
                    section: '01',
                    professorNo: '',
                    capacity: 40,
                    isEnglish: false,
                    excludeRelative: false,
                    times: [{ day: 'MON', startPeriod: 1, endPeriod: 2, room: '' }],
                  },
                })
              }
            >
              강의 개설
            </button>
          </>
        }
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.length === 0 ? (
          <Empty>개설된 강의가 없습니다.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>과목코드</th>
                  <th>과목명</th>
                  <th>분반</th>
                  <th>교수명</th>
                  <th>요일·시간</th>
                  <th>강의실</th>
                  <th className="num">정원</th>
                  <th className="num">신청</th>
                  <th>옵션</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.lecNo} className={l.status === 'CLOSED' ? 'row-muted' : ''}>
                    <td className="mono">{l.courseCode}</td>
                    <td>{l.courseName}</td>
                    <td>{l.section}</td>
                    <td>{l.professorName}</td>
                    <td>{formatTimes(l.times)}</td>
                    <td>{formatRooms(l.times)}</td>
                    <td className="num">{l.capacity}</td>
                    <td className="num">{l.enrolledCount}</td>
                    <td>
                      {l.isEnglish && <Badge tone="blue">EN</Badge>}
                      {l.excludeRelative && <Badge>상대평가 제외</Badge>}
                    </td>
                    <td>
                      <LectureStatusBadge status={l.status} />
                    </td>
                    <td className="row-actions">
                      <button
                        className="btn btn-sm"
                        disabled={l.status === 'CLOSED'}
                        onClick={() =>
                          setEditing({
                            lecNo: l.lecNo,
                            form: {
                              semesterId: l.semesterId,
                              courseCode: l.courseCode,
                              section: l.section,
                              professorNo: l.professorNo,
                              capacity: l.capacity,
                              isEnglish: l.isEnglish,
                              excludeRelative: l.excludeRelative,
                              times: l.times,
                            },
                          })
                        }
                      >
                        수정
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={l.status === 'CLOSED'}
                        onClick={() => close(l)}
                      >
                        폐강
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {editing && (
        <LectureModal
          lecNo={editing.lecNo}
          initial={editing.form}
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

function LectureModal({
  lecNo,
  initial,
  onClose,
  onSaved,
}: {
  lecNo?: number
  initial: LectureForm
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const refs = useAsync(
    () => Promise.all([adminApi.courses(), adminApi.users({ role: 'PROFESSOR' })]),
    [],
  )
  const [f, setF] = useState<LectureForm>(initial)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof LectureForm>(k: K, v: LectureForm[K]) =>
    setF((x) => ({ ...x, [k]: v }))
  const setTime = (i: number, patch: Partial<LectureTime>) =>
    set(
      'times',
      f.times.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      if (lecNo) await adminApi.updateLecture(lecNo, f)
      else await adminApi.createLecture(f)
      toast('저장했습니다.')
      onSaved()
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const [courses, profs] = refs.data ?? [[], []]
  return (
    <Modal
      title={lecNo ? '강의 수정' : '강의 개설'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" form="lecture-form" disabled={busy}>
            저장
          </button>
        </>
      }
    >
      {refs.loading && !refs.data ? (
        <Loading />
      ) : (
        <form id="lecture-form" className="form-grid" onSubmit={submit}>
          <Field label="과목">
            <select
              value={f.courseCode}
              disabled={!!lecNo}
              onChange={(e) => set('courseCode', e.target.value)}
              required
            >
              <option value="">선택</option>
              {courses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="분반">
            <input value={f.section} onChange={(e) => set('section', e.target.value)} required />
          </Field>
          <Field label="담당 교수">
            <select
              value={f.professorNo}
              onChange={(e) => set('professorNo', e.target.value)}
              required
            >
              <option value="">선택</option>
              {profs
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.userNo} value={p.userNo}>
                    {p.name} ({p.deptName})
                  </option>
                ))}
            </select>
          </Field>
          <Field label="정원">
            <input
              type="number"
              min={1}
              value={f.capacity}
              onChange={(e) => set('capacity', Number(e.target.value))}
            />
          </Field>
          <div className="span-2 checks">
            <label>
              <input
                type="checkbox"
                checked={f.isEnglish}
                onChange={(e) => set('isEnglish', e.target.checked)}
              />{' '}
              영어강의(EN)
            </label>
            <label>
              <input
                type="checkbox"
                checked={f.excludeRelative}
                onChange={(e) => set('excludeRelative', e.target.checked)}
              />{' '}
              상대평가 제외
            </label>
          </div>
          <div className="span-2">
            <span className="field-label">강의시간</span>
            <table className="table compact">
              <thead>
                <tr>
                  <th>요일</th>
                  <th>시작 교시</th>
                  <th>종료 교시</th>
                  <th>강의실</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {f.times.map((t, i) => (
                  <tr key={i}>
                    <td>
                      <select
                        value={t.day}
                        onChange={(e) => setTime(i, { day: e.target.value as Day })}
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {DAY_LABEL[d]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={t.startPeriod}
                        onChange={(e) => setTime(i, { startPeriod: Number(e.target.value) })}
                      >
                        {PERIODS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={t.endPeriod}
                        onChange={(e) => setTime(i, { endPeriod: Number(e.target.value) })}
                      >
                        {PERIODS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={t.room}
                        onChange={(e) => setTime(i, { room: e.target.value })}
                        placeholder="예: 공학관 301"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={f.times.length === 1}
                        onClick={() =>
                          set(
                            'times',
                            f.times.filter((_, j) => j !== i),
                          )
                        }
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                set('times', [
                  ...f.times,
                  { day: 'WED', startPeriod: 1, endPeriod: 1, room: f.times[0]?.room ?? '' },
                ])
              }
            >
              + 시간 추가
            </button>
          </div>
          {err && <p className="form-error span-2">{err}</p>}
        </form>
      )}
    </Modal>
  )
}
