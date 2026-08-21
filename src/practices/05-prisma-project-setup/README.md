# Prisma 프로젝트 준비

## 문제와 시작 상태

독립 `workspace/`의 모듈 방식, Node.js 런타임 범위, 개발·프로덕션 실행 스크립트와 첫 실행 파일을 준비합니다. 시작 manifest에는 실행에 필요한 `nodemon`만 제공되고, 개발·프로덕션 환경 파일에는 비밀 값 없이 `NODE_ENV`와 `PORT`만 들어 있습니다. 서버 파일은 아직 TODO 문구를 출력합니다.

## 수정 파일과 fixture

- 수정: `workspace/package.json`, `workspace/src/server.js`
- 기대 스크립트·출력: `fixtures/expected.json`
- 제공 환경: `workspace/env/.env.development`, `workspace/env/.env.production`

## 실행 진입점

```bash
npm run check:05
```

구현을 마친 뒤 독립 `workspace/`도 lockfile로 설치해 두 스크립트를 실제로 확인합니다. `prod`는 출력 후 종료되고, `dev`는 개발 출력을 확인한 뒤 `Ctrl+C`로 종료합니다.

```bash
cd src/practices/05-prisma-project-setup/workspace
npm ci
npm run prod
npm run dev
```

## 성공·실패 기준

ES module, Node.js `>=26 <27` 범위, `dev`·`prod` 스크립트와 자체 설치 가능한 `nodemon` 의존성이 모두 맞아야 합니다. `dev`는 `[development] Server running at http://localhost:5001`, `prod`는 `[production] Server running at http://localhost:5001`을 출력해야 성공합니다. 환경 파일·설정 누락, 실행 오류, 다른 출력은 실패합니다.
