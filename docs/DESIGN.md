# SaveLog 디자인 가이드

## 분위기
매일 열고 싶은, 차분하지만 뿌듯한 앱. 화면의 주인공은 딱 하나 — 이번 달 절약액이다. 그 숫자만 크고 파랗게 두고 나머지(날짜·항목·합계)는 회색 톤으로 뒤로 물린다. 가계부처럼 표가 빽빽하지도, 게임처럼 뱃지가 번쩍이지도 않게: 흰 카드 + 회색 배경 + 얇은 구분선의 iOS 기본 감각을 지키고, 기쁨은 저장 순간의 짧은 카운트업·펄스·햅틱에만 담는다. 여백은 넉넉히, 색은 아껴서. 기록이 없는 달도 실패처럼 보이지 않게 한다.

## 토큰 (`src/theme.ts` 만이 출처)
| 구분 | 토큰 | 값 (light / dark) |
| --- | --- | --- |
| 색 | `bg` / `card` | `#F5F6F8` `#FFFFFF` / `#0F1115` `#1A1D23` |
| | `text` / `textMuted` | `#111418` `#6B7280` / `#F3F4F6` `#9CA3AF` |
| | `primary` / `onPrimary` / `primarySoft` | `#2F6FED` `#FFF` `#E8EFFD` / `#5B8DEF` `#FFF` `#1F2A44` |
| | `onPrimarySoft`(primarySoft 위 글자·아이콘) | `#1F56C8` / `#6E9BF2` (폴리싱: primarySoft 위 대비 5.65 / 5.18, primary 는 3.94 / 4.41) |
| | `danger` | `#CE2C31` / `#F2555A` (폴리싱: 라이트 `#E5484D` 는 card 위 대비 3.9 → 5.2) |
| | `border`(컨트롤 테두리) / `divider`(카드 안 구분선) | `#E5E7EB` `#EDEFF2` / `#2A2E36` `#2E333C` |
| | `grass1~4`(잔디 농도) / `grassFuture`(잔디 미래 칸) | `#BACFF9` `#8CAFF5` `#5D8FF1` `#2F6FED` `#F5F6F8` / `#2E436F` `#3D5C9A` `#4C74C4` `#5B8DEF` `#0F1115` (M4: 라이트처럼 `bg` 와 같은 움푹한 칸, 기록 없는 날 `divider` 와 구분) |
| | `good` / `warn`(M4 컨페티 조각 전용, 글자·넓은 면에 쓰지 않음) | `#30A46C` `#F5A524` / `#4CC38A` `#FFB224` |
| | `shadow`(그림자 색 전용) | `#111418` / `#000000` (다크에서 `text` 를 쓰면 흰 번짐) |
| 간격 | `sp.xs/sm/smd/md/lg/xl` | 4 / 8 / 12 / 16 / 24 / 32 (4의 배수만) |
| 타이포 | `type.display` | 36 / 800 / 42 — 이번 달 절약액 |
| | `type.title` | 28 / 700 / 34 — 화면 제목, 금액 입력값 |
| | `type.heading` | 20 / 700 / 26 — 기간 제목(`2026년 9월`)·플로팅 라벨. 카드 안 소제목("일별")은 `bodyStrong` |
| | `type.action` | 16 / 700 / 22 — 헤더 "저장" |
| | `type.bodyStrong` / `type.body` | 16 / 600·400 / 22 — 금액·버튼 / 항목명 |
| | `type.label` / `type.note` | 14 / 600·400 / 20 — 섹션 날짜 / 보조 문장 |
| | `type.caption` | 12 / 400 / 16 — 필드 라벨, 메모 |
| radius | `radius.xs/sm/md/lg/pill` | 4(잔디 칸) / 8(세그먼트) / 12(입력·버튼·행 묶음) / 16(카드) / 999(칩) |
| 그림자 | `shadow.fab` / `shadow.sheet` | 떠 있는 것에만. 색은 `shadowColor: colors.shadow` |
| 크기 | `size.touch/fab/fabIcon` | 44 / 56 / 30 |
| | `size.swipeAction/headerAction/memoMin/toggleMin` | 88 / 56 / 80 / 120 |
| | `size.barTrack` / `size.bar` / `size.axisLabel` | 120 / 10 / 28 (M3 그래프용) |
| | `size.todayRing` / `size.emojiCell` / `size.grassCell` / `size.statChip` | 2 / 24 / 16 / 32 (잔디 오늘 테두리, 이모지 적립 칸, 잔디 칸 높이, 정보 칩 높이) |
| | `size.confettiWidth` / `size.confettiHeight` / `size.confettiScaleBig` | 6 / 10 / 1.4 (M4 저장 컨페티 한 조각, big 은 1.4배 = 8.4 × 14) |
| | `size.chipMaxWidth` / `size.percentLabel` | 200 / 40 (빠른 입력 칩 최대 폭, 카테고리 합계 % 칸 고정 폭) |

