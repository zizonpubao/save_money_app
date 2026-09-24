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
| | `grass1~4`(잔디 농도) / `grassFuture`(잔디 미래 칸) | `#BACFF9` `#8CAFF5` `#5D8FF1` `#2F6FED` `#F5F6F8` / `#2E436F` `#3D5C9A` `#4C74C4` `#5B8DEF` `#0F1115` (M4: 라이트처럼 `bg` 와 같은 움푹한 칸, 기록 없는 날 `divider` 와 구분) |
| | `good` / `warn`(M4 컨페티 조각 전용, 글자·넓은 면에 쓰지 않음) | `#30A46C` `#F5A524` / `#4CC38A` `#FFB224` |
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
| | `size.confettiWidth` / `size.confettiHeight` | 6 / 10 (M4 저장 컨페티 한 조각) |

## 컴포넌트 규칙
- **카드**: `card` 배경 + `radius.lg` + `padding: sp.lg`. 그림자 없음, 테두리 없음 — 배경 대비로만 뜬다.
- **보조 구획**: 카드와 같은 `card` 배경 + `radius.lg` 지만 안쪽은 `paddingHorizontal: sp.md` / `paddingVertical: sp.smd` — 주인공 카드(`sp.lg`)보다 한 단계 가볍다. 제목 없이 내용만.
- **목록 행**: `card` 배경, `paddingHorizontal: sp.md` / `paddingVertical: sp.smd`, `minHeight: size.touch`. 행 사이만 hairline `divider`, 섹션 마지막 행은 선 없음. 섹션의 첫/마지막 행에 `radius.md` 를 줘서 한 덩어리로 보이게 한다.
- **섹션 헤더**: `bg` 위에 `paddingTop: sp.md` / `paddingBottom: sp.sm` / 좌우 `sp.md`(아래 행 안쪽 여백과 세로 줄 맞춤), 왼쪽 날짜(`type.label`)·오른쪽 합계(`type.note`) 둘 다 `textMuted`. 카드 밖 요소라 배경색은 `bg`.
- **칩(선택)**: `radius.pill`, `paddingHorizontal: sp.md` / `paddingVertical: sp.sm`, 테두리 1px. 선택 시 `primary` 배경 + `onPrimary` 글자(색만이 아니라 채움으로 구분). 보기 전용 정보 칩은 홈 배치 4번(`StatChip`). (M4) 입력 시트 맨 위 빠른 입력 칩도 이 모양(선택 상태 없이 누르면 채움, 눌림 `opacity 0.7`).
- **버튼/FAB**: 텍스트 버튼은 테두리 1px + `radius.md` + `minHeight: size.touch`, 눌림은 `opacity 0.7`. FAB 은 `size.fab` 원형, `primary`, `shadow.fab`, 우하단 `sp.lg` 여백, 눌림 `opacity 0.85`.
- **헤더·탭바**: 배경 `card`, 그림자 숨김(`headerShadowVisible: false`), 활성 탭 `primary` / 비활성 `textMuted`, 본문 영역은 `bg`.
- **입력 필드**: `card` 배경 + `border` 테두리 + `radius.md`, 라벨은 위에 `type.caption` `textMuted`, 필드 간 간격 `sp.md`. 금액 필드만 `type.title` 로 크게, 오른쪽에 "원".
- **빈 상태**: 가운데 정렬, `type.bodyStrong` 한 줄 + `type.note` 한 줄. 일러스트·느낌표 없음, 문구는 다음 행동을 알려준다("오늘 참은 소비를 + 버튼으로 남겨보세요").

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
2. **오버슈트** — 목표값을 넘겼다 돌아온다. 카드 1.08 · 큰 숫자 1.15(big 1.2) · 칩 1.3 → 1. 카드는 358pt 라 1.08(387pt)이 화면 폭 390 안에 드는 한계, 크게 튀는 역할은 숫자·라벨이 맡는다.
3. **시간차** — 한꺼번에 움직이지 않는다. 타격 기준 +0 숫자·글로우 / +40 플로팅 라벨 / +120 이모지 칩 / +160 🔥 칩 / +200 목표 바 (`motion.stagger` 40ms 단위).
4. **값에 비례** — 금액 구간(base < 1만 ≤ mid < 5만 ≤ big)과 사건(목표·이정표·최고)이 커질수록 층을 **더한다**. 아래 등급은 위 등급의 부분집합.
5. **질리지 않게** — 매번 시드(저장 시각)로 모양을 바꾸고, 전체는 짧게(타격 후 ~900ms 안에 정지).

