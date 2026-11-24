// LEC-03 강의계획서 PDF·반영 비율
import { useRef, useState } from 'react'
import { teachingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Notice } from '../../components/ui'
import { sumRatios } from '../../lib/grades'
import type { Ratios } from '../../types'
import { useDetail } from './LectureDetailLayout'

const FIELDS: [keyof Ratios, string][] = [
  ['midterm', '중간'],
  ['final', '기말'],
  ['assignment', '과제'],
  ['attendance', '출석'],
]

export default function SyllabusTab() {
  const { detail, reload } = useDetail()
  const toast = useToast()
  const l = detail.lecture
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [ratios, setRatios] = useState<Ratios>(
    detail.ratios ?? { midterm: 0, final: 0, assignment: 0, attendance: 0 },
  )
  const [saving, setSaving] = useState(false)
  const locked = l.gradeStatus !== 'NOT_ENTERED'
  const sum = sumRatios(ratios)

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast('PDF 파일만 올릴 수 있습니다.', 'error')
      return
    }
    setUploading(true)
    try {
      await teachingApi.uploadSyllabus(l.lecNo, file)
      toast('계획서를 올렸습니다.')
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveRatios = async () => {
    setSaving(true)
    try {
      await teachingApi.saveRatios(l.lecNo, ratios)
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
      <section className="card">
        <h2>강의계획서 PDF</h2>
        <p>
          {l.syllabusUrl ? (
            <a href={l.syllabusUrl} target="_blank" rel="noreferrer">
              등록된 계획서 열기
            </a>
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
        <button className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? '올리는 중…' : l.syllabusUrl ? 'PDF 교체' : 'PDF 업로드'}
        </button>
      </section>

      {l.gradingType === 'PF' ? (
        <Notice>P/F 과목은 성적 반영 비율을 입력하지 않습니다.</Notice>
      ) : (
        <section className="card">
          <h2>성적 반영 비율</h2>
          {locked && (
            <Notice kind="warn">성적 입력이 시작되어 반영 비율을 바꿀 수 없습니다.</Notice>
          )}
          {!detail.ratios && !locked && (
            <Notice kind="warn">반영 비율을 등록해야 성적을 입력할 수 있습니다.</Notice>
          )}
          <div className="ratio-grid">
            {FIELDS.map(([k, label]) => (
              <label key={k} className="field">
                <span className="field-label">{label} (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={ratios[k]}
                  disabled={locked}
                  onChange={(e) => setRatios((r) => ({ ...r, [k]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <p className={sum === 100 ? 'muted' : 'text-danger'}>
            합계 {sum}% {sum !== 100 && '(100%가 되어야 합니다)'}
          </p>
          <button
            className="btn btn-primary"
            disabled={locked || saving || sum !== 100}
            onClick={saveRatios}
          >
            저장
          </button>
        </section>
      )}
    </div>
  )
}