## 컴포넌트 규칙
- **카드**: `card` 배경 + `radius.lg` + `padding: sp.lg`. 그림자 없음, 테두리 없음 — 배경 대비로만 뜬다.
- **보조 구획**: 카드와 같은 `card` 배경 + `radius.lg` 지만 안쪽은 `paddingHorizontal: sp.md` / `paddingVertical: sp.smd` — 주인공 카드(`sp.lg`)보다 한 단계 가볍다. 제목 없이 내용만.
- **목록 행**: `card` 배경, `paddingHorizontal: sp.md` / `paddingVertical: sp.smd`, `minHeight: size.touch`. 행 사이만 hairline `divider`, 섹션 마지막 행은 선 없음. 섹션의 첫/마지막 행에 `radius.md` 를 줘서 한 덩어리로 보이게 한다.
- **섹션 헤더**: `bg` 위에 `paddingTop: sp.md` / `paddingBottom: sp.sm` / 좌우 `sp.md`(아래 행 안쪽 여백과 세로 줄 맞춤), 왼쪽 날짜(`type.label`)·오른쪽 합계(`type.note`) 둘 다 `textMuted`. 카드 밖 요소라 배경색은 `bg`. 설정 섹션 제목도 같은 자리·같은 글자.
- **행 글자 넘침**: 이름은 `flex: 1` + 1줄 말줄임, 오른쪽 값·금액은 `marginLeft: sp.sm` 로 이름과 띄운다.
- **칩(선택)**: `radius.pill`, `paddingHorizontal: sp.md` / `paddingVertical: sp.sm`, 테두리 1px. 선택 시 `primary` 배경 + `onPrimary` 글자(색만이 아니라 채움으로 구분). 보기 전용 정보 칩은 홈 배치 4번(`StatChip`). (M4) 입력 시트 맨 위 빠른 입력 칩도 이 모양(선택 상태 없이 누르면 채움, 눌림 `opacity 0.7`).
- **버튼/FAB**: 텍스트 버튼은 `card` 바탕 + `border` 테두리 1px + `radius.md` + `minHeight: size.touch`, 눌림은 `opacity 0.7`. 지우는 버튼("이 기록 삭제"·"목표 없애기"·"카테고리 삭제")도 같은 모양에 글자만 `danger`. FAB 은 `size.fab` 원형, `primary`, `shadow.fab`, 우하단 `sp.lg` 여백, 눌림 `opacity 0.85`.
- **(M4.5) 원탭 저장 메뉴**: FAB 을 `motion.longPressMs`(500ms) 길게 누르면 Medium 햅틱과 함께 FAB 바로 위(`bottom: sp.lg + size.fab + sp.sm`, 오른쪽 `sp.lg`)에 뜬다. `card` 배경 + `radius.lg` + `shadow.fab`(떠 있는 것), 폭 `size.quickMenuWidth`(240), 위에 `caption` 회색 "누르면 바로 저장" 한 줄.
- 행은 최근 항목 최대 4개, 한 행 `minHeight: size.touch` · 이모지 · 항목명(`body`) · 금액(`bodyStrong` + `numeric`), 행 사이 hairline `divider`, 눌림 `opacity 0.7`. 스크린리더 라벨은 "커피 4,500원 바로 저장".
- FAB 쪽 모서리 기준 scale `motion.quickMenuFrom`(0.9) → 1 spring + opacity, 150ms(`motion.quickMenuMs`)로 펼치고 같은 시간에 접는다(동작 줄이기면 opacity 만). 뒤는 투명한 막으로 덮어 메뉴 밖 탭·쓸기·FAB 짧은 탭이 모두 "닫기" 가 된다.
- **(M4.5) 금액 프리셋 칩**: 금액 칸 바로 아래(`sp.sm`) 한 줄 `+` `5백` `1천` `3천` `5천` `1만`, **누적 방식**(누를 때마다 현재 금액에 더함, 지우기는 키패드 백스페이스). 금액 칩은 빠른 입력 칩과 같은 모양(선택 상태 없음, 눌림 `opacity 0.7`), 누르면 selection 햅틱.
  - **부호 칩**: 맨 앞, 최소 폭 `size.touch`, 글자 `bodyStrong`. `+` 는 금액 칩과 같은 모양, `−`(U+2212) 는 선택 칩처럼 `primary` 채움 + `onPrimary` 글자(글자 하나만이 아니라 채움으로도 구분, `accessibilityState.selected`). 탭하면 selection 햅틱. `−` 동안 금액 칩은 빼고 0 에서 멈춘다. 저장 성공·시트 닫힘이면 `+` 로 돌아온다.
  - **글자 축약**: 100~999 `N백` · 1,000~9,999 `N천` · 10,000↑ `N만`, 소수 첫째 자리까지 버림(`.0` 없음). 스크린리더는 원 단위 전체 "금액에 1,500원 더하기/빼기".
  - 값 5개는 설정 "입력 → 빠른 금액 버튼" 이 출처(`settingsStore.amountPresets`).