**기준 시각 t0와 레이어**
- 저장 탭 순간(시트가 아직 위): `Haptics.selectionAsync()` 한 번 — "눌렸다" 확인이자 기대감. 소리 없음.
- **t0 = 시트가 다 내려간 순간.** pageSheet 가 닫히는 ~300ms 동안 카드가 가려져 있어 그 전에 친 타격은 안 보인다. `EntryFormModal` 의 `onDismiss`(iOS)가 이미 `onClose` 에 붙어 있으니 "저장으로 닫힘" 플래그로 구분해 t0 를 쏘고, 400ms 안전 타이머로 폴백한다. 아래 표의 시간은 모두 t0 기준.
- 파티클·플래시·라벨·글로우는 홈 루트의 `CelebrationLayer`(absolute fill, `pointerEvents="none"`, FAB 위) 에 그린다. 저장 직전 카드의 사각형 `{x, y, w, h}` 를 잰다(`measureCardCenter` 를 확장) — 컨페티·라벨 원점은 그 가운데, `GlowRing` 은 그 사각형 그대로. 목록 행의 `overflow: 'hidden'` 영향을 받지 않게 카드 안에 넣지 않는다.
- 연출이 아닌 것: 수정 저장(`update`), 첫 오픈 카운트업(0 → 월 합계). 소리·라벨 없음, 수정 저장은 selection 햅틱 하나만.

**기본 연출 — 모든 새 저장 (base, 1만원 미만)**
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
| ~900 | 전부 정지 | 카운트업 끝 680 · 라벨 끝 820 · 글로우 끝 680 (big·목표도 880 안) | |

스프링 시작값: `springHit {damping 12, stiffness 320, mass 0.8}` · `springSettle {damping 18, stiffness 200}`.

**mid (1만원↑) — base 에 더하거나 바꾸는 것**
| 시간 | 요소 | 값 |
| --- | --- | --- |
| 80 | 햅틱 | Medium(80) → Heavy(160) 2단 |
| 80 | 소리 | `tap` 대신 `tada.wav` |
| 80 | `Confetti` | **32개**, 카드 가운데에서 방사, 800ms (기존 궤적 규칙). 한 번만 터지니 big 한 번(24)보다 넉넉히 |
| 80 / 160 | `GlowRing` 2겹 | 1겹째 그대로 + 2겹째 80ms 뒤, 테두리 2pt, inset → −16 (좌우 여백 16 안) |
| 120 | `FloatingLabel` | `title`(28/700) — 1.5배 급 |

**big (5만원↑) — mid 에 더하거나 바꾸는 것**
| 시간 | 요소 | 값 |
| --- | --- | --- |
| 80 / 180 | `Confetti` | 24 + 24 = **총 48개**, 두 번 터짐(두 번째는 700ms 로 짧게 + 각도 범위를 좌우로 20° 더 벌림 → 880 에 끝) |
| 80 | `ScreenFlash` | 화면 전체 `primary` opacity 0 → 0.10(다크 0.14) 40ms → 0 80ms, 합 120ms. `primarySoft` 는 라이트·다크 모두 배경과 대비가 없어 안 보여 `primary` 를 쓴다 — "primary 넓은 면적 금지"의 유일한 예외 |
| 80 | 큰 숫자 | 1 → **1.2** → 1 |
| 80 / 170 / 300 | 햅틱 | Heavy 3연타 (0/90/220 리듬 — 마지막 박을 늦춰 "쿵쿵—쿵") |
| 80 | 소리 | `hit.wav` |
| 120 | `FloatingLabel` | `display`(36/800), "+55,000원 🔥" |

