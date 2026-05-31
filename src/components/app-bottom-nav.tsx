import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset } from '@/constants/theme';

type AppBottomNavProps = {
  active: 'dashboard' | 'account' | 'settings';
};

const navItems: Array<{
  key: AppBottomNavProps['active'];
  label: string;
  href: string;
  badge: string;
}> = [
  { key: 'dashboard', label: 'Dashboard', href: '/(tabs)', badge: 'D' },
  { key: 'account', label: 'Account', href: '/(tabs)/account', badge: 'A' },
  { key: 'settings', label: 'Settings', href: '/(tabs)/settings', badge: 'S' },
];

export function AppBottomNav({ active }: AppBottomNavProps) {
  const router = useRouter();

  return (
    <View style={styles.shell}>
      {navItems.map((item) => {
        const selected = item.key === active;

        return (
          <Pressable
            key={item.key}
            onPress={() => router.replace(item.href as never)}
            style={styles.itemPressable}>
            {({ pressed }) => (
              <View style={[styles.item, selected && styles.itemSelected, pressed && styles.pressed]}>
                <View style={[styles.badge, selected && styles.badgeSelected]}>
                  <ThemedText style={[styles.badgeLabel, selected && styles.badgeLabelSelected]}>{item.badge}</ThemedText>
                </View>
                <ThemedText style={[styles.label, selected && styles.labelSelected]}>{item.label}</ThemedText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: BottomTabInset + 10,
    borderTopWidth: 1,
    borderTopColor: '#E3E8F4',
    backgroundColor: '#FFFFFF',
  },
  itemPressable: {
    flex: 1,
  },
  item: {
    minHeight: 74,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
    paddingHorizontal: 10,
    gap: 6,
  },
  itemSelected: {
    backgroundColor: '#DDE8FF',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4EAF6',
  },
  badgeSelected: {
    backgroundColor: '#1756D1',
  },
  badgeLabel: {
    color: '#5F6A85',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '800',
  },
  badgeLabelSelected: {
    color: '#FFFFFF',
  },
  label: {
    color: '#7C859D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  labelSelected: {
    color: '#1756D1',
  },
  pressed: {
    opacity: 0.82,
  },
});
