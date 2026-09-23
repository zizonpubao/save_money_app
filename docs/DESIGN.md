# SaveLog 디자인 가이드

## 분위기
매일 열고 싶은, 차분하지만 뿌듯한 앱. 화면의 주인공은 딱 하나 — 이번 달 절약액이다. 그 숫자만 크고 파랗게 두고 나머지(날짜·항목·합계)는 회색 톤으로 뒤로 물린다. 가계부처럼 표가 빽빽하지도, 게임처럼 뱃지가 번쩍이지도 않게: 흰 카드 + 회색 배경 + 얇은 구분선의 iOS 기본 감각을 지키고, 기쁨은 저장 순간의 짧은 카운트업·펄스·햅틱에만 담는다. 여백은 넉넉히, 색은 아껴서. 기록이 없는 달도 실패처럼 보이지 않게 한다.

## 토큰 (`src/theme.ts` 만이 출처)
| 구분 | 토큰 | 값 (light / dark) |
| --- | --- | --- |
| 색 | `bg` / `card` | `#F5F6F8` `#FFFFFF` / `#0F1115` `#1A1D23` |
| | `text` / `textMuted` | `#111418` `#6B7280` / `#F3F4F6` `#9CA3AF` |
| | `primary` / `onPrimary` / `primarySoft` | `#2F6FED` `#FFF` `#E8EFFD` / `#5B8DEF` `#FFF` `#1F2A44` |
| | `danger` | `#E5484D` / `#F2555A` |
| | `border`(컨트롤 테두리) / `divider`(카드 안 구분선) | `#E5E7EB` `#EDEFF2` / `#2A2E36` `#2E333C` |
| 간격 | `sp.xs/sm/smd/md/lg/xl` | 4 / 8 / 12 / 16 / 24 / 32 (4의 배수만) |
| 타이포 | `type.display` | 36 / 800 / 42 — 이번 달 절약액 |
| | `type.title` | 28 / 700 / 34 — 화면 제목, 금액 입력값 |
| | `type.heading` | 20 / 700 / 26 — 카드·섹션 제목 |
| | `type.action` | 16 / 700 / 22 — 헤더 "저장" |
| | `type.bodyStrong` / `type.body` | 16 / 600·400 / 22 — 금액·버튼 / 항목명 |
| | `type.label` / `type.note` | 14 / 600·400 / 20 — 섹션 날짜 / 보조 문장 |
| | `type.caption` | 12 / 400 / 16 — 필드 라벨, 메모 |
| radius | `radius.sm/md/lg/pill` | 8(세그먼트) / 12(입력·버튼·행 묶음) / 16(카드) / 999(칩) |
| 그림자 | `shadow.fab` / `shadow.sheet` | 떠 있는 것에만. 색은 `shadowColor: colors.text` |
| 크기 | `size.touch/fab/fabIcon` | 44 / 56 / 30 |
| | `size.swipeAction/headerAction/memoMin/toggleMin` | 88 / 56 / 80 / 120 |
| | `size.barTrack` / `size.bar` / `size.axisLabel` | 120 / 10 / 28 (M3 그래프용) |

