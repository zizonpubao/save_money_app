// 효과음 파일 import 타입. Metro 가 에셋 id(number)로 바꿔 준다 (expo-audio 의 AudioSource 가 number 를 받는다)
declare module '*.wav' {
  const assetId: number;
  export default assetId;
}
