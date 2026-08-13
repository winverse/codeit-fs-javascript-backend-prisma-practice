# 고급 쿼리

## 문제와 시작 상태

검색, 공개 여부, 최신순 정렬, 페이지네이션을 Prisma query object로 만드는 `buildPostQuery()`를 구현합니다. 시작 함수는 빈 객체를 반환합니다.

## 수정 파일과 fixture

- 수정: `src/postQuery.js`
- 대표 query: `fixtures/query.json`

## 실행 진입점

`npm run check:11`

## 성공·실패 기준

문자열 page·limit을 정수로 변환하고 제목·본문 검색, 공개 필터, 최신순, skip/take를 정확히 만들면 성공합니다. 0 이하나 100 초과 값을 허용하거나 필터를 잃으면 실패합니다.
