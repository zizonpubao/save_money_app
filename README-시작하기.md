# SaveLog — 클로드 코드로 시작하기

## 0. 이 폴더에 들어있는 것
```
savelog/
├── CLAUDE.md                    # 클로드 코드가 매번 읽는 프로젝트 규칙
├── docs/PRD.md                  # 앱 요구사항 (화면, 데이터, 단계)
├── .claude/
│   ├── settings.json            # 권한 설정 (매번 허용 안 눌러도 되게)
│   ├── agents/
│   │   ├── expo-builder.md      # 구현 담당
│   │   ├── code-reviewer.md     # 리뷰 담당 (읽기 전용)
│   │   └── expo-doctor.md       # 에러 해결 담당
│   └── commands/
│       ├── init-project.md      # /init-project  — M1 뼈대 생성
│       ├── feature.md           # /feature <기능> — 구현→리뷰→수정 사이클
│       ├── check.md             # /check — 타입·린트·테스트 검사
│       └── run-ios.md           # /run-ios — 아이폰 실행 안내
└── README-시작하기.md           # 이 파일
```

## 1. 사전 준비 (한 번만)
- Windows에 **Node.js LTS** 설치 (https://nodejs.org)
- 클로드 코드 설치: `npm install -g @anthropic-ai/claude-code`
- 아이폰에 App Store에서 **Expo Go** 설치
- 이 `savelog` 폴더를 원하는 위치에 둠 (예: `C:\dev\savelog`)

## 2. 첫 실행
```powershell
cd C:\dev\savelog
claude
```
클로드 코드가 뜨면:
```
/init-project
```
→ Expo 프로젝트 생성, 탭 3개, DB 초기화까지 자동. 끝나면 `npx expo start --tunnel` 로 아이폰에서 탭 3개 뜨는지 확인.

## 3. 기능 하나씩 붙이기 (PRD 순서대로)
```
/feature M2 기록 입력·목록·수정·삭제
/feature M3 월별 화면
/feature M4 빠른 입력 칩·햅틱·다크모드
/feature M5 백업·복원·CSV·카테고리 관리
```
각 `/feature` 가 끝나면 "아이폰에서 확인할 것" 체크리스트를 주니까 Expo Go에서 직접 눌러보고, 이상하면 그대로 말해주면 됨.

## 4. 자주 쓸 명령
| 상황 | 입력 |
|---|---|
| 커밋 전 검사 | `/check` |
| 아이폰에서 안 뜸 | `/run-ios` 또는 에러 메시지 붙여넣고 "expo-doctor 에이전트로 봐줘" |
| 코드만 리뷰 받고 싶음 | "code-reviewer 에이전트로 지금 변경사항 리뷰해줘" |
| PRD에 없는 걸 추가하고 싶음 | 먼저 `docs/PRD.md` 에 적어달라고 한 뒤 `/feature` |

## 5. 알아둘 것
- **Mac이 없어서 Expo Go로만 돌립니다.** 그래서 CLAUDE.md에 "Expo Go 미지원 라이브러리 금지"가 못 박혀 있어요. 클로드가 어떤 라이브러리를 쓰자고 하면 "Expo Go에서 되는 거 맞아?"라고 한 번 더 물어봐도 됩니다.
- Expo Go는 개발용이라 **앱 아이콘으로 홈 화면에 남지 않고**, 매번 PC에서 `npx expo start --tunnel` 을 켜야 열립니다. 나중에 "PC 없이도 열고 싶다"가 되면 EAS 클라우드 빌드(애플 개발자 계정 필요, 연 $99)로 넘어가면 되는데, 그건 지금 PRD 범위 밖이에요.
- 데이터는 아이폰 안 SQLite에만 있어요. 폰 바꾸거나 Expo Go 지우면 날아가니 M5 백업 기능 만들면 가끔 JSON 내보내기 해두세요.
