---
description: 아이폰 Expo Go로 실행하는 방법 안내 + 안 될 때 진단
allowed-tools: Bash, Read
---

사용자가 아이폰에서 앱을 띄우려 한다. 환경: Windows PC, Mac 없음, Expo Go 사용.

## 실행 안내
다음을 사용자에게 순서대로 안내한다:

1. 아이폰에 App Store에서 **Expo Go** 설치 (한 번만)
2. Windows 터미널(프로젝트 폴더)에서:
   ```bash
   npx expo start --tunnel
   ```
   `--tunnel` 은 PC와 아이폰이 같은 Wi-Fi가 아니어도 되게 해준다. 처음엔 `@expo/ngrok` 설치 여부를 묻는데 `y`.
3. 터미널에 QR 코드가 뜨면 **아이폰 기본 카메라 앱**으로 스캔 → "Expo Go에서 열기" 탭
4. 첫 로딩은 30초~1분 걸릴 수 있음. 이후엔 코드 저장하면 자동 새로고침

## 안 될 때
사용자가 증상을 말하면 `expo-doctor` 에이전트를 호출한다. 흔한 것:
- QR 스캔해도 반응 없음 → 카메라 앱으로 스캔했는지, Expo Go 설치됐는지
- "Something went wrong" / 무한 로딩 → `--tunnel` 썼는지, Windows 방화벽에서 Node 허용했는지, `npx expo start -c` 로 캐시 지우고 재시도
- 빨간 에러 화면 → 에러 메시지 전문을 받아 `expo-doctor` 에게 넘김
- Expo Go 버전과 SDK 불일치 → Expo Go 앱 업데이트 또는 `npx expo install --fix`
