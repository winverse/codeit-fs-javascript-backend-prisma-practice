# Prisma 프로젝트 준비

## 문제와 시작 상태

독립 `workspace/`의 모듈 방식, 런타임 범위, 개발·실행·Client 생성·시드 스크립트와 첫 실행 파일을 준비합니다. 시작 manifest에는 이름만 있고 서버는 TODO 문구를 출력합니다.

## 수정 파일과 fixture

- 수정: `workspace/package.json`, `workspace/src/server.js`
- 기대 스크립트·출력: `fixtures/expected.json`

## 실행 진입점

`npm run check:05`

## 성공·실패 기준

ES module, Node.js 26.7 범위, npm 11, 네 스크립트와 정상 첫 출력이 모두 맞으면 성공합니다. 설정 누락, 실행 오류, 다른 출력은 실패합니다.
