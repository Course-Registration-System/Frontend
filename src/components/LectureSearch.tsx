// REG-01 강의 검색. 분류(학과·학년·이수구분) 또는 검색어(과목명·교수명)로 찾는다.
// 학생 화면은 행별 버튼(담기·신청)을 넘기고, 교수 화면은 버튼 없이 열람만 한다.
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { lectureApi } from '../api'
import { errorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { CMPL_TYPES, cmplLabel, formatPlaces, formatSlots, YR_LVLS } from '../lib/format'
import type { CmplType, LectureSearchItem, LectureSearchParams, TimeSlot } from '../types'
import { useToast } from './Toast'
import { Badge, DeptSelect, Empty, ErrorBox, Loading } from './ui'

type Mode = 'CATEGORY' | 'KEYWORD'
const PAGE_SIZE = 20

export function LectureSearch({
  actions,
  reloadKey,
}: {
  /** 행별 버튼. 없으면 열람 전용 */
  actions?: (l: LectureSearchItem) => ReactNode
  /** 바뀌면 결과를 다시 불러온다 (담기·신청 뒤 잔여 인원 갱신용) */
  reloadKey?: unknown
}) {
  const [mode, setMode] = useState<Mode>('CATEGORY')
  const [deptNo, setDeptNo] = useState<number | null>(null)
  const [yrLvl, setYrLvl] = useState('')
  const [cmplType, setCmplType] = useState('')
  const [field, setField] = useState<'crsNm' | 'profNm'>('crsNm')
  const [keyword, setKeyword] = useState('')
  // 검색 버튼을 누르기 전에는 조회하지 않는다
  const [params, setParams] = useState<LectureSearchParams | null>(null)

  const { data, error, loading, reload } = useAsync(
    () => (params ? lectureApi.search(params) : Promise.resolve(null)),
    [params, reloadKey],
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const base = { page: 0, size: PAGE_SIZE }
    setParams(
      mode === 'CATEGORY'
        ? {
            ...base,
            deptNo: deptNo ?? undefined,
            yrLvl: yrLvl ? Number(yrLvl) : undefined,
            cmplType: (cmplType || undefined) as CmplType | undefined,
          }
        : { ...base, [field]: keyword.trim() || undefined },
    )
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1

  return (
    <div className="search">
      <div className="search-tabs" role="tablist">
        {(
          [
            ['CATEGORY', '분류로 찾기'],
            ['KEYWORD', '검색어로 찾기'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? 'on' : ''}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="filters" onSubmit={submit}>
        {mode === 'CATEGORY' ? (
          <>
            <label>
              학과
              <DeptSelect value={deptNo} onChange={setDeptNo} allLabel="전체" />
            </label>
            <label>
              학년
              <select value={yrLvl} onChange={(e) => setYrLvl(e.target.value)}>
                <option value="">전체</option>
                {YR_LVLS.map((g) => (
                  <option key={g} value={g}>
                    {g}학년
                  </option>
                ))}
              </select>
            </label>
            <label>
              이수구분
              <select value={cmplType} onChange={(e) => setCmplType(e.target.value)}>
                <option value="">전체</option>
                {CMPL_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {cmplLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              구분
              <select
                value={field}
                onChange={(e) => setField(e.target.value as 'crsNm' | 'profNm')}
              >
                <option value="crsNm">과목명</option>
                <option value="profNm">교수명</option>
              </select>
            </label>
            <label className="grow">
              검색어
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={field === 'crsNm' ? '과목명 일부만 입력해도 됩니다' : '교수명'}
              />
            </label>
          </>
        )}
        <div className="filters-actions">
          <button className="btn btn-primary" type="submit">
            검색
          </button>
        </div>
      </form>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && params && !data && <Loading />}
      {!params && <p className="muted small">조건을 고르고 검색을 누르세요.</p>}
      {data &&
        (data.items.length === 0 ? (
          <Empty>조건에 맞는 강의가 없습니다.</Empty>
        ) : (
          <>
            <p className="muted small">검색 결과 {data.total}건</p>
            <LectureTable
              rows={data.items.map((l) => ({ ...l, hasPlan: !!l.planFile }))}
              actions={actions}
            />
            {pages > 1 && (
              <div className="pager">
                <button
                  className="btn btn-sm"
                  disabled={data.page === 0}
                  onClick={() => setParams({ ...params!, page: data.page - 1 })}
                >
                  이전
                </button>
                <span className="muted small">
                  {data.page + 1} / {pages}
                </span>
                <button
                  className="btn btn-sm"
                  disabled={data.page + 1 >= pages}
                  onClick={() => setParams({ ...params!, page: data.page + 1 })}
                >
                  다음
                </button>
              </div>
            )}
          </>
        ))}
    </div>
  )
}

/** 강의 목록 표 한 줄 (검색 결과·장바구니·신청 내역 공용) */
export interface LectureRow {
  lecNo: number
  crsCd: string
  crsNm: string
  sectNo: number
  crdt: number
  cmplType: string
  profNm: string
  timeSlots: TimeSlot[]
  cap?: number
  remaining?: number
  engLec?: boolean
  evalType?: string
  hasPlan?: boolean
}

/** 계획서 PDF 를 새 탭으로 연다 (인증 헤더가 필요해서 blob 으로 받는다) */
export function PlanLink({ lecNo, label = 'PDF' }: { lecNo: number; label?: string }) {
  const toast = useToast()
  const open = async () => {
    // 팝업 차단을 피하려고 창을 먼저 연다
    const win = window.open('', '_blank')
    try {
      const blob = await lectureApi.planFile(lecNo)
      const url = URL.createObjectURL(blob)
      if (win) win.location.href = url
      else window.open(url, '_blank')
    } catch (e) {
      win?.close()
      toast(errorMessage(e), 'error')
    }
  }
  return (
    <button type="button" className="link-btn" onClick={open}>
      {label}
    </button>
  )
}

/** REG-01 출력 정보 형태의 강의 목록 표 */
export function LectureTable<R extends LectureRow>({
  rows,
  actions,
  extra,
}: {
  rows: R[]
  actions?: (r: R) => ReactNode
  /** 앞쪽에 붙일 추가 열 (예: 장바구니의 담은 순서) */
  extra?: { head: string; cell: (r: R, i: number) => ReactNode; num?: boolean }[]
}) {
  const showCap = rows.some((r) => r.cap != null)
  const showPlan = rows.some((r) => r.hasPlan != null)
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {extra?.map((x) => (
              <th key={x.head} className={x.num ? 'num' : ''}>
                {x.head}
              </th>
            ))}
            <th>과목코드</th>
            <th>과목명</th>
            <th>분반</th>
            <th className="num">학점</th>
            <th>이수구분</th>
            <th>교수명</th>
            <th>요일·시간</th>
            <th>강의실</th>
            {showCap && (
              <>
                <th className="num">정원</th>
                <th className="num">잔여</th>
              </>
            )}
            {showPlan && <th>계획서</th>}
            {actions && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.lecNo}>
              {extra?.map((x) => (
                <td key={x.head} className={x.num ? 'num' : ''}>
                  {x.cell(r, i)}
                </td>
              ))}
              <td className="mono">{r.crsCd}</td>
              <td>
                {r.crsNm}
                {r.engLec && <Badge tone="blue">EN</Badge>}
                {r.evalType === 'PASS_FAIL' && <Badge>P/F</Badge>}
              </td>
              <td>{r.sectNo}</td>
              <td className="num">{r.crdt}</td>
              <td>{cmplLabel(r.cmplType)}</td>
              <td>{r.profNm}</td>
              <td>{formatSlots(r.timeSlots)}</td>
              <td>{formatPlaces(r.timeSlots)}</td>
              {showCap && (
                <>
                  <td className="num">{r.cap}</td>
                  <td className="num">
                    {r.remaining != null && r.remaining <= 0 ? (
                      <Badge tone="red">마감</Badge>
                    ) : (
                      r.remaining
                    )}
                  </td>
                </>
              )}
              {showPlan && (
                <td>
                  {r.hasPlan ? <PlanLink lecNo={r.lecNo} /> : <span className="muted">-</span>}
                </td>
              )}
              {actions && <td className="row-actions">{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
