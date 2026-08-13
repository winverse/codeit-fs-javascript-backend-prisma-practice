# 트랜잭션

## 문제와 시작 상태

게시글+첫 댓글 생성, 게시글+댓글 삭제, 게시글 일괄 생성을 interactive transaction으로 구현합니다. 시작 코드는 생성 두 작업을 트랜잭션 없이 수행하고 나머지 기능이 없습니다.

## 수정 파일과 fixture

- 수정: `src/postTransactions.js`
- 정상·의도적 실패 입력: `fixtures/operations.json`

## 실행 진입점

`npm run check:12`

## 성공·실패 기준

세 기능이 모두 `$transaction()` 안에서 실행되고 중간 실패 시 fixture 상태가 시작 전으로 롤백되면 성공합니다. 부분 변경이 남거나 삭제 순서·연결 ID가 틀리면 실패합니다.
