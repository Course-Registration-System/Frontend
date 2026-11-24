// REG-01 강의 검색 (교수 열람용: 담기·신청 버튼 없음)
import { LectureSearch } from '../../components/LectureSearch'
import { PageHeader } from '../../components/ui'

export default function TeachingSearchPage() {
  return (
    <>
      <PageHeader title="강의 검색" desc="신청 대상 학기의 개설 강의를 열람합니다." />
      <LectureSearch />
    </>
  )
}
