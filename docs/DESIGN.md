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
| | `grass1~4`(잔디 농도) / `grassFuture`(잔디 미래 칸) | `#BACFF9` `#8CAFF5` `#5D8FF1` `#2F6FED` `#F5F6F8` / `#2E436F` `#3D5C9A` `#4C74C4` `#5B8DEF` `#22262D` |
| 간격 | `sp.xs/sm/smd/md/lg/xl` | 4 / 8 / 12 / 16 / 24 / 32 (4의 배수만) |
| 타이포 | `type.display` | 36 / 800 / 42 — 이번 달 절약액 |
| | `type.title` | 28 / 700 / 34 — 화면 제목, 금액 입력값 |
| | `type.heading` | 20 / 700 / 26 — 카드·섹션 제목 |
| | `type.action` | 16 / 700 / 22 — 헤더 "저장" |
| | `type.bodyStrong` / `type.body` | 16 / 600·400 / 22 — 금액·버튼 / 항목명 |
| | `type.label` / `type.note` | 14 / 600·400 / 20 — 섹션 날짜 / 보조 문장 |
| | `type.caption` | 12 / 400 / 16 — 필드 라벨, 메모 |
| radius | `radius.xs/sm/md/lg/pill` | 4(잔디 칸) / 8(세그먼트) / 12(입력·버튼·행 묶음) / 16(카드) / 999(칩) |
| 그림자 | `shadow.fab` / `shadow.sheet` | 떠 있는 것에만. 색은 `shadowColor: colors.text` |
| 크기 | `size.touch/fab/fabIcon` | 44 / 56 / 30 |
| | `size.swipeAction/headerAction/memoMin/toggleMin` | 88 / 56 / 80 / 120 |
| | `size.barTrack` / `size.bar` / `size.axisLabel` | 120 / 10 / 28 (M3 그래프용) |
| | `size.todayRing` / `size.emojiCell` / `size.grassCell` / `size.statChip` | 2 / 24 / 16 / 32 (잔디 오늘 테두리, 이모지 적립 칸, 잔디 칸 높이, 정보 칩 높이) |

## 컴포넌트 규칙
- **카드**: `card` 배경 + `radius.lg` + `padding: sp.lg`. 그림자 없음, 테두리 없음 — 배경 대비로만 뜬다.
- **보조 구획**: 카드와 같은 `card` 배경 + `radius.lg` 지만 안쪽은 `paddingHorizontal: sp.md` / `paddingVertical: sp.smd` — 주인공 카드(`sp.lg`)보다 한 단계 가볍다. 제목 없이 내용만.
- **목록 행**: `card` 배경, `paddingHorizontal: sp.md` / `paddingVertical: sp.smd`, `minHeight: size.touch`. 행 사이만 hairline `divider`, 섹션 마지막 행은 선 없음. 섹션의 첫/마지막 행에 `radius.md` 를 줘서 한 덩어리로 보이게 한다.
- **섹션 헤더**: `bg` 위에 `paddingTop: sp.md` / `paddingBottom: sp.sm` / 좌우 `sp.md`(아래 행 안쪽 여백과 세로 줄 맞춤), 왼쪽 날짜(`type.label`)·오른쪽 합계(`type.note`) 둘 다 `textMuted`. 카드 밖 요소라 배경색은 `bg`.
- **칩(선택)**: `radius.pill`, `paddingHorizontal: sp.md` / `paddingVertical: sp.sm`, 테두리 1px. 선택 시 `primary` 배경 + `onPrimary` 글자(색만이 아니라 채움으로 구분). 보기 전용 정보 칩은 홈 배치 4번(`StatChip`).
- **버튼/FAB**: 텍스트 버튼은 테두리 1px + `radius.md` + `minHeight: size.touch`, 눌림은 `opacity 0.7`. FAB 은 `size.fab` 원형, `primary`, `shadow.fab`, 우하단 `sp.lg` 여백, 눌림 `opacity 0.85`.
- **헤더·탭바**: 배경 `card`, 그림자 숨김(`headerShadowVisible: false`), 활성 탭 `primary` / 비활성 `textMuted`, 본문 영역은 `bg`.
- **입력 필드**: `card` 배경 + `border` 테두리 + `radius.md`, 라벨은 위에 `type.caption` `textMuted`, 필드 간 간격 `sp.md`. 금액 필드만 `type.title` 로 크게, 오른쪽에 "원".
- **빈 상태**: 가운데 정렬, `type.bodyStrong` 한 줄 + `type.note` 한 줄. 일러스트·느낌표 없음, 문구는 다음 행동을 알려준다("오늘 참은 소비를 + 버튼으로 남겨보세요").