- **헤더·탭바**: 배경 `card`, 그림자 숨김(`headerShadowVisible: false`), 활성 탭 `primary` + 채운 아이콘 / 비활성 `textMuted` + `-outline` 아이콘(색만으로 구분하지 않음), 탭바 윗선 `divider`, 본문 영역은 `bg`. 내비게이션 테마 색도 토큰으로 덮는다(전환 중 바탕).
- **모달 헤더**(입력·목표·빠른 금액·카테고리): `card` 바탕, 선 없음, 좌 "취소"(`body` 회색) · 가운데 제목(`bodyStrong`) · 우 "저장"(`action` primary, 못 누르면 `textMuted`). 좌우 칸 `size.headerAction` × `size.touch`.
- **입력 필드**: `card` 배경 + `border` 테두리 + `radius.md`, 라벨은 위에 `type.caption` `textMuted`, 필드 간 간격 `sp.md`. 금액 필드만 `type.title` 로 크게, 오른쪽에 "원".
- **빈 상태**: 가운데 정렬, `type.bodyStrong` 한 줄 + `type.note` 한 줄. 일러스트·느낌표 없음, 문구는 다음 행동을 알려준다("오늘 참은 소비를 + 버튼으로 남겨보세요"). 목록 빈 상태는 `paddingVertical: sp.xl`. "찾을 수 없음"(기록 수정·없는 화면)은 두 번째 줄 대신 `label` primary 텍스트 버튼(44pt).
- **빈 상태·안내·버튼 문구**: 짧은 해요체 허용("이 달엔 기록이 없어요", "목표를 정하면 진행률이 보여요"). 문서·README·커밋은 합니다체 (`docs/STYLE-KO.md` 톤 예외).

## 홈 배치 (위→아래, 구획 사이 `sp.smd` 한 가지)
첫 화면(390×844, 헤더·탭바 제외 ≈670pt)에 **목록 3행 이상**이 보이도록 머리 영역을 ≈460pt 안에 둔다 (카드 ≈250 · 칩 32 · 잔디 5줄 140 / 6줄 160).
1. **(M4) 지난달 회고 카드** — 매달 1~3일에만 맨 위. `RecordBanner` 와 같은 "잠깐 알림" 모양(`primarySoft` + `radius.md` + `padding: sp.smd`, 문구 `label` `primary`) 한 줄 + 오른쪽 닫기(×, 44pt 터치). 두 줄을 넘기지 않고 닫으면 그달엔 다시 안 뜬다.
2. **홈 카드** (주인공 카드, 정보 4종까지): 오늘의 한 줄(`body` 16 · `textMuted` · 2줄 말줄임, 문구 종류와 무관하게 같은 모양) → `sp.md` → 숫자(`caption` 회색 라벨 "이번 달 절약 · 2026년 9월" + `display` primary) → 오늘(`sp.xs`, `caption` 회색 한 줄 "오늘 4,500원 · 2026년 9월 24일 (목)") → 목표(`sp.md`, 진행 바 + 아래 한 줄). 구분선 없음. 이 밖의 것(연속 기록일·누적·이모지·잔디)은 카드에 넣지 않는다 — `bottomExtra` 슬롯은 비워 둔다.
3. **축하 배너** `RecordBanner` — 저장 직후 1.5초, 카드 바로 아래.
4. **칩 행** — 한 줄, 칩 사이 `sp.sm`. 칩은 `StatChip`(보기 전용: `card` 배경 + `radius.pill` + 테두리 없음 + `minHeight: size.statChip`, 가로 `sp.smd`, 글자 `label` `text` + `numeric`). 순서: (M4) `🔥 5일째` → (M4) `누적 432,000원` → 이모지 적립 칩(`grow`, 남은 폭 전부, **1줄**, 넘치면 맨 앞 "+N", 저장하면 새 이모지가 오른쪽 끝에서 톡). `🔥` 칩은 0일이면, 누적 칩은 0원이면, 이모지 칩은 이번 달 0건이면 숨기고 셋 다 없으면 줄째로 숨긴다. 저장으로 연속 기록일이 늘면 `🔥` 칩만 1.15 spring. 선택 칩(테두리 1px)과 헷갈리지 않게 정보 칩엔 테두리·눌림 효과를 주지 않는다.
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

