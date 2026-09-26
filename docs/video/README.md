# 스크린샷 · GIF 넣는 곳

아이폰에서 찍은 화면을 이 폴더에 넣으면 `readme-keeper` 에이전트가 README 의 "📱 화면" 섹션에 자동으로 배치합니다.

## 찍는 법
- 스크린샷: 아이폰 옆 버튼 + 음량 올리기 동시에
- GIF: 제어 센터의 화면 기록으로 .mov 로 찍은 뒤, PC 에서 `ffmpeg -i in.mov -vf "fps=15,scale=360:-1" out.gif` 로 변환 (ffmpeg 없으면 파일만 넣어도 됨, 변환은 메인 세션이 함)
- 라이트 모드 기준. 다크모드는 `-dark` 를 붙여서 (예: `home-dark.png`)

## 파일 이름 (이 이름을 쓰면 알아서 설명이 붙습니다)
| 파일 | 화면 |
|---|---|
| `home.png` | 홈 (이번 달 카드 + 목록) |
| `entry-modal.png` | 입력 모달 |
| `records-month.png` | 기록 탭 월 모드 (막대 + 카테고리) |
| `records-year.png` | 기록 탭 년 모드 |
| `settings.png` | 설정 탭 |
| `save-effect.gif` | 저장 이펙트 (햅틱 · 카운트업 · 펄스) |
| `goal-reached.gif` | 월 목표 달성 순간 |
| `swipe-delete.gif` | 스와이프 삭제 |