## 홈 배치 (위→아래, 구획 사이 `sp.smd` 한 가지)
첫 화면(390×844, 헤더·탭바 제외 ≈670pt)에 **목록 3행 이상**이 보이도록 머리 영역을 ≈460pt 안에 둔다 (카드 ≈250 · 칩 32 · 잔디 5줄 140 / 6줄 160).
1. **(M4) 지난달 회고 카드** — 매달 1~3일에만 맨 위. `RecordBanner` 와 같은 "잠깐 알림" 모양(`primarySoft` + `radius.md` + `padding: sp.smd`, 문구 `label` `primary`) 한 줄 + 오른쪽 닫기(×, 44pt 터치). 두 줄을 넘기지 않고 닫으면 그달엔 다시 안 뜬다.
2. **홈 카드** (주인공 카드, 정보 4종까지): 오늘의 한 줄(`body` 16 · `textMuted` · 2줄 말줄임, 문구 종류와 무관하게 같은 모양) → `sp.md` → 숫자(`caption` 회색 라벨 "이번 달 절약 · 2026년 9월" + `display` primary) → 오늘(`sp.xs`, `caption` 회색 한 줄 "오늘 4,500원 · 2026년 9월 24일 (목)") → 목표(`sp.md`, 진행 바 + 아래 한 줄). 구분선 없음. 이 밖의 것(연속 기록일·누적·이모지·잔디)은 카드에 넣지 않는다 — `bottomExtra` 슬롯은 비워 둔다.
3. **축하 배너** `RecordBanner` — 저장 직후 1.5초, 카드 바로 아래.
4. **칩 행** — 한 줄, 칩 사이 `sp.sm`. 칩은 `StatChip`(보기 전용: `card` 배경 + `radius.pill` + 테두리 없음 + `minHeight: size.statChip`, 가로 `sp.smd`, 글자 `label` `text` + `numeric`). 순서: (M4) `🔥 5일째` → (M4) `누적 432,000원` → 이모지 적립 칩(`grow`, 남은 폭 전부, **1줄**, 넘치면 맨 앞 "+N", 저장하면 새 이모지가 오른쪽 끝에서 톡). 기록 0건이면 이모지 칩은 숨긴다. 선택 칩(테두리 1px)과 헷갈리지 않게 정보 칩엔 테두리·눌림 효과를 주지 않는다.
5. **잔디 구획** — 보조 구획 안, 제목 없이 요일 헤더(`caption` 회색)만. 칸 = 폭 7등분 × `size.grassCell`(16) 높이, `radius.xs`, 간격 `sp.xs`.
6. **날짜별 목록** → "이전 달 더 보기"(텍스트 버튼 규칙). 목록 아래 여백 = `size.fab + sp.lg + sp.md` (마지막 행이 FAB 에 안 가리게).

## 금액·날짜 표기
- 금액은 항상 `formatWon()`(₩ 천 단위 콤마, 소수점 없음) + `numeric`(`tabular-nums`) — 카운트업 중에도 자리가 흔들리지 않게.
- 큰 숫자일수록 굵게: 절약액 `display`(800) > 행 금액 `bodyStrong`(600) > 섹션 합계 `note`(400).
- 날짜는 `2026년 9월 23일 (수)`, 월은 `2026년 9월`. 상대 표현("어제")은 쓰지 않는다.

## 다크모드
- 시스템 설정을 따르고 토글 UI 는 두지 않는다. 색은 `useTheme()` 에서만 가져온다.
- `bg` < `card` 순서로 카드가 항상 한 단계 밝다. 다크에서 구분선은 카드보다 밝은 `divider` 로.
- `primary` 는 다크에서 한 톤 밝게(`#5B8DEF`), 흰 글자 대비 유지. 순수 검정·순수 흰색 배경은 쓰지 않는다.

## M3 · M3.5 미리 정한 규칙
- 일별 막대: 트랙 높이 `size.barTrack`, 칸 폭은 균등 `flex: 1`(칸 전체가 탭 영역, gap 없음) + 막대는 칸 안 `70%` 폭, 색은 `primarySoft`, 최고값 막대만 `primary`. 눈금선 없이 아래 축 숫자는 `caption`(고정 폭 `size.axisLabel` 라벨을 칸 가운데에, 1일은 왼쪽 끝·말일은 오른쪽 끝 정렬). 월 모드는 **1 · 5 · 10 · 15 · 20 · 25 · 30 · 말일**(5일 단위, 말일과 겹치거나 바로 붙으면 말일만 — 31일 달은 …25·31, 30일 달은 …25·30, 2월은 …25·28), 년 모드 월별 막대 12개는 **1~12 전부**.
  - 조작: 누른 채 좌우 쓸기, 날 바뀔 때 selection 햅틱 (단순 탭=선택/재탭 닫기, 선택 막대는 `primary`).
- 카테고리 비율 바: 높이 `size.bar`, `radius.pill`, 트랙 `primarySoft` / 채움 `primary`, 오른쪽에 금액(`bodyStrong` + `numeric`)과 비율(`note`).
- 목표 진행 바: 카드 오늘 줄 아래 `marginTop: sp.md`, 높이 `size.bar`. 바 아래 한 줄 — 왼쪽 "목표 300,000원"(`caption` 회색), 오른쪽 끝 "62%"(`bodyStrong` + `numeric` + `primary`). 100% 를 넘어도 바는 가득에서 멈추고 % 는 계속 오르며("104%") 앞에 "+12,000원 초과"(`caption` 회색)를 붙인다.

## 하지 말 것
- `theme.ts` 밖에서 색·폰트 크기·radius 숫자 하드코딩 (`fs`/`sp` 조합 즉석 계산 포함 — 필요하면 토큰을 추가한다).
- 카드·행·칩에 그림자 넣기, 테두리와 그림자 동시에 쓰기.
- primary 를 넓은 면적에 칠하기(배경·헤더). 강조는 숫자와 선택 상태에만.
- 색만으로 의미 전달(삭제=빨강만, 선택=색만) — 라벨이나 채움을 함께 준다.
- 44pt 미만 터치 영역, 12pt 미만 글자, `textMuted` 를 본문에 사용 (예외: 홈 오늘의 한 줄 — 크기만 `body`, 큰 숫자와 겨루지 않게 회색).
- 1초를 넘는 애니메이션, 화면 전환마다 다른 모션, 이모지를 UI 아이콘 대용으로 쓰기(카테고리 이모지는 데이터라 예외).
- 화면마다 다른 여백 — 화면 바깥 패딩은 `sp.md`, 카드 안쪽은 `sp.lg`, 보조 구획 안쪽은 `sp.md`/`sp.smd` 로 고정.
- 홈 카드 안에 다섯 번째 정보 넣기, 같은 "패턴"(이모지 줄·잔디)을 한 구획에 겹쳐 두기.