## 저장 축하 연출
사용자 요청 "듀오링고처럼 생동감·타격감, 희열". 이 절이 PRD M4 구간 이펙트 세부(Medium 2연타 120ms · 컨페티 20/40 · 숫자 1.1), 위 분위기 문단의 "펄스·햅틱에만", 홈 배치 4번의 "🔥 칩 1.15 spring" 보다 우선한다. 도구는 reanimated 4 · expo-haptics · expo-audio · View 파티클뿐(Lottie 등 금지).

**원리 5개**
1. **3박자** — 기대(움츠림 80ms) → 타격(오버슈트 + 햅틱 + 소리가 같은 프레임) → 여운(숫자·라벨·파티클이 흩어지며 settle).
2. **오버슈트** — 목표값을 넘겼다 돌아온다. 카드 1.08(big 1.09) · 큰 숫자 1.15(big 1.25) · 칩 1.3 → 1. 카드는 358pt 라 1.09(390pt)가 화면 폭 390 에 닿는 한계(1.10 은 394pt 로 넘침), 크게 튀는 역할은 숫자·라벨·흔들림이 맡는다.
3. **시간차** — 한꺼번에 움직이지 않는다. 타격 기준 +0 숫자·글로우 / +40 플로팅 라벨 / +120 이모지 칩 / +160 🔥 칩 / +200 목표 바 (`motion.stagger` 40ms 단위).
4. **값에 비례** — 금액 구간(base < 4천 ≤ mid < 2만 ≤ big, 사용자 결정)과 사건(목표·이정표·최고)이 커질수록 층을 **더한다**. 아래 등급은 위 등급의 부분집합.
5. **질리지 않게** — 매번 시드(저장 시각)로 모양을 바꾸고, 전체는 짧게(base·mid 는 t0+880, big 은 t0+1000 안에 정지).

**기준 시각 t0와 레이어**
- 저장 탭 순간(시트가 아직 위): `Haptics.selectionAsync()` 한 번 — "눌렸다" 확인이자 기대감. 소리 없음.
- **t0 = 시트가 다 내려간 순간.** pageSheet 가 닫히는 ~300ms 동안 카드가 가려져 있어 그 전에 친 타격은 안 보인다. `EntryFormModal` 의 `onDismiss`(iOS)가 이미 `onClose` 에 붙어 있으니 "저장으로 닫힘" 플래그로 구분해 t0 를 쏘고, 400ms 안전 타이머로 폴백한다. 아래 표의 시간은 모두 t0 기준.
- 파티클·플래시·라벨·글로우는 홈 루트의 `CelebrationLayer`(absolute fill, `pointerEvents="none"`, FAB 위) 에 그린다. 저장 직전 카드의 사각형 `{x, y, w, h}` 를 잰다(`measureCardCenter` 를 확장) — 컨페티·라벨 원점은 그 가운데, `GlowRing` 은 그 사각형 그대로. 목록 행의 `overflow: 'hidden'` 영향을 받지 않게 카드 안에 넣지 않는다.
- 연출이 아닌 것: 수정 저장(`update`), 첫 오픈 카운트업(0 → 월 합계). 소리·라벨 없음, 수정 저장은 selection 햅틱 하나만.