## 컴포넌트 규칙
- **카드**: `card` 배경 + `radius.lg` + `padding: sp.lg`. 그림자 없음, 테두리 없음 — 배경 대비로만 뜬다.
- **목록 행**: `card` 배경, `paddingHorizontal: sp.md` / `paddingVertical: sp.smd`, `minHeight: size.touch`. 행 사이만 hairline `divider`, 섹션 마지막 행은 선 없음. 섹션의 첫/마지막 행에 `radius.md` 를 줘서 한 덩어리로 보이게 한다.
- **섹션 헤더**: `bg` 위에 `paddingTop: sp.md` / `paddingBottom: sp.sm`, 왼쪽 날짜(`type.label`)·오른쪽 합계(`type.note`) 둘 다 `textMuted`. 카드 밖 요소라 배경색은 `bg`.
- **칩**: `radius.pill`, `paddingHorizontal: sp.md` / `paddingVertical: sp.sm`, 테두리 1px. 선택 시 `primary` 배경 + `onPrimary` 글자(색만이 아니라 채움으로 구분).
- **버튼/FAB**: 텍스트 버튼은 테두리 1px + `radius.md` + `minHeight: size.touch`, 눌림은 `opacity 0.7`. FAB 은 `size.fab` 원형, `primary`, `shadow.fab`, 우하단 `sp.lg` 여백, 눌림 `opacity 0.85`.
- **헤더·탭바**: 배경 `card`, 그림자 숨김(`headerShadowVisible: false`), 활성 탭 `primary` / 비활성 `textMuted`, 본문 영역은 `bg`.
- **입력 필드**: `card` 배경 + `border` 테두리 + `radius.md`, 라벨은 위에 `type.caption` `textMuted`, 필드 간 간격 `sp.md`. 금액 필드만 `type.title` 로 크게, 오른쪽에 "원".
- **빈 상태**: 가운데 정렬, `type.bodyStrong` 한 줄 + `type.note` 한 줄. 일러스트·느낌표 없음, 문구는 다음 행동을 알려준다("오늘 참은 소비를 + 버튼으로 남겨보세요").

## 금액·날짜 표기
- 금액은 항상 `formatWon()`(₩ 천 단위 콤마, 소수점 없음) + `numeric`(`tabular-nums`) — 카운트업 중에도 자리가 흔들리지 않게.
- 큰 숫자일수록 굵게: 절약액 `display`(800) > 행 금액 `bodyStrong`(600) > 섹션 합계 `note`(400).
- 날짜는 `2026년 9월 23일 (수)`, 월은 `2026년 9월`. 상대 표현("어제")은 쓰지 않는다.

## 다크모드
- 시스템 설정을 따르고 토글 UI 는 두지 않는다. 색은 `useTheme()` 에서만 가져온다.
- `bg` < `card` 순서로 카드가 항상 한 단계 밝다. 다크에서 구분선은 카드보다 밝은 `divider` 로.
- `primary` 는 다크에서 한 톤 밝게(`#5B8DEF`), 흰 글자 대비 유지. 순수 검정·순수 흰색 배경은 쓰지 않는다.

## M3 · M3.5 미리 정한 규칙
- 일별 막대: 트랙 높이 `size.barTrack`, 칸 폭은 균등 `flex: 1`(칸 전체가 탭 영역, gap 없음) + 막대는 칸 안 `70%` 폭, 색은 `primarySoft`, 최고값 막대만 `primary`. 눈금선·축 숫자 없이 아래에 1·15·말일만 `caption`(고정 폭 `size.axisLabel` 라벨을 칸 가운데에, 말일은 오른쪽 끝 정렬).
- 카테고리 비율 바: 높이 `size.bar`, `radius.pill`, 트랙 `primarySoft` / 채움 `primary`, 오른쪽에 금액(`bodyStrong` + `numeric`)과 비율(`note`).
- 목표 진행 바: 카드 큰 숫자 바로 아래 `marginTop: sp.md`, 높이 `size.bar`, 100% 초과분은 색을 바꾸지 말고 "달성! +12,000원 초과"를 `note` 로 덧붙인다.

## 하지 말 것
- `theme.ts` 밖에서 색·폰트 크기·radius 숫자 하드코딩 (`fs`/`sp` 조합 즉석 계산 포함 — 필요하면 토큰을 추가한다).
- 카드·행·칩에 그림자 넣기, 테두리와 그림자 동시에 쓰기.
- primary 를 넓은 면적에 칠하기(배경·헤더). 강조는 숫자와 선택 상태에만.
- 색만으로 의미 전달(삭제=빨강만, 선택=색만) — 라벨이나 채움을 함께 준다.
- 44pt 미만 터치 영역, 12pt 미만 글자, `textMuted` 를 본문에 사용.
- 1초를 넘는 애니메이션, 화면 전환마다 다른 모션, 이모지를 UI 아이콘 대용으로 쓰기(카테고리 이모지는 데이터라 예외).
- 화면마다 다른 여백 — 화면 바깥 패딩은 `sp.md`, 카드 안쪽은 `sp.lg` 로 고정.
