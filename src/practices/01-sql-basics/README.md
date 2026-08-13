# SQL 기본 사용법

## 문제와 시작 상태

쇼핑몰의 고객, 상품, 구매 내역을 저장하고 조회하는 PostgreSQL 18 SQL을 완성합니다. `task.sql`에는 TODO만 있으며 아직 테이블과 행이 없어 확인 명령이 실패합니다.

## 수정 파일과 fixture

- 수정: `task.sql`
- 입력·기대값: `fixtures/expected.json`

## 실행 진입점

기본 구조 확인은 외부 데이터베이스 없이 실행합니다.

```bash
npm run check:01
```

답안을 PostgreSQL 18에서 동적으로 확인할 때는 보존할 데이터가 없는 로컬 전용 데이터베이스를 따로 만들고 이름을 `codeit_prisma_practice_`로 시작합니다. 다음 값은 형식 예시이며 실제 비밀번호를 파일에 기록하지 않습니다.

```bash
PRACTICE_DATABASE_URL='postgresql://<local-user>:<local-password>@127.0.0.1:5432/codeit_prisma_practice_local' npm run verify:postgres
```

검증기는 PostgreSQL 18, 로컬 host, 데이터베이스 이름 접두사를 모두 확인한 뒤 고유 schema 안에서 답안을 실행하고 전체 transaction을 롤백합니다. 조건이 하나라도 다르면 SQL을 실행하지 않습니다.

## 성공·실패 기준

성공하려면 PostgreSQL의 quoted identifier와 `SERIAL` 문법으로 세 테이블, PK·FK·UNIQUE·CHECK 제약, 제공된 행과 세 조회문을 작성해야 합니다. 동적 검증에서는 실제 PostgreSQL 18의 테이블·제약·조회 결과가 기대값과 같아야 합니다. SQLite 전용 구문, 테이블·제약·행·조회 누락, PostgreSQL 실행 오류는 실패합니다.