**기본 연출 — 모든 새 저장 (base, 4천원 미만)**
| 시간(ms) | 요소 | 값 | 이징 |
| --- | --- | --- | --- |
| 0 | 카드 움츠림 | scale 1 → 0.97, 80ms | `withTiming` `Easing.out(quad)` |
| 80 | **타격** 카드 | 0.97 → 1.08 (100ms) → 1 | `withTiming` `Easing.out(cubic)` → `withSpring(1, springSettle)` |
| 80 | 햅틱 · 소리 | Medium impact · `tap.wav` | 같은 프레임 |
| 80 | 큰 숫자 | scale 1 → 1.15 → 1 + 카운트업 600ms | `springHit` → `springSettle` / 카운트업 `Easing.out(cubic)` |
| 80 | `GlowRing` 1겹 | 카드와 같은 사각형(`radius.lg`), 테두리 4pt `primary`, 바깥으로 12pt 퍼짐(inset 0 → −12), opacity 0.35(다크 0.45) → 0, 600ms | `Easing.out(quad)` |
| 120 | `FloatingLabel` | "+4,500원" `heading`(20/700) `primary` `numeric`, 카드 가운데에서 translateY 0 → −40, scale 0.6 → 1.3(150ms) → 1, opacity 0 → 1(80ms) · 유지 · 마지막 250ms 에 → 0, 전체 700ms | Y `Easing.out(cubic)` / scale `springHit` |
| 200 | 이모지 칩 새 이모지 | scale 0 → 1.3 → 1 | `springHit` → `springSettle` |
| 240 | 🔥 칩 (연속 기록일이 늘었을 때만) | 아래 "사건별" 참조 | |
| 280 | 목표 바 | 이전 % → 새 % | `withSpring {damping 16, stiffness 180}` |
| ~900 | 전부 정지 | 카운트업 끝 680 · 라벨 끝 820 · 글로우 끝 680 (mid 컨페티 880 끝. big·목표는 아래 표대로 1000 끝) | |

스프링 시작값: `springHit {damping 12, stiffness 320, mass 0.8}` · `springSettle {damping 18, stiffness 200}`.

**mid (4천원↑) — base 에 더하거나 바꾸는 것**
| 시간 | 요소 | 값 |
| --- | --- | --- |
| 80 | 햅틱 | Medium(80) → Heavy(160) 2단 |
| 80 | 소리 | `tap` 대신 `tada.wav` |
| 80 | `Confetti` | **32개**, 카드 가운데에서 방사, 800ms (기존 궤적 규칙). 한 번만 터지니 big 한 번(24)보다 넉넉히 |
| 80 / 160 | `GlowRing` 2겹 | 1겹째 그대로 + 2겹째 80ms 뒤, 테두리 2pt, inset → −16 (좌우 여백 16 안) |
| 120 | `FloatingLabel` | `title`(28/700) — 1.5배 급 |

**big (2만원↑) — mid 에 더하거나 바꾸는 것**
사용자 피드백 "big 이 mid 에 비해 덜하다, 더 타격감 있게" 로 강화. 시간은 t0 기준(타격 = t0+80). "타격 +0 / +100 / +220" 이 한 박자 틀이라 Heavy 3번째 · 컨페티 3번째 · 플래시 2번째가 t0+300 에 함께 친다.

| 시간(ms) | 요소 | 값 |
| --- | --- | --- |
| 80 / 180 / 300 | `Confetti` 3번 | 24 × 3 = **72개**. 조각 1.4배(`size.confettiScaleBig`), 각도 −170°~−10°, 초속 1.3배(최고 높이 ≈82pt, mid 60pt), 3번째는 좌우로 30° 더 벌림(−200°~+20°, 옆으로 살짝 눕는 조각 포함). 셋 다 **t0+1000 에 함께 끝** — 늦게 터질수록 짧게 920 / 820 / 700ms |
| 80 | 화면 흔들림 | 홈 영역(`index.tsx` 루트 `Animated.View`)을 translateX +3 → −3 → +3 → 0, 각 30ms 합 120ms(`motion.shake` 진폭 3 · 120ms, 200 끝). 오버레이(컨페티·라벨)와 FAB 은 흔들지 않는다 |
| 80 / 300 | `ScreenFlash` 2번 | 화면 전체 `primary` 0 → 0.14(다크 0.18) 40ms → 0 80ms → 쉼 100ms → 0.08(다크 0.10) 30ms → 0 70ms (400 끝). 한 View 에 한 시퀀스. `primarySoft` 는 라이트·다크 모두 배경과 대비가 없어 안 보여 `primary` 를 쓴다 — "primary 넓은 면적 금지"의 유일한 예외 |
| 80 | 카드 | 0.97 → **1.09**(시드 없이 고정) → 1, settle `springSettleBig {damping 13, stiffness 200}` — 한 번 더 출렁 |
| 80 | 큰 숫자 | 1 → **1.25** → 1, settle `springSettleBig` |
| 80 / 170 / 300 / 500 | 햅틱 4번 | Heavy 3연타(타격 0/90/220 — "쿵쿵—쿵") + 타격 +420 `Notification.Success` 피날레(마지막 Heavy 와 200ms 떨어져 겹치지 않는다) |
| 80 | 소리 | `hit.wav` (아래 효과음 표) |
| 120 | `FloatingLabel` | `display`(36/800), "+55,000원 🔥", 위로 **60pt**, scale **0.5 → 1.4 → 1**, **880ms** (900 이면 1020 에 끝나 1초 상한을 넘어 20ms 줄임) |
| **1000** | 전부 정지 | 마지막 요소 = 컨페티 3번 · 플로팅 라벨이 t0+1000 에 끝. 오버레이는 `motion.layerMs` 1000 에 걷는다 |

