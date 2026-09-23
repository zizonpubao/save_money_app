---
description: M1 뼈대 — Expo 프로젝트 생성부터 탭·테마·SQLite 초기화까지 한 번에 세팅
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

`CLAUDE.md` 와 `docs/PRD.md` 를 읽고 **M1 뼈대** 단계를 수행한다. 현재 폴더에 `CLAUDE.md`, `docs/`, `.claude/` 만 있고 Expo 프로젝트는 아직 없는 상태다.

## 1. 프로젝트 생성
현재 폴더 안에 Expo 프로젝트를 만든다 (하위 폴더 만들지 말 것):
```bash
npx create-expo-app@latest . --template tabs
```
`.` 에 만들 때 기존 파일(CLAUDE.md 등) 충돌이 나면, 임시 폴더에 만든 뒤 내용물을 현재 폴더로 옮긴다. `CLAUDE.md`, `docs/`, `.claude/` 는 절대 덮어쓰거나 지우지 않는다.

템플릿의 예시 화면/컴포넌트(explore 탭, HelloWave, ParallaxScrollView 등)는 삭제한다.

## 2. 의존성 설치 (전부 `npx expo install`)
```bash
npx expo install expo-sqlite expo-haptics expo-sharing expo-file-system expo-document-picker
npx expo install react-native-gesture-handler react-native-reanimated
npm install zustand dayjs
npx expo install jest-expo @testing-library/react-native -- --save-dev
```
설치 후 `npx expo-doctor` 실행해서 경고 0개 확인.

## 3. 구조 만들기 (CLAUDE.md 폴더 구조대로)
- `app/(tabs)/_layout.tsx`: 탭 3개 — 기록(index), 월별(monthly), 설정(settings). 아이콘은 `@expo/vector-icons` Ionicons
- `app/_layout.tsx`: `GestureHandlerRootView` 로 감싸고, 앱 시작 시 `initDatabase()` 호출. DB 준비 전엔 스플래시 유지
- `src/theme.ts`: 라이트/다크 색상 토큰(`bg, card, text, textMuted, primary, danger, border`), 간격(`sp.xs~xl`), 폰트 크기. `useTheme()` 훅으로 `useColorScheme()` 따라 반환
- `src/db/database.ts`: `openDatabaseSync('savelog.db')` 싱글턴, `initDatabase()`
- `src/db/migrations.ts`: `schema_version` 테이블로 버전 관리. v1 = PRD의 스키마 전체 + 기본 카테고리 8개 시드 (커피☕ 배달🛵 택시🚕 쇼핑🛍️ 술🍺 간식🍪 구독📱 기타📦)
- `src/db/queries.ts`: 일단 `getAllCategories()` 만
- `src/utils/money.ts`: `formatWon(4500) → '4,500원'`, `parseWon('4,500') → 4500`
- `src/utils/date.ts`: `today() → 'YYYY-MM-DD'` (로컬), `formatKoDate('2026-09-23') → '2026년 9월 23일 (수)'`, `monthRange('2026-09') → {start, end}`. dayjs locale ko 설정
- 각 탭 화면은 제목만 있는 placeholder
- `tsconfig.json` strict: true, 경로 별칭 `@/*` → `./*`

## 4. 테스트 세팅
- `package.json` 에 `"jest": { "preset": "jest-expo" }` 와 `"test": "jest"` 스크립트
- `src/utils/__tests__/money.test.ts`, `date.test.ts` 작성 (각 3개 이상 케이스)

## 5. 검증
```bash
npx tsc --noEmit
npx jest
npx expo-doctor
```
셋 다 통과해야 완료.

## 6. 완료 보고
- 만든 파일 목록
- 사용자가 아이폰에서 확인하는 방법: `npx expo start --tunnel` → QR을 아이폰 카메라로 스캔 → Expo Go에서 열림 → 탭 3개 보이면 성공
- git 초기화 + 첫 커밋 (`chore: 프로젝트 뼈대 생성`)