**사건별 (금액 구간 위에 얹는다)**
- 사건은 연출 등급의 **바닥**을 올린다: 목표 달성 → big + 아래 목표 층 / 이정표 → 최소 big / 최고 기록 → 최소 mid / 🔥 증가 → 등급 그대로.
- **목표 달성**: t0+280 바가 100% 까지 `withSpring {damping 11, stiffness 220}` · 카드 틴트 `primarySoft` 0 → 1 → 0, t0+80(타격과 함께) 시작 → 880 끝 · 컨페티 색 비율 `good` 50% / `primary` 25% / `warn` 25% · 소리 `fanfare.wav`(hit 대신) · 햅틱 big 3연타 + t0+480 Success 1회(피날레) · 배너 "이번 달 목표 달성 🎉" 가 t0+300 에 **위에서 튕겨 내려옴** translateY −20 → 0 `withSpring {damping 11, stiffness 260}` + opacity 0 → 1 120ms.
- **최고 기록 · 이정표 배너**: t0+300 에 scale 0.8 → 1 `withSpring {damping 10, stiffness 300}`(1.04 쯤 넘쳤다 돌아옴) + opacity 0 → 1 100ms. 이정표는 소리 `ding`, 최고 기록은 등급 소리 그대로.
- **🔥 칩**: t0+240 에 scale 1 → 1.3 → 1(`springHit` → `springSettle`) + rotate 0 → −6° → +6° → −3° → 0, 각 60ms(합 240ms) `Easing.inOut(quad)` — 불꽃이 흔들리듯.
- 배너는 정보라 기존대로 1.5초 머물지만 **등장 모션은 400ms 안**. 배너·소리·축하 햅틱 **패턴**은 한 저장에 하나씩만(저장 탭 selection 은 확인이라 별개): 우선순위 목표 > 이정표 > 최고 기록 > 금액 구간.

**효과음 규격 (빌더 작업)**
- `npx expo install expo-audio` (Expo SDK 모듈, 재생만이라 config plugin 불필요) → `npx expo-doctor`. 소리는 **생성**한다(CC0 다운로드 대신): `scripts/gen-sounds.mjs`, Node 기본 모듈만, `assets/sounds/*.wav` 로 출력하고 결과 파일을 커밋.
- 형식: WAV PCM16 mono **22.05 kHz**, 각 40KB 이하, 피크 −1 dBFS 정규화, 앞뒤 5ms 페이드(클릭 잡음 방지). 사인파 하나가 아니라 합성(배음·피치 변화·노이즈·화음)으로 풍성하게. 노이즈 시드 고정(재생성해도 같은 파일).

| 파일 | 소리 | 길이 |
| --- | --- | --- |
| `tap.wav` | "팝": 700 → 320 Hz 지수 하강 + 3ms 노이즈 버스트 | 90ms · 4.0KB |
| `ding.wav` | 종소리: 1320 Hz + 배음 2.4×·3.9×(작게), 배음별 감쇠 | 320ms · 14.2KB |
| `tada.wav` | 상행 C5·E5·G5 삼각파 각 90ms + 끝에 4~6kHz 반짝임 | 380ms · 16.8KB |
| `hit.wav` | "쾅": 0~70ms 사인 110 → 60 Hz 하강(+2·3배 배음) + 8ms 노이즈 → 40ms 부터 C5·E5·G5·C6 화음(삼각파 + 사각파 20%, 120ms 안 감쇠) → 180ms 부터 4.7·5.6·6.6kHz 반짝임 종 3개 40ms 간격 | 420ms · 18.6KB |
| `fanfare.wav` | 상행 C5·E5·G5·C6 + 끝 C·E·G 화음 200ms, 사각파 20% | 450ms · 19.9KB |

