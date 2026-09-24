import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * (M4) iOS "동작 줄이기" 설정. 켜져 있으면 저장 연출의 파티클·플래시·라벨·글로우·튐을 생략하고
 * 햅틱·소리·카운트업만 낸다 (DESIGN 저장 축하 연출).
 * 조회가 비동기라 처음엔 false 로 시작한다. 홈을 연 뒤 저장까지는 충분히 시간이 있어 첫 저장 전에 값이 온다.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (alive) setReduceMotion(enabled);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
