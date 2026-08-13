# 인증

## 문제와 시작 상태

본문과 같은 `bcrypt` 6.0.0과 `jsonwebtoken` 9.0.3으로 비밀번호 해시·비교, Access/Refresh Token 생성·검증, 인증 쿠키 설정·삭제, Access Token 인증 미들웨어, 사용자 응답의 password 제거를 구현합니다. 시작 파일에는 함수 계약과 TODO만 있으며 인증 처리가 완성되지 않아 확인 명령이 실패합니다.

## 수정 파일과 fixture

- 수정: `src/auth.js`
- 안전한 테스트 입력: `fixtures/auth.json`

## 실행 진입점

`npm run check:13`

## 성공·실패 기준

성공하려면 bcrypt cost 10 해시와 비교, 서로 다른 키를 쓰는 HS256 Access/Refresh Token, `httpOnly`·`secure`·`sameSite=lax`·`path=/`·각 만료 시간이 적용된 두 쿠키, password 비노출을 모두 만족해야 합니다. 정상 Access Token은 `req.user`에 연결되고 쿠키 누락·변조·만료는 각각 401로 거부되어야 합니다. Refresh Token도 정상 서명만 해당 키로 검증되고 누락·변조·만료 또는 Access 키와의 교차 사용은 거부되어야 합니다. fixture 값은 실행 계약만 확인하는 공개 테스트 문자열이며 실제 secret으로 사용하지 않습니다.