- 등급별 배정: base `tap` · mid `tada` · big `hit` · 목표 `fanfare` · 이정표 배너 `ding`.
- 재생: `useCelebrationSound` 훅이 홈 마운트 때 5개를 `useAudioPlayer` 로 미리 로드, 소스는 `downloadFirst: true` 로 기기에 먼저 내려받아 재생(Expo Go 에서는 에셋 주소가 개발 서버 URL 이라 스트리밍이 조용히 실패할 수 있음). 트리거 시 재생 중이면 `pause()` → `seekTo(0)` 완료 후 `play()`. 볼륨 1. `setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false })` — 무음 스위치를 따르고 사용자 음악을 끊지 않는다(옵션 이름은 설치된 SDK 문서로 확인).
- 설정 탭에 "효과" 구획: `효과음` · `햅틱` 스위치 2줄(`SettingsRow`), 기본 켬. 효과음 아래 미리 듣기 칩 5개(등급 순 톡/짠/쾅/팡파르/띵, 스위치 꺼지면 비활성)와 "무음 스위치가 켜져 있으면 나지 않습니다" 안내, 햅틱 아래 "진동 느껴 보기". settings 키 `sound_enabled` / `haptics_enabled` = `'1'|'0'`(스키마 변경 없음). 햅틱 스위치는 `src/utils/haptics.ts` 한 곳에서 검사해 앱 전체 햅틱을 끈다.

**동작 줄이기 (`useReduceMotion()` 이 참)**
- 생략: 컨페티 · 플래시 · 플로팅 라벨 · 글로우 · 카드 움츠림/타격 · 숫자 오버슈트 · 칩 튐/흔들림 · 배너 이동(opacity 150ms 로만 등장).
- 유지: 햅틱 · 소리 · 카운트업 · 목표 바(spring 대신 `withTiming` 300ms).

**질리지 않게**
- 시드 = 저장 시각: 컨페티 각도·속도·회전·색 순서, 카드 타격 최고값 1.06~1.08 사이(1.08 상한).
- 플로팅 라벨은 **금액이 항상 주인공**, 꼬리말만 시드로 돌린다: "+4,500원" / "+4,500원 적립" / "+4,500원 아꼈다". big 은 꼬리말 대신 🔥.
- 연속 저장: 새 t0 가 오면 `runId` 를 올리고 모든 shared value 에 `cancelAnimation` → 쉬는 값(scale 1 · opacity 0)으로 되돌린 뒤 새로 시작. 예전 `setTimeout`(햅틱 박자) 은 모두 `clearTimeout`, 컨페티·라벨은 `key={runId}` 로 다시 마운트, 이전 runId 의 완료 콜백은 무시.

**토큰 (빌더가 `theme.ts` 에 추가)**: `motion.shrink 0.97` · `motion.cardHit 1.08` · `motion.numberHit 1.15` / `numberHitBig 1.2` · `motion.chipHit 1.3` · `motion.stagger 40` · `motion.floatRise 40` · `motion.glowSpread 12` / `16` · `motion.flashOpacity 0.10` / 다크 `0.14` · `motion.springHit` · `motion.springSettle` · `size.glowBorder 4` / `2`.

**하지 말 것 (연출)**
- t0 이후 1초를 넘는 움직임(배너가 머무는 시간 제외), 화면을 가리는 불투명 오버레이, 탭을 막는 레이어(`pointerEvents` 가 `none` 이 아닌 것), 연출 중 입력·스크롤 잠그기.
- 큰 기본 볼륨, 한 저장에 소리 둘 이상, Success 알림 햅틱과 impact 를 같은 박자에 겹치기.
- 컨페티 50개 초과(View 파티클 성능), 카드 scale 1.08 초과(화면 밖으로 삐져나감).

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
