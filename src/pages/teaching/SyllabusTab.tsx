// LEC-03 강의계획서 PDF·평가 반영 비율
import { useRef, useState } from 'react'
import { teachingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { PlanLink } from '../../components/LectureSearch'
import { useToast } from '../../components/Toast'
import { Notice } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import type { PlanWeights } from '../../types'
import { useDetail } from './LectureDetailLayout'

const FIELDS: [keyof PlanWeights, string][] = [
  ['midWt', '중간'],
  ['finWt', '기말'],
  ['hwWt', '과제'],
  ['attWt', '출석'],
]
const MAX_FILE_BYTES = 10 * 1024 * 1024

export default function SyllabusTab() {
  const { lecNo, plan, reload } = useDetail()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [weights, setWeights] = useState<PlanWeights>(
    plan.weights ?? { midWt: 0, finWt: 0, hwWt: 0, attWt: 0 },
  )
  const [saving, setSaving] = useState(false)
  const locked = !plan.editable
  const sum = weights.midWt + weights.finWt + weights.hwWt + weights.attWt
  // 네 값 모두 0~100 정수, 합 100 (서버도 같은 규칙으로 막는다)
  const validWeights =
    sum === 100 && Object.values(weights).every((v) => Number.isInteger(v) && v >= 0 && v <= 100)

  const upload = async (file: File | undefined) => {
    if (!file) return
    // 크기는 미리 막는다. PDF 인지는 내용으로 서버가 판단한다
    if (file.size > MAX_FILE_BYTES) {
      toast('강의계획서 파일은 10MB 까지 올릴 수 있습니다.', 'error')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      await teachingApi.uploadPlan(lecNo, file)
      toast('계획서를 올렸습니다.')
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await teachingApi.saveWeights(lecNo, weights)
      toast('반영 비율을 저장했습니다.')
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      {locked ? (
        <Notice kind="warn">
          지금은 계획서 파일과 평가 반영 비율을 바꿀 수 없습니다 (폐강 또는 마감
          {plan.deadline && ` ${formatDateTime(plan.deadline)}`} 지남).
        </Notice>
      ) : (
        <Notice>
          {plan.deadline
            ? `등록·수정 마감: ${formatDateTime(plan.deadline)} (장바구니 기간 시작 전까지)`
            : '이 학기는 등록·수정 마감이 없습니다.'}
        </Notice>
      )}
      <section className="card">
        <h2>강의계획서 PDF</h2>
        <p className="muted small">PDF 한 개, 10MB 까지. 다시 올리면 기존 파일을 바꿉니다.</p>
        <p>
          {plan.hasPlanFile ? (
            <PlanLink lecNo={lecNo} label="등록된 계획서 열기" />
          ) : (
            <span className="muted">아직 등록된 계획서가 없습니다.</span>
          )}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <button
          className="btn"
          disabled={locked || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? '올리는 중…' : plan.hasPlanFile ? 'PDF 교체' : 'PDF 업로드'}
        </button>
      </section>

      {plan.evalType === 'PASS_FAIL' ? (
        <Notice>P/F 과목은 평가 반영 비율을 입력하지 않습니다.</Notice>
      ) : (
        <section className="card">
          <h2>평가 반영 비율</h2>
          <div className="ratio-grid">
            {FIELDS.map(([k, label]) => (
              <label key={k} className="field">
                <span className="field-label">{label} (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={weights[k]}
                  disabled={locked}
                  onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <p className={sum === 100 ? 'muted' : 'text-danger'}>
            합계 {sum}% {sum !== 100 && '(합이 100이어야 합니다)'}
          </p>
          {!plan.weights && (
            <p className="muted small">반영 비율을 등록해야 성적을 입력할 수 있습니다.</p>
          )}
          <button
            className="btn btn-primary"
            disabled={locked || saving || !validWeights}
            onClick={save}
          >
            저장
          </button>
        </section>
      )}
    </div>
  )
}
