import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * 활성 탭은 채운 아이콘, 나머지는 같은 모양의 외곽선 아이콘. 색(primary)만이 아니라 모양으로도 지금 탭을 알린다.
 * 세 아이콘 모두 Ionicons 한 세트(filled / -outline)라 선 굵기가 같다.
 */
function tabIcon(name: IconName, outline: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? name : outline} color={color} size={size} />;
  };
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // 탭바 윗선은 카드 안 구분선과 같은 divider (헤더는 선 없이 card 바탕만)
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.divider },
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: '홈', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="monthly"
        options={{ title: '기록', tabBarIcon: tabIcon('bar-chart', 'bar-chart-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: tabIcon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}
