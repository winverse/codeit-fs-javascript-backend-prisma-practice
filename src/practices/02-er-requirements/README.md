# 요구사항을 바탕으로 ER 모델링하기

## 문제와 시작 상태

학교 학사 시스템의 개체, 속성, 관계를 `model.json`에 정의합니다. 시작 파일의 배열은 비어 있어 확인 명령이 실패합니다.

## 수정 파일과 fixture

- 수정: `model.json`
- 요구사항: `fixtures/requirements.json`

`entities`에는 `{ "name": "개체 이름", "attributes": ["속성"] }`, `relationships`에는 `{ "name": "관계 이름", "from": "출발 개체", "to": "도착 개체" }` 형태로 작성합니다. 관계 방향은 교수가 학과에 소속되고, 교수가 강의를 담당하며, 학생이 강의를 수강하는 방향입니다.

## 실행 진입점

`npm run check:02`

## 성공·실패 기준

Student, Professor, Department, Course의 필수 속성과 소속·강의·수강 관계의 방향이 모두 맞으면 성공합니다. 이름 중복, 필수 항목 누락, 반대 관계 방향, 잘못된 JSON은 실패합니다.
