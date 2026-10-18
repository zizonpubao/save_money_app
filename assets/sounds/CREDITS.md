# 효과음 출처

`assets/sounds/` 의 효과음은 대부분 `scripts/gen-sounds.mjs` 로 합성합니다. 아래 두 파일만 실제 녹음입니다.
금액 칩(+ 모드)과 최근 항목 칩의 동전 소리이고, 설정 탭 "동전 소리" 에서 고릅니다.

| 파일 | 앱 이름 | 원본 | 제작자 | 출처 | 라이선스 |
| --- | --- | --- | --- | --- | --- |
| `coin-classic.wav` | 짤랑 (기본) | "coin" | chieuk | Pixabay | Pixabay Content License |
| `coin-spin.wav` | 빙글 | "spinning coin on table" | universfield | Pixabay | Pixabay Content License |

## 라이선스
- Pixabay Content License 를 따릅니다.
- 상업적 사용이 가능합니다.
- 출처 표기 의무는 없습니다. 기록을 남기려고 적어 둡니다.

## 다듬은 내용
두 파일 모두 원본에서 아래처럼 다듬었습니다.
- 앞 무음 제거
- 길이: `coin-classic` 0.6초, `coin-spin` 0.9초
- 형식: 44.1kHz mono PCM16 WAV
- 피크 -4 dBFS 정규화

합성 스크립트가 만들지 않으므로 `node scripts/gen-sounds.mjs` 를 다시 돌려도 바뀌지 않습니다.
