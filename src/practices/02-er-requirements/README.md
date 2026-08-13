# 요구사항을 바탕으로 ER 모델링하기

## 문제와 시작 상태

학교 학사 시스템의 개체, 속성, 관계를 `model.json`에 정의합니다. 시작 파일의 배열은 비어 있어 확인 명령이 실패합니다.

## 수정 파일과 fixture

- 수정: `model.json`
- 요구사항: `fixtures/requirements.json`

## 실행 진입점

`npm run check:02`

## 성공·실패 기준

Student, Professor, Department, Course의 필수 속성과 소속·강의·수강 관계가 모두 있으면 성공합니다. 이름 중복, 필수 항목 누락, 잘못된 JSON은 실패합니다.
