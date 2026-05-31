import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 14);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1756D1',
        tabBarInactiveTintColor: '#7C859D',
        tabBarIcon: () => null,
        tabBarStyle: {
          height: 64 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          paddingHorizontal: 8,
          borderTopWidth: 1,
          borderTopColor: '#E3E8F4',
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
