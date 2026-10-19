# App Store 출시 입력 가이드

App Store Connect(appstoreconnect.apple.com → 나의 앱 → SaveLog)에 넣을 값을 화면 순서대로 모았습니다.
코드 블록 안 문구는 그대로 복사해 붙여 넣습니다.

## 1. 앱 정보 (일반 → 앱 정보)

| 항목 | 값 |
|---|---|
| 이름 | `SaveLog` (이미 등록됨) |
| 부제 (30자 이내) | `오늘 참은 소비를 기록하는 절약 앱` |
| 기본 카테고리 | 금융 |
| 보조 카테고리 | 라이프스타일 |
| 콘텐츠 권한 | "제3자 콘텐츠를 포함하거나 보여 주나요?" → 예, "필요한 권리를 모두 갖고 있나요?" → 예 |

콘텐츠 권한에 "예"라고 답하는 이유는 세 가지입니다.
- 동전 효과음 2개는 Pixabay 녹음입니다. Pixabay Content License 로 상업적 사용이 가능합니다(`assets/sounds/CREDITS.md`).
- 숫자 폰트 Outfit 은 SIL Open Font License 입니다.
- 오늘의 한 줄의 명언·속담은 저작권이 끝났거나 짧은 인용입니다.

## 2. 개인정보 (앱 개인정보)

| 항목 | 값 |
|---|---|
| 개인정보 처리방침 URL | `https://github.com/zizonpubao/save_money_app/blob/main/docs/PRIVACY.md` |
| 데이터 수집 | "아니요, 이 앱에서 데이터를 수집하지 않습니다" |

## 3. 가격 및 사용 가능 여부

| 항목 | 값 |
|---|---|
| 가격 | 무료 (0원) |
| 출시 국가 | 대한민국만 |

유럽연합 국가를 고르면 "사업자(trader)" 여부를 신고해야 합니다.
사업자로 신고하면 전화번호와 주소가 스토어에 공개되므로 지금은 대한민국만 고릅니다.

## 4. 버전 정보 (iOS 앱 → 1.0 제출 준비 중)

### 홍보 문구 (170자 이내, 심사 없이 언제든 수정 가능)
```
커피 한 잔을 참았다면 4,500원을 적어 보세요. 아낀 돈이 쌓이는 게 눈에 보이면, 내일도 참고 싶어져요.
```

### 설명 (4000자 이내)
```
가계부는 쓴 돈을 적지만, SaveLog는 안 쓴 돈을 적어요.

커피 한 잔, 배달 한 번, 택시 한 번을 참았을 때 금액을 남겨 보세요. 오늘 참은 소비가 모여 이번 달에 얼마를 아꼈는지 한눈에 보여 줘요.

■ 빠르고 기분 좋은 기록
· 금액 버튼(5백·1천·3천·5천·1만)을 눌러 금액을 더하고 빼요
· 최근에 참은 항목은 한 번 눌러 바로 다시 입력해요
· + 버튼을 길게 누르면 자주 참는 항목을 한 번에 저장해요
· 저장할 때마다 진동과 효과음, 금액에 따라 커지는 축하 연출이 나와요

■ 아낀 돈이 보이는 화면
· 홈에서 이번 달 절약액과 목표 진행률을 확인해요
· 이번 달 잔디와 연속 기록일로 꾸준함을 확인해요
· 기록 탭에서 월별·연별 막대 그래프와 카테고리 비율을 봐요
· 하루·한 달 최고 기록을 넘기면 축하해 드려요

■ 월 목표
· 이번 달에 아낄 목표 금액을 정하고, 달성하면 함께 축하해요

■ 내 기록은 내 아이폰에만
· 회원가입과 로그인이 없어요
· 기록은 아이폰 안에만 저장되고 어디로도 보내지 않아요
· JSON·CSV 백업으로 다른 기기에 옮기거나 엑셀에서 열 수 있어요

■ 내 마음대로
· 라이트·다크 테마
· 카테고리 추가·이름·이모지·순서 변경
· 효과음·진동 켜고 끄기, 동전 소리 고르기
```

### 키워드 (100자 이내, 쉼표로 구분하고 띄어쓰기 없이)
```
절약,저축,짠테크,가계부,무지출,소비기록,돈모으기,저금,챌린지,목표,습관,아끼기,저금통,커피값,배달비
```
"너무 길다"는 오류가 나면 뒤에서부터 하나씩 지웁니다.

### URL

| 항목 | 값 |
|---|---|
| 지원 URL | `https://github.com/zizonpubao/save_money_app/blob/main/docs/SUPPORT.md` |
| 마케팅 URL (선택) | `https://github.com/zizonpubao/save_money_app` |

### 기타

| 항목 | 값 |
|---|---|
| 저작권 | `2026 zizonpubao` |
| 빌드 | TestFlight 에서 확인한 빌드 (1.0.0 (7) 예정) |

## 5. 스크린샷

아이폰 17 Pro 캡처(1206×2622)를 6.9인치 규격 1320×2868 로 키워서 올립니다.
6.9인치 한 벌만 올리면 작은 화면 크기는 App Store 가 자동으로 줄여서 씁니다.

| 순서 | 화면 | 보여 줄 것 |
|---|---|---|
| 1 | 홈 | 이번 달 절약액 큰 숫자, 목표 진행 바, 잔디 |
| 2 | 입력 시트 | 금액 버튼과 카테고리, 떠 있는 저장 버튼 |
| 3 | 저장 연출 | 컨페티가 터지는 순간 |
| 4 | 기록 탭 (월) | 일별 막대와 카테고리 비율 |
| 5 | 설정 | 테마·효과·백업 |

기록이 며칠 쌓인 상태에서 찍어야 화면이 비어 보이지 않습니다.

## 6. 연령 등급

모든 설문 항목에 "없음"이나 "아니요"로 답합니다. 결과는 4+ 입니다.
(폭력·성적 콘텐츠·도박·의료 정보·웹 접근·사용자 간 소통이 모두 없습니다.)

## 7. 앱 심사 정보

| 항목 | 값 |
|---|---|
| 로그인 필요 | 아니요 (로그인 정보 칸은 비워 둠) |
| 연락처 | 이름, 전화번호, 이메일. 애플 심사팀만 보며 공개되지 않음 |

### 메모 (영어로 쓰면 심사가 매끄럽습니다)
```
SaveLog is a personal savings log: users record money they chose NOT to spend (e.g. skipping a coffee). No account or login is required. All data stays on the device in a local SQLite database; nothing is sent to any server, and there are no analytics or ads.

How to test:
1. Tap the green + button on the Home tab, tap an amount chip (e.g. 3천 = 3,000 KRW), choose a category, and tap the green "저장" (Save) button at the bottom right.
2. Home shows the monthly total; the 기록 (Records) tab shows monthly/yearly charts.
3. 설정 (Settings) lets you set a monthly goal, theme, sound/haptics, and export/import a JSON backup.

About NSMicrophoneUsageDescription: the app never records audio and never requests microphone permission. The string exists only because the audio playback module (expo-audio) links recording APIs.
```

## 8. 제출 후

- 심사는 보통 1~2일 걸립니다.
- 통과하면 "출시"를 누르거나, 제출할 때 "승인 후 자동 출시"를 고를 수 있습니다.
- 거절되면 사유가 App Store Connect 의 Resolution Center 에 옵니다. 그대로 보여 주시면 대응합니다.
