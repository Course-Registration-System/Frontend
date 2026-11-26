// ACA-03 강의 개설 관리: 개설·수정·폐강
import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
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
import { CLASSROOMS } from '../../lib/codes'
import { CLS_TYPE_LABEL, DOW_LABEL, DOWS, formatPlaces, formatSlots, hm } from '../../lib/format'
import type { ClsType, Dow, LectureResponse, TimeSlotRequest } from '../../types'

interface LectureForm {
  crsCd: string
  semNo: number
  profNo: string
  sectNo: number
  cap: number
  engLec: boolean
  relGrdExmp: boolean
  timeSlots: TimeSlotRequest[]
}

const NEW_SLOT: TimeSlotRequest = {
  dow: 'MON',
  startTm: '09:00',
  endTm: '10:15',
  clsType: 'OFFLINE',
  roomCd: null,
}

const toForm = (l: LectureResponse): LectureForm => ({
  crsCd: l.crsCd,
  semNo: l.semNo,
  profNo: l.profNo,
  sectNo: l.sectNo,
  cap: l.cap,
  engLec: l.engLec,
  relGrdExmp: l.relGrdExmp,
  timeSlots: l.timeSlots.map((t) => ({
    dow: t.dow,
    startTm: hm(t.startTm),
    endTm: hm(t.endTm),
    clsType: t.clsType,
    roomCd: t.roomCd,
  })),
})