**사건별 (금액 구간 위에 얹는다)**
- 사건은 연출 등급의 **바닥**을 올린다: 목표 달성 → big + 아래 목표 층 / 이정표 → 최소 big / 최고 기록 → 최소 mid / 🔥 증가 → 등급 그대로.
- **목표 달성**: t0+280 바가 100% 까지 `withSpring {damping 11, stiffness 220}` · 카드 틴트 `primarySoft` 0 → 1 → 0, t0+80(타격과 함께) 시작 → 880 끝 · 컨페티 색 비율 `good` 50% / `primary` 25% / `warn` 25% · 소리 `fanfare.wav`(hit 대신) · 햅틱은 big 과 같음(Heavy 3연타 + t0+500 Success 1회 — Success 가 두 번 울리지 않게) · 배너 "이번 달 목표 달성 🎉" 가 t0+300 에 **위에서 튕겨 내려옴** translateY −20 → 0 `withSpring {damping 11, stiffness 260}` + opacity 0 → 1 120ms.
- **최고 기록 · 이정표 배너**: t0+300 에 scale 0.8 → 1 `withSpring {damping 10, stiffness 300}`(1.04 쯤 넘쳤다 돌아옴) + opacity 0 → 1 100ms. 이정표는 소리 `ding`, 최고 기록은 등급 소리 그대로.
- **🔥 칩**: t0+240 에 scale 1 → 1.3 → 1(`springHit` → `springSettle`) + rotate 0 → −6° → +6° → −3° → 0, 각 60ms(합 240ms) `Easing.inOut(quad)` — 불꽃이 흔들리듯.
- 배너는 정보라 기존대로 1.5초 머물지만 **등장 모션은 400ms 안**. 배너·소리·축하 햅틱 **패턴**은 한 저장에 하나씩만(저장 탭 selection 은 확인이라 별개): 우선순위 목표 > 이정표 > 최고 기록 > 금액 구간.

**효과음 규격 (빌더 작업)**
- `npx expo install expo-audio` (Expo SDK 모듈, 재생만이라 config plugin 불필요) → `npx expo-doctor`. 소리는 **생성**한다(CC0 다운로드 대신): `scripts/gen-sounds.mjs`, Node 기본 모듈만, `assets/sounds/*.wav` 로 출력하고 결과 파일을 커밋.
- 형식: WAV PCM16 mono **22.05 kHz**, 각 40KB 이하, 피크 −1 dBFS 정규화(big 의 `hit` 만 −0.5 dBFS), 앞뒤 5ms 페이드(클릭 잡음 방지). 사인파 하나가 아니라 합성(배음·피치 변화·노이즈·화음)으로 풍성하게. 노이즈 시드 고정(재생성해도 같은 파일).

| 파일 | 소리 | 길이 |
| --- | --- | --- |
| `tap.wav` | "팝": 700 → 320 Hz 지수 하강 + 3ms 노이즈 버스트 | 90ms · 4.0KB |
| `ding.wav` | 종소리: 1320 Hz + 배음 2.4×·3.9×(작게), 배음별 감쇠 | 320ms · 14.2KB |
| `tada.wav` | 상행 C5·E5·G5 삼각파 각 90ms + 끝에 4~6kHz 반짝임 | 380ms · 16.8KB |
| `hit.wav` | "쾅": 0~110ms "쿵" 사인 60 → 40 Hz 하강 + 2·3·4배 배음 + 8ms 노이즈(진폭 1.0) → 화음 두 번 찍기(진폭 0.8, 삼각파 + 사각파 20%): 40ms C5·E5·G5·C6 / 200ms 5도 위 G5·B5·D6·G6 → 300ms 부터 4.7·5.6·6.6kHz 반짝임 종 3개 40ms 간격(0.4). 파트별로 최고 진폭을 맞춰 섞고 피크 −0.5 dBFS | 520ms · 22.4KB |
| `fanfare.wav` | 상행 C5·E5·G5·C6 + 끝 C·E·G 화음 200ms, 사각파 20% | 450ms · 19.9KB |

