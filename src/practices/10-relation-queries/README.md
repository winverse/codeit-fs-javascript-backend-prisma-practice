# 관계 쿼리

## 문제와 시작 상태

사용자별 게시글과 작성자를 포함한 게시글 목록을 항목별 반복 조회 없이 구현합니다. 시작 함수는 TODO 오류를 던집니다.

## 수정 파일과 fixture

- 수정: `src/relationRepository.js`
- 조회 계약: `fixtures/expected.json`

## 실행 진입점

`npm run check:10`

## 성공·실패 기준

각 목록을 하나의 `findMany()` 호출과 `include` 또는 `select`로 조회하면 성공합니다. 사용자·게시글마다 추가 조회하거나 관계 데이터를 함께 조회하지 않으면 실패합니다.
