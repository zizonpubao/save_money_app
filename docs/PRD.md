# SaveLog PRD (제품 요구사항)

## 한 줄 정의
"오늘 참은 소비"를 항목·금액으로 기록하고, 날짜별/월별로 얼마를 아꼈는지 보여주는 개인용 iOS 앱.

## 사용자
개발자 본인 1명. 앱스토어 출시 없음. Expo Go로 실행.

## 핵심 개념
- **기록(Entry)**: 하루에 여러 개 가능. `항목명`, `금액`, `날짜`, `카테고리(선택)`, `메모(선택)`
- **카테고리**: 기본 제공 + 사용자 추가. 기본값: 커피, 배달, 택시, 쇼핑, 술, 간식, 구독, 기타
- **절약액**: 기록된 금액의 합. 실제 지출을 추적하지 않는다 (가계부가 아님).

## 데이터 모델 (SQLite)
```sql
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,            -- 'YYYY-MM-DD' (로컬 날짜)
  title TEXT NOT NULL,           -- 항목명
  amount INTEGER NOT NULL,       -- 원 단위 정수, 0 초과
  category_id INTEGER,           -- NULL 허용
  memo TEXT,
  created_at TEXT NOT NULL,      -- ISO8601
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX idx_entries_date ON entries(date);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE schema_version (version INTEGER NOT NULL);
```

## 화면

### 1. 기록 탭 (홈, `app/(tabs)/index.tsx`)
- 상단: 오늘 날짜, **오늘 절약액** 크게 표시, 이번 달 누적 작게
- 중앙: 최근 기록 목록. **날짜별 그룹**(섹션 헤더 = 날짜 + 그날 합계), 최신순
- 목록 범위: 기본은 **이번 달**, 맨 아래 "이전 달 더 보기"로 한 달씩 추가 로드. 상단 토글로 **월 / 년** 단위 전환 (년 단위는 해당 연도 전체를 월별 섹션으로)
- 각 행: 카테고리 이모지 · 항목명 · 금액. 탭하면 수정 화면, 왼쪽 스와이프로 삭제(확인 알림)
- 하단 우측: `+` 플로팅 버튼 → 입력 시트

### 2. 입력 시트 (바텀시트 or 모달)
- 필드 순서: **금액**(숫자 키패드, 자동 콤마) → 항목명 → 카테고리(가로 스크롤 칩) → 날짜(기본 오늘, 탭하면 변경) → 메모
- 카테고리 칩을 고르면 항목명이 비어있을 때 카테고리명으로 자동 채움
- **빠른 입력**: 최근 사용한 항목 3~5개를 칩으로 노출, 탭하면 항목명+카테고리+마지막 금액 자동 채움
- 저장 시 **축하 이펙트** (M2부터): 햅틱(`expo-haptics` success) + 오늘 절약액이 이전 값에서 새 값으로 **카운트업** + 절약액 카드 **펄스/스케일 애니메이션** + 시트 닫힘. 짧고(1초 내) 타격감 있게, 사용자가 "아꼈다"는 느낌을 받도록. `reanimated`로 구현, 외부 라이브러리 없음
- 금액 0 또는 빈 항목명이면 저장 버튼 비활성

### 3. 월별 탭 (`app/(tabs)/monthly.tsx`)
- 상단: `< 2026년 9월 >` 월 이동
- **월 총 절약액**, 기록 건수, 하루 평균
- **일별 막대 그래프**: 1일~말일, 높이 = 그날 합계 (View로 직접 그림)
- **카테고리별 합계**: 많은 순, 비율 바 + 금액
- 하단: 해당 월 기록 전체 목록 (날짜 그룹)

### 4. 설정 탭 (`app/(tabs)/settings.tsx`)
- 카테고리 관리: 추가/이름·이모지 수정/순서 변경/삭제(기본 카테고리는 삭제 불가, 사용 중이면 경고)
- **백업**: 전체 데이터를 JSON 파일로 내보내기 → `expo-sharing` 으로 공유 시트(파일 앱, 카톡 등)
- **복원**: `expo-document-picker` 로 JSON 선택 → 병합 or 덮어쓰기 선택
- CSV 내보내기 (엑셀에서 열기용, UTF-8 BOM 포함)
- 앱 정보, 데이터 전체 삭제(2단계 확인)

### 5. 기록 수정 (`app/entry/[id].tsx`)
- 입력 시트와 같은 폼, 삭제 버튼 추가

## 비기능 요구사항
- 앱 켜면 1초 안에 홈 표시. 목록은 `FlatList`/`SectionList`, 페이지네이션(월 단위 로드)
- 오프라인 100%. 네트워크 요청 없음
- 다크모드 대응 (시스템 설정 따름)
- iPhone 세로 모드만

## 백업 JSON 형식
```json
{
  "app": "savelog",
  "version": 1,
  "exportedAt": "2026-09-23T13:58:00+09:00",
  "categories": [{ "id": 1, "name": "커피", "emoji": "☕", "sortOrder": 0, "isDefault": true }],
  "entries": [{ "id": 1, "date": "2026-09-23", "title": "아메리카노", "amount": 4500, "categoryId": 1, "memo": null, "createdAt": "...", "updatedAt": "..." }]
}
```

## 개발 단계 (이 순서로 진행)
1. **M1 뼈대**: 프로젝트 생성, 탭 3개, 테마, SQLite 초기화+마이그레이션, 기본 카테고리 시드
2. **M2 기록**: 입력 시트(모달), 저장 + 축하 이펙트, 홈 날짜별 목록(월/년 전환), 수정/삭제
3. **M3 월별**: 월 이동, 합계, 일별 막대, 카테고리별 합계
4. **M4 편의**: 빠른 입력 칩, 다크모드 마무리, 입력 시트를 바텀시트로 교체할지 재결정
5. **M5 백업**: JSON 내보내기/복원, CSV, 카테고리 관리
각 단계 끝날 때 `/check` 통과 + 아이폰 Expo Go에서 실제 확인.

## 나중에 (지금 안 함)
- 위젯, 알림, 목표 설정, 클라우드 동기화, 앱스토어 출시