- 등급별 배정: base `tap` · mid `tada` · big `hit` · 목표 `fanfare` · 이정표 배너 `ding`.
- 재생: `useCelebrationSound` 훅이 홈 마운트 때 5개를 `useAudioPlayer` 로 미리 로드, 소스는 `downloadFirst: true` 로 기기에 먼저 내려받아 재생(Expo Go 에서는 에셋 주소가 개발 서버 URL 이라 스트리밍이 조용히 실패할 수 있음). 트리거 시 재생 중이면 `pause()` → `seekTo(0)` 완료 후 `play()`. 볼륨 1. `setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false })` — 무음 스위치를 따르고 사용자 음악을 끊지 않는다(옵션 이름은 설치된 SDK 문서로 확인).
- 설정 탭에 "효과" 구획: `효과음` · `햅틱` 스위치 2줄(`SettingsRow`), 기본 켬. 효과음 아래 미리 듣기 칩 5개(등급 순 톡/짠/쾅/팡파르/띵, 스위치 꺼지면 비활성)와 "무음 스위치가 켜져 있으면 나지 않습니다" 안내, 햅틱 아래 "진동 느껴 보기". settings 키 `sound_enabled` / `haptics_enabled` = `'1'|'0'`(스키마 변경 없음). 햅틱 스위치는 `src/utils/haptics.ts` 한 곳에서 검사해 앱 전체 햅틱을 끈다.

**동작 줄이기 (`useReduceMotion()` 이 참)**
- 생략: 컨페티 · 플래시 · 화면 흔들림 · 플로팅 라벨 · 글로우 · 카드 움츠림/타격 · 숫자 오버슈트 · 칩 튐/흔들림 · 배너 이동(opacity 150ms 로만 등장).
- 유지: 햅틱 · 소리 · 카운트업 · 목표 바(spring 대신 `withTiming` 300ms).

**질리지 않게**
- 시드 = 저장 시각: 컨페티 각도·속도·회전·색 순서, 카드 타격 최고값 1.06~1.08 사이(1.08 상한).
- 플로팅 라벨은 **금액이 항상 주인공**, 꼬리말만 시드로 돌린다: "+4,500원" / "+4,500원 적립" / "+4,500원 아꼈다". big 은 꼬리말 대신 🔥.
- 연속 저장: 새 t0 가 오면 `runId` 를 올리고 모든 shared value 에 `cancelAnimation` → 쉬는 값(scale 1 · opacity 0)으로 되돌린 뒤 새로 시작. 예전 `setTimeout`(햅틱 박자) 은 모두 `clearTimeout`, 컨페티·라벨은 `key={runId}` 로 다시 마운트, 이전 runId 의 완료 콜백은 무시.

**토큰 (빌더가 `theme.ts` 에 추가)**: `motion.shrink 0.97` · `motion.cardHit 1.08` / `cardHitBig 1.09` · `motion.numberHit 1.15` / `numberHitBig 1.25` · `motion.chipHit 1.3` · `motion.labelHit 1.3` / `labelHitBig 1.4` · `motion.labelFrom 0.6` / `labelFromBig 0.5` · `motion.stagger 40` · `motion.floatRise 40` / `floatRiseBig 60` · `motion.labelMs 700` / `labelMsBig 880` · `motion.glowSpread 12` / `16` · `motion.flashOpacity 0.14` / 다크 `0.18` · `motion.flash2At 300` · `motion.flash2Opacity 0.08` / 다크 `0.10` · `motion.shake {amplitude 3, ms 120}` · `motion.confettiBigAt [80, 180, 300]` · `motion.confettiEndAt 1000` · `motion.confettiBig3Spread 30` · `motion.confettiSpeedBig 1.3` · `motion.finaleAt 500` · `motion.layerMs 1000` · `motion.springHit` · `motion.springSettle` / `springSettleBig` · `size.glowBorder 4` / `2` · `size.confettiScaleBig 1.4`.

**하지 말 것 (연출)**
- t0 이후 1초를 넘는 움직임(배너가 머무는 시간 제외), 화면을 가리는 불투명 오버레이, 탭을 막는 레이어(`pointerEvents` 가 `none` 이 아닌 것), 연출 중 입력·스크롤 잠그기.
- 큰 기본 볼륨, 한 저장에 소리 둘 이상, Success 알림 햅틱과 impact 를 같은 박자에 겹치기.
- 컨페티 72개 초과(big 24 × 3 이 상한, View 파티클 성능), 카드 scale 1.08 초과(화면 밖으로 삐져나감 — big 만 390pt 폭 한계인 1.09), 흔들림 3pt 초과.

