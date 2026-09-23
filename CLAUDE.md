# SaveLog — 절약 기록 앱 (iOS, Expo)

## 이 프로젝트가 뭔가
"오늘 안 쓴 돈"을 기록하는 개인용 iOS 앱. 사용자가 항목(예: 커피)과 금액(예: 4,500원)을 입력하면 날짜별로 저장되고, 월별로 얼마를 아꼈는지 확인한다.
상세 요구사항은 `docs/PRD.md` 를 항상 먼저 읽는다.

## 절대 규칙 (어기면 앱이 아이폰에서 안 돈다)
1. **Expo Go 호환만 사용한다.** 개발자는 Windows PC만 있고 Mac/Xcode가 없다. 테스트는 아이폰의 Expo Go 앱으로만 한다. 따라서:
   - 커스텀 네이티브 모듈, `expo prebuild`, `npx expo run:ios`, config plugin이 필요한 라이브러리 **금지**
   - Expo SDK에 포함된 모듈(`expo-sqlite`, `expo-sharing`, `expo-file-system`, `expo-haptics` 등)과 순수 JS 라이브러리만 사용
   - 라이브러리 추가 전에 반드시 "Expo Go에서 동작하는지" 확인하고, 설치는 `npx expo install <pkg>` 로만 한다 (버전 호환 자동 맞춤)
2. **데이터는 기기 로컬(SQLite)에만 저장한다.** 서버, 로그인, 클라우드 동기화 없음. 대신 JSON 백업/복원 기능은 필수.
3. **TypeScript strict 모드.** `any` 금지. 타입 에러가 있으면 작업 완료로 치지 않는다.
4. **한국어 UI.** 통화는 원(₩), 천 단위 콤마, 소수점 없음. 날짜는 `2026년 9월 23일 (수)` 형식.

## 기술 스택 (고정)
- Expo (최신 SDK) + TypeScript + Expo Router (파일 기반 라우팅)
- 저장: `expo-sqlite` (동기 API `openDatabaseSync`), 스키마 마이그레이션은 `src/db/migrations.ts` 에서 버전 관리
- 상태: Zustand (전역), 화면 로컬 상태는 useState
- 날짜: `dayjs` (locale ko)
- 스타일: `StyleSheet` + 테마 토큰(`src/theme.ts`). NativeWind/스타일드컴포넌트 사용 안 함
- 차트: 외부 차트 라이브러리 쓰지 않고 `View` 로 막대 그래프 직접 그림 (Expo Go 호환 리스크 제거)
- 테스트: `jest-expo` + `@testing-library/react-native`

## 폴더 구조
```
app/                  # Expo Router 화면 (라우팅만, 로직 없음)
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx         # 오늘/기록 탭
    monthly.tsx       # 월별 탭
    settings.tsx      # 설정(백업/복원/카테고리)
  entry/[id].tsx      # 기록 수정
src/
  db/                 # SQLite 연결, 마이그레이션, 쿼리 함수 (여기만 SQL 있음)
  store/              # Zustand 스토어
  components/         # 재사용 UI
  features/           # 화면별 로직 훅 (useMonthlySummary 등)
  utils/              # 금액 포맷, 날짜 유틸
  theme.ts
docs/PRD.md
```
원칙: **SQL은 `src/db/` 밖으로 나가지 않는다.** 화면은 `src/db/queries.ts` 의 함수만 호출한다.

## 작업 방식
- 기능 하나를 만들 때 순서: PRD 확인 → 필요한 DB 쿼리 작성 → 훅/스토어 → 화면 → `npx tsc --noEmit` 통과 → 테스트 작성 → 완료 보고
- 큰 기능은 `/feature` 커맨드로 시작한다 (`.claude/commands/feature.md`)
- 작업 끝나면 반드시 `/check` 를 돌려 타입·린트·테스트를 확인한다
- 커밋 메시지는 한국어, 형식: `feat: 월별 요약 화면 추가` / `fix:` / `chore:`
- 사용자에게 확인이 필요한 결정(디자인 방향, 스키마 변경)은 물어본다. 사소한 건 알아서 정하고 보고만 한다.

## 검증 명령
```bash
npx tsc --noEmit          # 타입 검사
npx expo lint             # 린트
npx jest                  # 테스트
npx expo start --tunnel   # 아이폰 Expo Go로 실행 (Windows에서 같은 Wi-Fi 아니어도 됨)
```
`npx expo-doctor` 로 의존성 호환 문제를 주기적으로 점검한다.

## 하지 말 것
- `package.json` 에 `npm install` 로 직접 버전 지정해서 넣기 (`npx expo install` 만)
- 화면 파일 안에 SQL 작성
- 사용자 데이터 삭제하는 마이그레이션 (컬럼 추가만, 삭제 시 반드시 백업 유도)
- 다크모드 대응한다고 색상 하드코딩 흩뿌리기 → `theme.ts` 토큰만 사용
