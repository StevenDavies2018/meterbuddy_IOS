import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAppFlow } from '@/stores/app-flow';

export default function IndexRedirect() {
  const router = useRouter();
  const { isBootstrapping, hasCompletedOnboarding, hasCompletedFirstScanPrompt, isAuthenticated } = useAppFlow();

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!hasCompletedOnboarding) {
      router.replace('/onboarding' as never);
      return;
    }

    if (isAuthenticated && !hasCompletedFirstScanPrompt) {
      router.replace('/first-scan' as never);
      return;
    }

    router.replace('/(tabs)' as never);
  }, [hasCompletedFirstScanPrompt, hasCompletedOnboarding, isAuthenticated, isBootstrapping, router]);

  return null;
}
