// 작은 공용 UI 조각들
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAsync } from '../hooks/useAsync'
import { commonApi } from '../api'
import { GRADE_STATUS_LABEL, semesterLabel } from '../lib/format'
import type { GradeStatus, LectureStatus } from '../types'

export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string
  desc?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {desc && <p className="muted">{desc}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Loading() {
  return <p className="muted">불러오는 중…</p>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice-error">
      {message}
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}

export function Notice({
  children,
  kind = 'info',
}: {
  children: ReactNode
  kind?: 'info' | 'warn' | 'error'
}) {
  return <div className={`notice notice-${kind}`}>{children}</div>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode
  tone?: 'gray' | 'blue' | 'green' | 'red' | 'amber'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

const GRADE_TONE: Record<GradeStatus, 'gray' | 'blue' | 'amber' | 'green'> = {
  NOT_ENTERED: 'gray',
  IN_PROGRESS: 'amber',
  SUBMITTED: 'blue',
  CONFIRMED: 'green',
}
export const GradeStatusBadge = ({ status }: { status: GradeStatus }) => (
  <Badge tone={GRADE_TONE[status]}>{GRADE_STATUS_LABEL[status]}</Badge>
)
export const LectureStatusBadge = ({ status }: { status: LectureStatus }) =>
  status === 'CLOSED' ? <Badge tone="red">폐강</Badge> : <Badge tone="green">개설</Badge>

/** 학기 선택. value 가 비어 있으면 현재 학기로 채운다 */
export function SemesterSelect({
  value,
  onChange,
  only,
}: {
  value: string
  onChange: (id: string) => void
  /** 주어지면 이 학기들만 보여준다 */
  only?: string[]
}) {
  const { data } = useAsync(() => commonApi.semesters(), [])
  const list = data?.filter((s) => !only || only.includes(s.id)) ?? []
  const defaultId = (list.find((s) => s.current) ?? list[0])?.id
  // 부모가 값을 비워 두면 기본 학기를 알려 준다
  useEffect(() => {
    if (!value && defaultId) onChange(defaultId)
  }, [value, defaultId, onChange])
  return (
    <label className="inline-field">
      <span>학기</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {list.map((s) => (
          <option key={s.id} value={s.id}>
            {semesterLabel(s.id)}
            {s.current ? ' (현재)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
