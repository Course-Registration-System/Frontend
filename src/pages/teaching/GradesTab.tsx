// GRD-01 성적 입력·수정.
// 등급제는 원점수(중간·기말·과제·출석)만 입력하고 총점·최종점수·등급·평점은 서버가 계산한다.
// P/F 과목은 점수 없이 P 또는 F 만 입력한다.
import { useState } from 'react'
import { teachingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, GradeStatusBadge, Loading, Notice } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { EVAL_MODE_LABEL } from '../../lib/format'
import type { GradeInput, GradeSheetResponse, GradeSheetStudent } from '../../types'
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
  // 저장 전 편집본 (학번 → 고친 행). 비어 있으면 서버 값을 그대로 보여준다
  const [edits, setEdits] = useState<Record<string, GradeSheetStudent>>({})
  const [busy, setBusy] = useState(false)
  const dirty = Object.keys(edits).length > 0

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null
  if (data.students.length === 0) return <Empty>수강생이 없습니다.</Empty>

  const { editable, weights, bands } = data
  const passFail = data.evalMode === 'PASS_FAIL'
  // 등급제인데 반영비율이 없으면 저장·제출이 409 WEIGHTS_NOT_SET 이다
  const noWeights = !passFail && weights == null
  const canEdit = editable && !noWeights
  const rows = data.students.map((s) => edits[s.stdNo] ?? s)

  const edit = (row: GradeSheetStudent, patch: Partial<GradeSheetStudent>) =>
    setEdits({ ...edits, [row.stdNo]: { ...row, ...patch } })

  const call = async (fn: () => Promise<GradeSheetResponse>, ok: string) => {
    setBusy(true)
    try {
      setData(await fn())
      setEdits({})
      toast(ok)
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  // 고친 학생만 보낸다. 넣은 학생만 바뀌고, 한 명이라도 실패하면 아무것도 저장되지 않는다
  const save = () => {
    const grades: GradeInput[] = Object.values(edits).map((r) =>
      passFail
        ? { stdNo: r.stdNo, ltrGrd: r.ltrGrd === 'P' || r.ltrGrd === 'F' ? r.ltrGrd : null }
        : {
            stdNo: r.stdNo,
            midScr: r.midScr,
            finScr: r.finScr,
            hwScr: r.hwScr,
            attScr: r.attScr,
          },
    )
    call(() => teachingApi.saveGrades(lecNo, grades), '저장했습니다.')
  }
  const submit = () => {
    if (!confirm('성적을 제출할까요?')) return
    call(() => teachingApi.submitGrades(lecNo), '제출했습니다.')
  }

  const notEntered = data.students.filter((s) => !s.entered).length

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
        <span className="muted small">
          수강생 {rows.length}명{notEntered > 0 && ` · 미입력 ${notEntered}명`}
        </span>
        <span className="spacer" />
        {canEdit && (
          <>
            <button className="btn" disabled={busy || !dirty} onClick={save}>
              저장
            </button>
            <button
              className="btn btn-primary"
              disabled={busy || dirty || data.grdStat === 'SUBMITTED'}
              onClick={submit}
            >
              {data.grdStat === 'SUBMITTED' ? '제출됨' : '제출'}
            </button>
          </>
        )}
      </div>
      {!editable && <Notice kind="warn">지금은 성적을 입력·수정할 수 없습니다 (읽기 전용).</Notice>}
      {editable && noWeights && (
        <Notice kind="warn">
          평가 반영 비율이 등록되지 않아 성적을 입력할 수 없습니다. 강의계획서 탭에서 먼저
          등록하세요.
        </Notice>
      )}
      {canEdit && dirty && (
        <Notice>저장하지 않은 변경 사항이 있습니다. 제출하려면 먼저 저장하세요.</Notice>
      )}
      {canEdit && data.grdStat === 'SUBMITTED' && (
        <Notice>제출한 성적을 고쳐 저장하면 입력중 상태로 돌아가 다시 제출해야 합니다.</Notice>
      )}
      {bands && (
        <Notice>
          상대평가: 수강인원 {bands.enrolled}명 중 A 구역 최대 {bands.aLimit}명
          {bands.abLimit != null && ` · A+B 구역 최대 ${bands.abLimit}명`}. 원점수 총점 석차로
          등급이 정해지며, 구역 경계에 총점이 같은 학생이 있으면 저장되지 않습니다.
        </Notice>
      )}

      <div className="table-wrap">
        <table className="table grade-table">
          <thead>
            <tr>
              <th>학번</th>
              <th>이름</th>
              {passFail ? (
                <th>등급 (P/F)</th>
              ) : (
                <>
                  {SCORE_FIELDS.map(([k, label]) => (
                    <th key={k} className="num">
                      {label}
                    </th>
                  ))}
                  <th className="num">원점수 총점</th>
                  <th className="num">최종점수</th>
                  <th>등급</th>
                  <th className="num">평점</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const changed = r.stdNo in edits
              return (
                <tr key={r.stdNo}>
                  <td className="mono">{r.stdNo}</td>
                  <td>
                    {r.usrNm}
                    {r.retake && <Badge tone="amber">재수강</Badge>}
                  </td>
                  {passFail ? (
                    <td>
                      <select
                        value={r.ltrGrd ?? ''}
                        disabled={!canEdit}
                        onChange={(e) =>
                          edit(r, {
                            ltrGrd: e.target.value === '' ? null : (e.target.value as 'P' | 'F'),
                          })
                        }
                      >
                        <option value="">미입력</option>
                        <option value="P">P</option>
                        <option value="F">F</option>
                      </select>
                    </td>
                  ) : (
                    <>
                      {SCORE_FIELDS.map(([k]) => (
                        <td key={k} className="num">
                          <input
                            className="score"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step={0.001}
                            value={r[k] ?? ''}
                            disabled={!canEdit}
                            onChange={(e) =>
                              edit(r, {
                                [k]: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                      ))}
                      {/* 아래 값은 저장 후 서버가 계산한 값 */}
                      <td className="num">{changed ? '…' : (r.totScr ?? '-')}</td>
                      <td className="num">{changed ? '…' : (r.fnlScr ?? '-')}</td>
                      <td>
                        <b>{changed ? '…' : (r.ltrGrd ?? '-')}</b>
                      </td>
                      <td className="num">{changed ? '…' : (r.grdPt?.toFixed(1) ?? '-')}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
