# App Store 소개 이미지

스토어 "앱 미리보기 및 스크린샷" 칸에 올리는 꾸민 이미지입니다. 1.0.1 부터 씁니다.

| 파일 | 내용 |
|---|---|
| `store-1.png` ~ `store-5.png` | 올리는 파일. 1206×2622, RGB(알파 없음) |
| `sheet.png` | 다섯 장을 나란히 붙인 미리보기 |
| `template.html` | 이미지를 그리는 템플릿. 문구와 배치가 들어 있음 |
| `shots/` | 템플릿에 넣는 앱 화면 캡처 (라이트 모드, 예시 기록) |

## 순서와 문구

| 순서 | 화면 | 큰 문구 |
|---|---|---|
| 1 | 홈 | 안 쓴 돈을 기록하면 쌓여요 |
| 2 | 입력 시트 | 버튼 몇 번이면 기록 끝 |
| 3 | 기록 탭 (월) | 한 달 얼마 아꼈는지 한눈에 |
| 4 | 자랑하기 | 아낀 만큼 자랑해요 |
| 5 | 설정 | 알림도 소리도 내 마음대로 |

## 다시 만드는 법

1. 화면 캡처를 `shots/` 에 같은 이름으로 넣습니다. 아이폰 17 Pro 원본 크기(1206×2622)입니다.
2. 문구를 바꾸려면 `template.html` 의 `SLIDES` 를 고칩니다.
3. PowerShell 에서 헤드리스 Edge 로 한 장씩 찍습니다. `N` 은 1~5 입니다.

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 --virtual-time-budget=6000 --window-size=1206,2622 --screenshot=raw-N.png "file:///<이 폴더 경로>/template.html?n=N"
```

4. ffmpeg 로 알파 채널을 뺍니다. App Store 는 투명 채널이 있는 스크린샷을 받지 않습니다.

```powershell
ffmpeg -y -i raw-N.png -pix_fmt rgb24 store-N.png
```

## 화면 캡처 규칙

- Expo Go 에서 예시 기록을 복원한 뒤 찍습니다. Expo Go 는 저장 공간이 따로라 실제 기록과 섞이지 않습니다.
- Expo Go 의 떠 있는 톱니바퀴(Tools button)는 개발자 메뉴에서 끄고 찍습니다.
- 글꼴은 Pretendard(SIL OFL)를 CDN 에서 불러옵니다. 돼지 저금통은 앱 아이콘 전경(`assets/images/android-icon-foreground.png`)입니다.