**구현 메모**
- t0 구현: 저장 탭에서 DB 에는 바로 쓰고 화면 반영(`entryStore.addDeferred` → `publish`)을 t0 로 미룬다. 카운트업·이모지·🔥·목표 바·배너가 모두 t0 뒤 자기 시각(`motion.*At`)에 움직인다.
- expo-audio 의 config plugin(마이크 권한용)은 `app.json` 에 넣지 않는다. 재생만 쓰고 Expo Go 는 plugin 을 읽지 않는다. 수정 저장은 selection 햅틱만.

## 하지 말 것
- `theme.ts` 밖에서 색·폰트 크기·radius 숫자 하드코딩 (`fs`/`sp` 조합 즉석 계산 포함 — 필요하면 토큰을 추가한다).
- 카드·행·칩에 그림자 넣기, 테두리와 그림자 동시에 쓰기.
- primary 를 넓은 면적에 칠하기(배경·헤더). 강조는 숫자와 선택 상태에만.
- 색만으로 의미 전달(삭제=빨강만, 선택=색만) — 라벨이나 채움을 함께 준다.
- 44pt 미만 터치 영역, 12pt 미만 글자, `textMuted` 를 본문에 사용 (예외: 홈 오늘의 한 줄 — 크기만 `body`, 큰 숫자와 겨루지 않게 회색).
- 1초를 넘는 애니메이션, 화면 전환마다 다른 모션, 이모지를 UI 아이콘 대용으로 쓰기(카테고리 이모지는 데이터라 예외).
- 화면마다 다른 여백 — 화면 바깥 패딩은 `sp.md`, 카드 안쪽은 `sp.lg`, 보조 구획 안쪽은 `sp.md`/`sp.smd` 로 고정.
- 홈 카드 안에 다섯 번째 정보 넣기, 같은 "패턴"(이모지 줄·잔디)을 한 구획에 겹쳐 두기.

## 폴리싱 기록 (M5 이후 앱 전체)
- **공통**: 라이트 `danger` 를 `#CE2C31` 로(대비 4.5↑), 그림자 색 `colors.shadow` 추가(다크 FAB·원탭 메뉴의 흰 번짐 제거). 내비게이션 테마 색을 토큰으로 덮어 화면 전환 중 바탕이 `bg` 로 보인다.
- **탭바·헤더**: 활성 탭은 채운 아이콘, 비활성은 `-outline`(모양으로도 구분). 탭바 윗선 `border` → `divider`. 기록 수정 헤더 "저장" 터치 44pt.
- **홈**: 목록 행 금액을 항목명과 `sp.sm` 띄움(긴 항목명 말줄임이 금액에 붙지 않게). 행 안 하드코딩 `gap: 2` 삭제. 배너·회고·오늘의 한 줄 글자에 `numeric`.
- **기록 탭**: 요약 카드 제목을 홈 카드처럼 `caption` 회색 라벨로. 기간 화살표를 Ionicons chevron(비활성 opacity 0.3)으로. 카드 사이 `sp.md` → 홈과 같은 `sp.smd`.
- **기록 탭 계속**: 월/년 토글 칸 위아래 `hitSlop sp.xs`(36 → 44pt). 카테고리 합계 % 칸 고정 폭(`size.percentLabel`)으로 금액 오른쪽 끝 정렬, 이름과 금액 사이 `sp.sm`.
- **설정**: 섹션 제목 좌우 `sp.md`(목록 섹션 헤더와 같은 자리). 행 이름·값 1줄 말줄임 + 값 `marginLeft: sp.sm`. 미리 듣기 칩 눌림을 다른 칩과 같은 `opacity 0.7` 로.
- **모달 4종**: 헤더를 `card` 바탕·선 없음으로 탭 헤더와 맞춤. 취소·저장 터치 38 → 44pt. 목표 모달 안내문 합니다체.
- **입력**: 빠른 입력 칩 최대 폭 `size.chipMaxWidth`(긴 항목명 말줄임).
- **기록 수정·없는 화면**: 삭제 버튼을 다른 지우기 버튼과 같은 `card` + `border` + `danger` 글자로. "찾을 수 없음" 은 빈 상태 모양(`bodyStrong` + `label` primary 44pt 버튼).
- **후속**: `onPrimarySoft` 토큰 추가 → 배너·회고 카드 글자·닫기 아이콘(대비 4.5↑). 홈 큰 숫자 `numberOfLines 1` + `adjustsFontSizeToFit`(최소 0.6배)로 9자리 금액도 한 줄.
