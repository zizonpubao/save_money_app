/**
 * jest 모듈 해석기. reanimated 4.7 공식 jest 설정(resolver: 'react-native-reanimated/jest/resolver')을 따르되,
 * jest-expo 프리셋이 이미 쓰는 React Native 해석기(@react-native/jest-preset)도 그대로 거치도록 둘을 잇는다.
 *
 * 왜 필요한가: reanimated 4.7 의 mock(react-native-reanimated/mock)은 src/index.ts 를 불러오는데,
 * 기본 해석은 initializers.native.ts 를 골라 JSReanimated 에 없는 setCSSEventHandler 를 불러 던진다.
 * reanimated 해석기는 이런 파일만 .native 확장자를 빼고 웹(jest)용 파일로 해석한다. worklets 해석기도 그 안에서 같이 돈다.
 * package.json 의 jest.resolver 하나만 둘 수 있어서 프리셋 해석기를 덮어쓰지 않게 이 파일에서 합친다.
 */
const reactNativeResolver = require('@react-native/jest-preset/jest/resolver.js');
const reanimatedResolver = require('react-native-reanimated/jest/resolver');

module.exports = (request, options) =>
  reanimatedResolver(request, {
    ...options,
    defaultResolver: (req, opts) =>
      reactNativeResolver(req, { ...opts, defaultResolver: options.defaultResolver }),
  });
