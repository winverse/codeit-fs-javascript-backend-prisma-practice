# 실전 데이터 모델링

## 문제와 시작 상태

영화 예매 시스템과 블로그 시스템의 엔티티, 키, 관계를 각각 Mermaid ER 다이어그램으로 만듭니다. 시작 파일에는 빈 다이어그램만 있습니다.

## 수정 파일과 fixture

- 수정: `diagram.mmd`, `blog-diagram.mmd`
- 엔티티·관계·고유 키 요구사항: `fixtures/constraints.json`

영화 예매 시스템에서 좌석 번호는 상영관 안에서만 고유합니다. Mermaid에는 `%% UNIQUE Seat(theaterId, seatNumber)` 주석으로 복합 고유 제약을 표시합니다. 상영은 아직 판매된 티켓이 없어도 생성할 수 있어야 합니다.

## 실행 진입점

`npm run check:04`

## 성공·실패 기준

두 다이어그램의 모든 엔티티에 PK가 있고 FK·고유 키·관계가 요구사항과 같으며 아직 티켓이 없는 상영을 허용하면 성공합니다. 다이어그램·키·엔티티·관계 누락, `Seat.seatNumber`를 전역 고유값으로 만드는 모델, `Screening ||--|{ Ticket`처럼 최소 한 장을 강제하는 모델은 실패합니다.
