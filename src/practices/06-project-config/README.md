# 프로젝트 설정

## 문제와 시작 상태

서버 포트와 PostgreSQL 연결 URL을 환경 객체에서 안전하게 읽는 `parseConfig()`를 구현합니다. 시작 함수는 항상 `null`을 반환합니다.

## 수정 파일과 fixture

- 수정: `src/config.js`
- 정상·오류 환경: `fixtures/environments.json`

## 실행 진입점

`npm run check:06`

## 성공·실패 기준

정상 입력은 숫자 포트와 URL로 변환하고 범위 밖 포트나 PostgreSQL이 아닌 URL은 거부하면 성공합니다. secret을 파일에 기록하거나 오류 입력을 허용하면 실패합니다.
