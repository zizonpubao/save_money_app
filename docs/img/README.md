# 스크린샷 · GIF

`docs/video/save_money_app_video.mp4`(아이폰 다크모드 화면 기록)에서 ffmpeg 로 뽑은 정지 화면과 GIF 입니다.
`readme-keeper` 에이전트가 이 폴더의 파일명을 보고 README 의 "📱 화면" 섹션에 배치합니다.

| 파일 | 화면 | 원본 시각 |
|---|---|---|
| `home.png` | 홈 (카드 · 칩 행 · 잔디 · 목록) | 0.5s |
| `entry-modal.png` | 입력 시트 (빠른 입력 · 프리셋 칩 · 카테고리) | 14s |
| `records-month.png` | 기록 탭 월 모드 (월 합계 · 일별 막대 · 카테고리) | 19s |
| `records-year.png` | 기록 탭 년 모드 (월별 막대) | 27s |
| `settings.png` | 설정 (목표 · 입력 · 화면 · 효과 · 백업 · 카테고리) | 32.5s |
| `save-effect.gif` | 저장 축하 연출 (컨페티 · 라벨 · 카운트업) | 16.4~18.6s |

다시 뽑는 법 (ffmpeg): `ffmpeg -ss <초> -i docs/video/save_money_app_video.mp4 -frames:v 1 -vf scale=540:-1 docs/img/<이름>.png`
