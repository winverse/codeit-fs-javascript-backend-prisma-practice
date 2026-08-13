# 카디널리티와 Mermaid 사용하기

## 문제와 시작 상태

학교 학사 시스템의 1:N, N:M 관계를 Mermaid ER 문법으로 작성합니다. 시작 다이어그램에는 관계가 없습니다.

## 수정 파일과 fixture

- 수정: `diagram.mmd`
- 기대 관계: `fixtures/cardinalities.json`

## 실행 진입점

`npm run check:03`

## 성공·실패 기준

세 관계와 양쪽 최소·최대 카디널리티 표기가 정확하면 성공합니다. 관계 누락, 반대 카디널리티, Mermaid 헤더 누락은 실패합니다.