/** 주소: ?semNo= (대시보드에서 학기를 정해 넘어온다) */
export default function LecturesPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const semNo = Number(params.get('semNo')) || null
  const setSemNo = useCallback(
    (s: number) => setParams({ semNo: String(s) }, { replace: true }),
    [setParams],
  )
  const { data, error, loading, reload } = useAsync(
    () => (semNo != null ? adminApi.lectures(semNo) : Promise.resolve(null)),
    [semNo],
  )
  const [editing, setEditing] = useState<{ lecNo?: number; form: LectureForm } | null>(null)

  const close = async (l: LectureResponse) => {
    if (
      !confirm(
        `${l.crsNm} ${l.sectNo}분반을 폐강할까요? 신청 ${l.enrlCnt}건이 취소되고 장바구니에서도 빠집니다.`,
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
        actions={
          <>
            <SemesterSelect value={semNo} onChange={setSemNo} />
            <button
              className="btn btn-primary"
              disabled={semNo == null}
              onClick={() =>
                setEditing({
                  form: {
                    crsCd: '',
                    semNo: semNo!,
                    profNo: '',
                    sectNo: 1,
                    cap: 40,
                    engLec: false,
                    relGrdExmp: false,
                    timeSlots: [{ ...NEW_SLOT }],
                  },
                })
              }
            >
              강의 개설
            </button>
          </>
        }
      />
      <p className="muted small">
        개설은 장바구니 기간 전까지, 수정·폐강은 정정 기간이 끝나기 전까지 할 수 있습니다.
        수강신청이 시작되면 강의시간·수업유형은 바꿀 수 없고 강의실·교수·정원만 바꿀 수 있습니다.
        신청 인원을 누르면 신청 현황으로 갑니다.
      </p>
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
                  <tr key={l.lecNo} className={l.lecStat === 'CLOSED' ? 'row-muted' : ''}>
                    <td className="mono">{l.crsCd}</td>
                    <td>{l.crsNm}</td>
                    <td>{l.sectNo}</td>
                    <td>{l.profNm}</td>
                    <td>{formatSlots(l.timeSlots)}</td>
                    <td>{formatPlaces(l.timeSlots)}</td>
                    <td className="num">{l.cap}</td>
                    <td className="num">
                      {l.lecStat === 'OPEN' ? (
                        <Link to={`/admin/enrollments?semNo=${l.semNo}&lecNo=${l.lecNo}`}>
                          {l.enrlCnt}
                        </Link>
                      ) : (
                        l.enrlCnt
                      )}
                    </td>
                    <td>
                      {l.engLec && <Badge tone="blue">EN</Badge>}
                      {l.relGrdExmp && <Badge>상대평가 제외</Badge>}
                    </td>
                    <td>
                      <LectureStatusBadge status={l.lecStat} />
                    </td>
                    <td className="row-actions">
                      <button
                        className="btn btn-sm"
                        disabled={l.lecStat === 'CLOSED'}
                        onClick={() => setEditing({ lecNo: l.lecNo, form: toForm(l) })}
                      >
                        수정
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={l.lecStat === 'CLOSED'}
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
  const setSlot = (i: number, patch: Partial<TimeSlotRequest>) =>
    set(
      'timeSlots',
      f.timeSlots.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const { profNo, cap, engLec, relGrdExmp, timeSlots } = f
    try {
      if (lecNo) await adminApi.updateLecture(lecNo, { profNo, cap, engLec, relGrdExmp, timeSlots })
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
      {refs.error && <ErrorBox message={refs.error} onRetry={refs.reload} />}
      {refs.loading && !refs.data ? (
        <Loading />
      ) : (
        <form id="lecture-form" className="form-grid" onSubmit={submit}>
          <Field label="과목">
            <select
              value={f.crsCd}
              disabled={!!lecNo}
              onChange={(e) => set('crsCd', e.target.value)}
            >
              <option value="">선택</option>
              {courses.map((c) => (
                <option key={c.crsCd} value={c.crsCd}>
                  {c.crsCd} {c.crsNm}
                </option>
              ))}
            </select>
          </Field>
          <Field label="분반">
            <input
              type="number"
              min={1}
              value={f.sectNo}
              disabled={!!lecNo}
              onChange={(e) => set('sectNo', Number(e.target.value))}
            />
          </Field>
          <Field label="담당 교수">
            <select value={f.profNo} onChange={(e) => set('profNo', e.target.value)}>
              <option value="">선택</option>
              {profs
                .filter((p) => p.acctStat === 'ACTIVE')
                .map((p) => (
                  <option key={p.usrNo} value={p.usrNo}>
                    {p.usrNm} ({p.deptNm})
                  </option>
                ))}
            </select>
          </Field>
          <Field label="정원">
            <input
              type="number"
              value={f.cap}
              onChange={(e) => set('cap', Number(e.target.value))}
            />
          </Field>
          <div className="span-2 checks">
            <label>
              <input
                type="checkbox"
                checked={f.engLec}
                onChange={(e) => set('engLec', e.target.checked)}
              />{' '}
              영어강의(EN)
            </label>
            <label>
              <input
                type="checkbox"
                checked={f.relGrdExmp}
                onChange={(e) => set('relGrdExmp', e.target.checked)}
              />{' '}
              상대평가 제외
            </label>
          </div>
          <div className="span-2">
            <span className="field-label">강의시간</span>
            <div className="table-wrap">
              <table className="table compact">
                <thead>
                  <tr>
                    <th>요일</th>
                    <th>시작시각</th>
                    <th>종료시각</th>
                    <th>수업유형</th>
                    <th>강의실</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {f.timeSlots.map((t, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          value={t.dow}
                          onChange={(e) => setSlot(i, { dow: e.target.value as Dow })}
                        >
                          {DOWS.map((d) => (
                            <option key={d} value={d}>
                              {DOW_LABEL[d]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="time"
                          step={300}
                          value={t.startTm}
                          onChange={(e) => setSlot(i, { startTm: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          step={300}
                          value={t.endTm}
                          onChange={(e) => setSlot(i, { endTm: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={t.clsType}
                          onChange={(e) => {
                            const clsType = e.target.value as ClsType
                            setSlot(i, {
                              clsType,
                              roomCd: clsType === 'ONLINE' ? null : t.roomCd,
                            })
                          }}
                        >
                          {(Object.keys(CLS_TYPE_LABEL) as ClsType[]).map((c) => (
                            <option key={c} value={c}>
                              {CLS_TYPE_LABEL[c]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={t.roomCd ?? ''}
                          disabled={t.clsType === 'ONLINE'}
                          onChange={(e) => setSlot(i, { roomCd: e.target.value || null })}
                        >
                          <option value="">{t.clsType === 'ONLINE' ? '온라인' : '미배정'}</option>
                          {CLASSROOMS.map((r) => (
                            <option key={r.roomCd} value={r.roomCd}>
                              {r.roomNm}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={f.timeSlots.length === 1}
                          onClick={() =>
                            set(
                              'timeSlots',
                              f.timeSlots.filter((_, j) => j !== i),
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
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => set('timeSlots', [...f.timeSlots, { ...NEW_SLOT }])}
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
