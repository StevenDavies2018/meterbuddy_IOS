import { Tabs, usePathname } from 'expo-router';

import { AppBottomNav } from '@/components/app-bottom-nav';

type ActiveTab = 'dashboard' | 'account' | 'settings';

export default function TabsLayout() {
  const pathname = usePathname();
  const activeTab: ActiveTab = pathname.includes('/settings')
    ? 'settings'
    : pathname.includes('/account')
      ? 'account'
      : 'dashboard';

  return (
    <Tabs
      tabBar={() => <AppBottomNav active={activeTab} />}
      screenOptions={{
        headerShown: false,
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
