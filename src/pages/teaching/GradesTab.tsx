// GRD-01 성적 입력·수정. 원점수만 입력하고 총점·최종점수·등급·평점은 서버가 계산한다.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { teachingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, GradeStatusBadge, Loading, Notice } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { EVAL_MODE_LABEL } from '../../lib/format'
import type { GradeCounts, GradeSheetResponse, GradeSheetStudent } from '../../types'
import { useDetail } from './LectureDetailLayout'

type ScoreKey = 'midScr' | 'finScr' | 'hwScr' | 'attScr'
const SCORE_FIELDS: [ScoreKey, string][] = [
  ['midScr', '중간'],
  ['finScr', '기말'],
  ['hwScr', '과제'],
  ['attScr', '출석'],
]

export default function GradesTab() {
  const { lecNo } = useDetail()
  const toast = useToast()
  const { data, error, loading, reload, setData } = useAsync(
    () => teachingApi.gradeSheet(lecNo),
    [lecNo],
  )
  // 저장 전 편집본. null 이면 서버 값을 그대로 보여준다
  const [edits, setEdits] = useState<GradeSheetStudent[] | null>(null)
  const [busy, setBusy] = useState(false)
  const rows = edits ?? data?.students ?? []
  const dirty = edits !== null

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null
  if (data.students.length === 0) return <Empty>수강생이 없습니다.</Empty>

  const { editable, weights } = data

  const setScore = (i: number, k: ScoreKey, v: string) => {
    const n = v === '' ? null : Number(v)
    setEdits(rows.map((r, j) => (j === i ? { ...r, [k]: n } : r)))
  }

  const call = async (fn: () => Promise<GradeSheetResponse>, ok: string) => {
    setBusy(true)
    try {
      setData(await fn())
      setEdits(null)
      toast(ok)
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
          rows.map(({ stdNo, midScr, finScr, hwScr, attScr }) => ({
            stdNo,
            midScr,
            finScr,
            hwScr,
            attScr,
          })),
        ),
      '저장했습니다.',
    )
  const submit = () => {
    if (!confirm('성적을 제출할까요?')) return
    call(() => teachingApi.submitGrades(lecNo), '제출했습니다.')
  }

  return (
    <div className="stack">
      <div className="grade-bar">
        <span>
          성적상태 <GradeStatusBadge status={data.grdStat} />
        </span>
        <Badge tone="blue">{EVAL_MODE_LABEL[data.evalMode]}</Badge>
        {weights && (
          <span className="muted small">
            반영 비율 중간 {weights.midWt} · 기말 {weights.finWt} · 과제 {weights.hwWt} · 출석{' '}
            {weights.attWt}
          </span>
        )}
        <span className="muted small">수강생 {rows.length}명</span>
        <span className="spacer" />
        {editable && (
          <>
            <button className="btn" disabled={busy || !dirty} onClick={save}>
              저장
            </button>
            <button
              className="btn btn-primary"
              disabled={busy || dirty || data.tieAtBoundary}
              onClick={submit}
            >
              제출
            </button>
          </>
        )}
      </div>
      {!editable && <Notice kind="warn">지금은 성적을 입력·수정할 수 없습니다 (읽기 전용).</Notice>}
      {editable && dirty && (
        <Notice>저장하지 않은 변경 사항이 있습니다. 제출하려면 먼저 저장하세요.</Notice>
      )}
      {data.tieAtBoundary && (
        <Notice kind="warn">
          등급 인원 경계에 총점이 같은 학생이 있어 제출할 수 없습니다. 등급 인원을 조정하세요.
        </Notice>
      )}
      {data.counts && (
        <CountsForm
          key={`${data.counts.aCnt}-${data.counts.abCnt}`}
          counts={data.counts}
          disabled={!editable || busy}
          onSave={(a, ab) =>
            call(() => teachingApi.saveCounts(lecNo, a, ab), '등급 인원을 저장했습니다.')
          }
        />
      )}

      <div className="table-wrap">
        <table className="table grade-table">
          <thead>
            <tr>
              <th>학번</th>
              <th>이름</th>
              {SCORE_FIELDS.map(([k, label]) => (
                <th key={k} className="num">
                  {label}
                </th>
              ))}
              <th className="num">원점수 총점</th>
              <th className="num">최종점수</th>
              <th>등급</th>
              <th className="num">평점</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.stdNo}>
                <td className="mono">{r.stdNo}</td>
                <td>
                  {r.usrNm}
                  {r.retake && <Badge tone="amber">재수강</Badge>}
                </td>
                {SCORE_FIELDS.map(([k]) => (
                  <td key={k} className="num">
                    <input
                      className="score"
                      type="number"
                      inputMode="decimal"
                      value={r[k] ?? ''}
                      disabled={!editable}
                      onChange={(e) => setScore(i, k, e.target.value)}
                    />
                  </td>
                ))}
                {/* 아래 값은 저장 후 서버가 계산한 값 */}
                <td className="num">{dirty ? '…' : (r.rawTotal ?? '-')}</td>
                <td className="num">{dirty ? '…' : (r.totScr ?? '-')}</td>
                <td>
                  <b>{dirty ? '…' : (r.ltrGrd ?? '-')}</b>
                </td>
                <td className="num">{dirty ? '…' : (r.grdPt?.toFixed(1) ?? '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 등급 인원(A 인원, A+B 인원). 비워 두면 서버 기본값(상대평가는 한도) */
function CountsForm({
  counts,
  disabled,
  onSave,
}: {
  counts: GradeCounts
  disabled: boolean
  onSave: (aCnt: number | null, abCnt: number | null) => void
}) {
  const [a, setA] = useState(counts.aCnt?.toString() ?? '')
  const [ab, setAb] = useState(counts.abCnt?.toString() ?? '')
  const num = (v: string) => (v === '' ? null : Number(v))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave(num(a), counts.abLimit == null ? null : num(ab))
  }
  return (
    <form className="filters" onSubmit={submit}>
      <label>
        A 인원 (최대 {counts.aLimit})
        <input
          type="number"
          min={0}
          value={a}
          disabled={disabled}
          onChange={(e) => setA(e.target.value)}
        />
      </label>
      {counts.abLimit != null && (
        <label>
          A+B 인원 (최대 {counts.abLimit})
          <input
            type="number"
            min={0}
            value={ab}
            disabled={disabled}
            onChange={(e) => setAb(e.target.value)}
          />
        </label>
      )}
      <span className="muted small">수강인원 {counts.enrolled}명</span>
      <div className="filters-actions">
        <button className="btn" disabled={disabled}>
          등급 인원 저장
        </button>
      </div>
    </form>
  )
}
