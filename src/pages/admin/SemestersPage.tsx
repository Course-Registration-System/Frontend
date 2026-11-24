// ACA-01 학기·학사일정 관리, 진급·졸업 처리 및 최대학점 산정
import { useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi, commonApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHeader } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import {
  formatDateTime,
  SCHD_TYPE_LABEL,
  SCHD_TYPES,
  SEM_TYPE_LABEL,
  SEM_TYPES,
  semLabel,
  STD_STAT_LABEL,
  toLocalDateTime,
  YR_LVLS,
} from '../../lib/format'
import type { ScheduleRequest, SchdType, SemesterResponse, SemType } from '../../types'

export default function SemestersPage() {
  const toast = useToast()
  const sems = useAsync(() => commonApi.semesters(), [])
  const [picked, setPicked] = useState<number | null>(null)
  const [modal, setModal] = useState<{ semester?: SemesterResponse } | null>(null)
  // 고르지 않았으면 현재 학기
  const selected =
    sems.data?.find((s) => s.semNo === picked) ??
    sems.data?.find((s) => s.current) ??
    sems.data?.[sems.data.length - 1]

  const makeCurrent = async (s: SemesterResponse) => {
    if (!confirm(`${semLabel(s)}을(를) 현재 학기로 지정할까요?`)) return
    try {
      await adminApi.setCurrentSemester(s.semNo)
      toast('현재 학기를 바꿨습니다.')
      sems.reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="학기·학사일정"
        actions={
          <button className="btn btn-primary" onClick={() => setModal({})}>
            학기 등록
          </button>
        }
      />
      <div className="two-col">
        <section className="card">
          <h2>학기</h2>
          {sems.error && <ErrorBox message={sems.error} onRetry={sems.reload} />}
          {sems.loading && !sems.data && <Loading />}
          {sems.data?.length === 0 && <Empty>등록된 학기가 없습니다.</Empty>}
          <ul className="select-list">
            {[...(sems.data ?? [])].reverse().map((s) => (
              <li key={s.semNo} className={s.semNo === selected?.semNo ? 'on' : ''}>
                <button className="link-btn" onClick={() => setPicked(s.semNo)}>
                  {semLabel(s)}
                </button>
                {s.current ? (
                  <Badge tone="blue">현재</Badge>
                ) : (
                  <button className="btn btn-sm" onClick={() => makeCurrent(s)}>
                    현재 학기로
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
        {selected && (
          <div className="stack" key={selected.semNo}>
            <div className="card-head">
              <h2>{semLabel(selected)}</h2>
              <button className="btn btn-sm" onClick={() => setModal({ semester: selected })}>
                연도·학기구분 수정
              </button>
            </div>
            <Schedules semNo={selected.semNo} />
            <MaxCredits semNo={selected.semNo} />
          </div>
        )}
      </div>
      {modal && (
        <SemesterModal
          semester={modal.semester}
          onClose={() => setModal(null)}
          onSaved={async (s) => {
            setModal(null)
            await sems.reload()
            setPicked(s.semNo)
          }}
        />
      )}
    </>
  )
}

function SemesterModal({
  semester,
  onClose,
  onSaved,
}: {
  semester?: SemesterResponse
  onClose: () => void
  onSaved: (s: SemesterResponse) => void
}) {
  const toast = useToast()
  const [yr, setYr] = useState(() => semester?.yr ?? new Date().getFullYear())
  const [semType, setSemType] = useState<SemType>(semester?.semType ?? 'FIRST')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const s = semester
        ? await adminApi.updateSemester(semester.semNo, { yr, semType })
        : await adminApi.createSemester({ yr, semType })
      toast('저장했습니다.')
      onSaved(s)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={semester ? '학기 수정' : '학기 등록'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" form="sem-form" disabled={busy}>
            저장
          </button>
        </>
      }
    >
      <form id="sem-form" className="form-grid" onSubmit={submit}>
        <Field label="연도">
          <input type="number" value={yr} onChange={(e) => setYr(Number(e.target.value))} />
        </Field>
        <Field label="학기구분">
          <select value={semType} onChange={(e) => setSemType(e.target.value as SemType)}>
            {SEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {SEM_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        {err && <p className="form-error span-2">{err}</p>}
      </form>
    </Modal>
  )
}

/** 학사일정: 등록과 (시작 전) 삭제만 한다. 수정은 삭제 후 재등록 */
function Schedules({ semNo }: { semNo: number }) {
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => commonApi.schedules(semNo), [semNo])
  const empty: ScheduleRequest = { schdType: 'CART', startDtm: '', endDtm: '', tgtYrLvl: null }
  const [f, setF] = useState<ScheduleRequest>(empty)
  const [busy, setBusy] = useState(false)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await adminApi.addSchedule(semNo, {
        schdType: f.schdType,
        // 대상학년은 수강신청 일정에만
        tgtYrLvl: f.schdType === 'ENROLL' ? f.tgtYrLvl : null,
        startDtm: toLocalDateTime(f.startDtm),
        endDtm: toLocalDateTime(f.endDtm),
      })
      toast('일정을 등록했습니다.')
      setF(empty)
      reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (schdNo: number) => {
    if (!confirm('이 일정을 삭제할까요?')) return
    try {
      await adminApi.deleteSchedule(schdNo)
      toast('삭제했습니다.')
      reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const sorted = [...(data ?? [])].sort((a, b) => a.startDtm.localeCompare(b.startDtm))

  return (
    <section className="card">
      <h2>학사일정</h2>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (sorted.length === 0 ? (
          <Empty>등록된 일정이 없습니다.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>일정유형</th>
                  <th>대상학년</th>
                  <th>시작일시</th>
                  <th>종료일시</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.schdNo}>
                    <td>{SCHD_TYPE_LABEL[s.schdType]}</td>
                    <td>{s.tgtYrLvl ? `${s.tgtYrLvl}학년` : '전 학년'}</td>
                    <td>{formatDateTime(s.startDtm)}</td>
                    <td>{formatDateTime(s.endDtm)}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-danger" onClick={() => remove(s.schdNo)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      <form className="filters schedule-form" onSubmit={add}>
        <label>
          일정유형
          <select
            value={f.schdType}
            onChange={(e) => setF({ ...f, schdType: e.target.value as SchdType })}
          >
            {SCHD_TYPES.map((t) => (
              <option key={t} value={t}>
                {SCHD_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        {f.schdType === 'ENROLL' && (
          <label>
            대상학년
            <select
              value={f.tgtYrLvl ?? ''}
              onChange={(e) =>
                setF({ ...f, tgtYrLvl: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">전 학년</option>
              {YR_LVLS.map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          시작일시
          <input
            type="datetime-local"
            value={f.startDtm}
            onChange={(e) => setF({ ...f, startDtm: e.target.value })}
          />
        </label>
        <label>
          종료일시
          <input
            type="datetime-local"
            value={f.endDtm}
            onChange={(e) => setF({ ...f, endDtm: e.target.value })}
          />
        </label>
        <div className="filters-actions">
          <button className="btn btn-primary" disabled={busy}>
            일정 등록
          </button>
        </div>
      </form>
    </section>
  )
}

function MaxCredits({ semNo }: { semNo: number }) {
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => adminApi.maxCredits(semNo), [semNo])
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (data?.length && !confirm('다시 산정하면 이 학기 결과를 새로 계산합니다.')) return
    setBusy(true)
    try {
      const r = await adminApi.runMaxCredits(semNo)
      toast(
        r.regular
          ? `진급·졸업 처리(졸업 ${r.graduated}명)와 최대학점 산정을 마쳤습니다.`
          : '최대학점 산정을 마쳤습니다.',
      )
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>학생별 최대학점</h2>
        <button className="btn btn-primary" disabled={busy} onClick={run}>
          {data?.length ? '다시 산정' : '산정 실행'}
        </button>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.length === 0 ? (
          <Empty>아직 산정하지 않았습니다.</Empty>
        ) : (
          <div className="table-wrap scroll-y">
            <table className="table">
              <thead>
                <tr>
                  <th>학번</th>
                  <th>이름</th>
                  <th className="num">학년</th>
                  <th>학적상태</th>
                  <th className="num">최대학점</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.stdNo}>
                    <td className="mono">{r.stdNo}</td>
                    <td>{r.usrNm}</td>
                    <td className="num">{r.yrLvl}</td>
                    <td>{STD_STAT_LABEL[r.stdStat]}</td>
                    <td className="num">
                      <b>{r.maxCrdt}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  )
}
