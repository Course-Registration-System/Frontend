// 학과·강의실 코드. 백엔드에 조회 API 가 없어서 시드(R__seed_dev.sql)와 같은 값을 둔다.
// 조회 API 가 생기면 이 파일 대신 서버에서 받아 쓰면 된다.

export const DEPARTMENTS: { deptNo: number; deptNm: string }[] = [
  { deptNo: 101, deptNm: '컴퓨터학부' },
  { deptNo: 102, deptNm: '경영학부' },
  { deptNo: 103, deptNm: '교양교육원' },
]

export const CLASSROOMS: { roomCd: string; roomNm: string }[] = [
  { roomCd: '21301', roomNm: '정보관 301호' },
  { roomCd: '21302', roomNm: '정보관 302호' },
  { roomCd: '21303', roomNm: '정보관 303호' },
  { roomCd: '06101', roomNm: '경영관 101호' },
  { roomCd: '06102', roomNm: '경영관 102호' },
  { roomCd: '06103', roomNm: '경영관 103호' },
  { roomCd: '01101', roomNm: '대강당' },
]
