# 시딩

## 문제와 시작 상태

Prisma 7 Client와 PostgreSQL용 fixture로 삭제 가능한 로컬 데이터베이스인지 확인하고, 관계 제약 순서로 초기화한 뒤 사용자 5명과 각 사용자의 게시글을 `createMany()`로 생성합니다. 안전 검사는 `postgresql:` 또는 `postgres:` 프로토콜까지 확인해 다른 종류의 URL을 PostgreSQL 대상으로 오인하지 않아야 합니다. 시작 함수는 안전 검사와 시딩을 수행하지 않습니다.

## 수정 파일과 fixture

- 수정: `src/seed.js`
- 안전한 입력: `fixtures/seed.json`

## 실행 진입점

`npm run check:08`

## 성공·실패 기준

`assertSafeSeedTarget()`은 `postgresql:` 또는 `postgres:` 프로토콜·로컬 host·정확한 데이터베이스 이름·`--allow-reset=prisma_blog` 확인을 모두 통과하면 `true`를 반환하고, 하나라도 다르면 데이터를 변경하기 전에 오류를 던집니다. 안전 검사를 통과한 경우에만 Post→User 삭제를 하나의 `$transaction()`으로 실행하고, 사용자 5명과 각 사용자의 게시글을 생성하면 성공합니다. 다른 프로토콜·원격 host·다른 DB 허용, 확인 인자 누락, 삭제 순서 오류, 사용자·게시글 누락은 실패합니다.
