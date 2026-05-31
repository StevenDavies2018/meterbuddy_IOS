import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  return <ThemedView style={styles.screen}>{children}</ThemedView>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
