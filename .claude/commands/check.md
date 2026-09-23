---
description: 타입·린트·테스트·Expo 호환성 한 번에 검사. 커밋 전 필수
allowed-tools: Bash, Read, Edit, Glob, Grep
---

아래 명령을 순서대로 실행하고 결과를 표로 보고한다. 실패한 게 있으면 **고친 뒤 다시 실행**해서 전부 통과할 때까지 반복한다 (최대 3회, 그래도 안 되면 원인과 함께 보고).

```bash
npx tsc --noEmit
npx expo lint
npx jest --silent
npx expo-doctor
```

추가로 직접 확인:
1. `git diff --name-only` 로 변경된 파일 중 `app/` 또는 `src/components/` 에 `db.runSync`, `execSync`, `SELECT`, `INSERT` 같은 SQL 흔적이 있는지 Grep → 있으면 🟠 위반
2. `package.json` 의 dependencies 중 Expo Go 미지원이 의심되는 패키지가 새로 추가됐는지 확인 (직전 커밋과 비교)

## 보고 형식
| 검사 | 결과 | 비고 |
|---|---|---|
| tsc | ✅/❌ | 에러 수 |
| lint | ✅/❌ | |
| jest | ✅/❌ | N passed / M failed |
| expo-doctor | ✅/❌ | 경고 내용 |
| SQL 위치 | ✅/❌ | |
| 의존성 | ✅/❌ | |

전부 ✅면 "커밋 가능" 이라고 명시한다.
