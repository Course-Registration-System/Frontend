// GRD-01 성적 입력: 저장 → 입력중, 제출 → 제출
import { useState } from 'react'
import { teachingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, GradeStatusBadge, Loading, Notice } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { letterOf, pointOf, RELATIVE_LIMITS, relativeRatio, totalScore } from '../../lib/grades'
import type { GradeRow, GradeSheet, LetterGrade, Scores } from '../../types'
import { useDetail } from './LectureDetailLayout'

const SCORE_FIELDS: [keyof Scores, string][] = [
  ['midterm', '중간'],
  ['final', '기말'],
  ['assignment', '과제'],
  ['attendance', '출석'],
]

export default function GradesTab() {
  const { detail, reload: reloadDetail } = useDetail()
  const toast = useToast()
  const lecNo = detail.lecture.lecNo
  const { data, error, loading, reload, setData } = useAsync(
    () => teachingApi.gradeSheet(lecNo),
    [lecNo],
  )
  // 저장 전 편집본. null 이면 서버 값을 그대로 보여준다
  const [edits, setEdits] = useState<GradeRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const rows = edits ?? data?.rows ?? []
  const dirty = edits !== null

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null
  if (data.rows.length === 0) return <Empty>수강생이 없습니다.</Empty>

  const pf = data.gradingType === 'PF'
  const ratios = data.ratios
  const editable = data.editable

  const computed = rows.map((r) => {
    if (pf) return { total: null, letter: r.pf as LetterGrade | null, point: null }
    const total = ratios ? totalScore(r.scores, ratios) : null
    const letter = total == null ? null : letterOf(total)
    return { total, letter, point: letter ? pointOf(letter) : null }
  })
  const missing = computed.filter((c) => c.letter == null).length
  const letters = computed.map((c) => c.letter).filter((l): l is LetterGrade => !!l)
  const relative = !pf && !data.excludeRelative ? relativeRatio(letters) : null

  const setScore = (i: number, k: keyof Scores, v: string) => {
    const n = v === '' ? null : Math.max(0, Math.min(100, Number(v)))
    setEdits(rows.map((r, j) => (j === i ? { ...r, scores: { ...r.scores, [k]: n } } : r)))
  }
  const setPf = (i: number, v: 'P' | 'F' | null) => {
    setEdits(rows.map((r, j) => (j === i ? { ...r, pf: v } : r)))
  }

  const call = async (fn: () => Promise<GradeSheet>, ok: string) => {
    setBusy(true)
    try {
      setData(await fn())
      setEdits(null)
      toast(ok)
      await reloadDetail()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  const save = () =>
    call(
      () =>
        teachingApi.saveGrades(
          lecNo,
          rows.map(({ enrollmentId, scores, pf }) => ({ enrollmentId, scores, pf })),
        ),
      '저장했습니다. 성적상태가 입력중이 되었습니다.',
    )
  const submit = () => {
    if (!confirm('성적을 제출할까요? 관리자가 확정하기 전까지는 다시 수정할 수 있습니다.')) return
    call(() => teachingApi.submitGrades(lecNo), '제출했습니다.')
  }

  const canSubmit =
    editable &&
    !dirty &&
    data.gradeStatus === 'IN_PROGRESS' &&
    missing === 0 &&
    (relative?.ok ?? true)

  return (
    <div className="stack">
      <div className="grade-bar">
        <span>
          성적상태 <GradeStatusBadge status={data.gradeStatus} />
        </span>
        {!pf && ratios && (
          <span className="muted small">
            반영 비율 중간 {ratios.midterm} · 기말 {ratios.final} · 과제 {ratios.assignment} · 출석{' '}
            {ratios.attendance}
          </span>
        )}
        <span className="muted small">
          입력 {rows.length - missing}/{rows.length}명
        </span>
        {relative && (
          <span className={`small ${relative.ok ? 'muted' : 'text-danger'}`}>
            A {relative.aPct}% (상한 {RELATIVE_LIMITS.A}%) · A+B {relative.abPct}% (상한{' '}
            {RELATIVE_LIMITS.AB}%)
          </span>
        )}
        {data.excludeRelative && !pf && <Badge>상대평가 제외</Badge>}
        <span className="spacer" />
        {editable && (
          <>
            <button className="btn" disabled={busy || !dirty} onClick={save}>
              저장
            </button>
            <button className="btn btn-primary" disabled={busy || !canSubmit} onClick={submit}>
              제출
            </button>
          </>
        )}
      </div>
      {!editable && data.lockedReason && (
        <Notice kind="warn">{data.lockedReason} (읽기 전용)</Notice>
      )}
      {editable && data.gradeStatus === 'SUBMITTED' && (
        <Notice>
          제출된 성적입니다. 수정해 저장하면 다시 입력중 상태가 되며, 다시 제출해야 합니다.
        </Notice>
      )}
      {editable && dirty && (
        <Notice>저장하지 않은 변경 사항이 있습니다. 제출하려면 먼저 저장하세요.</Notice>
      )}

      <div className="table-wrap">
        <table className="table grade-table">
          <thead>
            <tr>
              <th>학번</th>
              <th>이름</th>
              <th>학과</th>
              {pf ? (
                <th>P/F</th>
              ) : (
                <>
                  {SCORE_FIELDS.map(([k, label]) => (
                    <th key={k} className="num">
                      {label}
                    </th>
                  ))}
                  <th className="num">총점</th>
                  <th>등급</th>
                  <th className="num">평점</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.enrollmentId}>
                <td className="mono">{r.studentNo}</td>
                <td>{r.name}</td>
                <td>{r.deptName}</td>
                {pf ? (
                  <td>
                    <div className="seg">
                      {(['P', 'F'] as const).map((v) => (
                        <button
                          key={v}
                          className={r.pf === v ? 'on' : ''}
                          disabled={!editable}
                          onClick={() => setPf(i, r.pf === v ? null : v)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </td>
                ) : (
                  <>
                    {SCORE_FIELDS.map(([k]) => (
                      <td key={k} className="num">
                        <input
                          className="score"
                          type="number"
                          min={0}
                          max={100}
                          value={r.scores[k] ?? ''}
                          disabled={!editable}
                          onChange={(e) => setScore(i, k, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="num">{computed[i].total ?? '-'}</td>
                    <td>
                      <b>{computed[i].letter ?? '-'}</b>
                    </td>
                    <td className="num">{computed[i].point?.toFixed(1) ?? '-'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
